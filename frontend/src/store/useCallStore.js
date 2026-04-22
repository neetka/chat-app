import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

// Fallback STUN-only config (works on local network, not across NATs)
const FALLBACK_ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Fetch TURN/ICE credentials from the backend so they aren't
// hardcoded in the frontend bundle
const fetchIceServers = async () => {
  try {
    const res = await axiosInstance.get("/call/ice-servers");
    return { iceServers: res.data.iceServers };
  } catch (err) {
    console.warn("Failed to fetch ICE servers, using STUN-only fallback:", err);
    return FALLBACK_ICE_SERVERS;
  }
};

const CONNECTION_TIMEOUT_MS = 20000; // 20 seconds to establish connection

const createRemoteStreamHandler = (set) => {
  const remoteStream = new MediaStream();

  return {
    remoteStream,
    handleTrack: (event) => {
      console.log("Received remote track:", event.track.kind);
      
      // Add the individual track to our remoteStream
      const alreadyExists = remoteStream
        .getTracks()
        .some((t) => t.id === event.track.id);

      if (!alreadyExists) {
        remoteStream.addTrack(event.track);
      }

      // Force a re-render by creating a new MediaStream reference
      // This is the most reliable way to tell React/Browser that new tracks arrived.
      set({ remoteStream: new MediaStream(remoteStream.getTracks()) });
    },
  };
};

export const useCallStore = create((set, get) => ({
  // ── State ─────────────────────────────────────────────────
  callStatus: "idle", // idle | calling | ringing | connecting | connected
  callType: null, // voice | video
  remoteUser: null, // { _id, fullName, profilePic }
  isCaller: false,

  localStream: null,
  remoteStream: null,
  peerConnection: null,

  isMuted: false,
  isVideoOff: false,

  callDuration: 0,
  _durationInterval: null,
  _pendingCandidates: [],
  _incomingOffer: null,
  _connectionTimeout: null,

  // ── Internal: start the call timer ────────────────────────
  _startCallTimer: () => {
    const { _durationInterval } = get();

    if (_durationInterval) {
      clearInterval(_durationInterval);
    }

    const interval = setInterval(() => {
      set((state) => ({ callDuration: state.callDuration + 1 }));
    }, 1000);

    set({ _durationInterval: interval });
  },

  // ── Internal: create a peer connection ────────────────────
  _createPeerConnection: async (socket, otherUserId) => {
    const iceConfig = await fetchIceServers();
    const pc = new RTCPeerConnection(iceConfig);

    const { remoteStream, handleTrack } = createRemoteStreamHandler(set);

    pc.ontrack = handleTrack;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to:", otherUserId);
        socket.emit("call:ice-candidate", {
          to: otherUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("Peer connection state:", state);

      if (state === "connected") {
        const { callStatus, _connectionTimeout } = get();
        // Clear the connection timeout since we've connected successfully
        if (_connectionTimeout) {
          clearTimeout(_connectionTimeout);
          set({ _connectionTimeout: null });
        }
        if (callStatus !== "connected") {
          set({ callStatus: "connected" });
          get()._startCallTimer();
        }
      }

      if (
        state === "disconnected" ||
        state === "failed" ||
        state === "closed"
      ) {
        get()._cleanup();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
    };

    return { pc, remoteStream };
  },

  // ── Initiate a call (caller side) ─────────────────────────
  initiateCall: async (user, callType, socket) => {
    if (!socket) {
      toast.error("Not connected to server");
      return;
    }

    try {
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const localStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      const { pc, remoteStream } = await get()._createPeerConnection(
        socket,
        user._id
      );

      localStream.getTracks().forEach((track) => {
        track.enabled = true; // Explicitly enable
        pc.addTrack(track, localStream);
      });

      set({
        callStatus: "calling",
        callType,
        remoteUser: user,
        isCaller: true,
        localStream,
        remoteStream,
        peerConnection: pc,
        isMuted: false,
        isVideoOff: false,
        callDuration: 0,
        _pendingCandidates: [],
        _incomingOffer: null,
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call:initiate", {
        to: user._id,
        offer,
        callType,
      });
    } catch (error) {
      console.error("Error initiating call:", error);

      if (error.name === "NotAllowedError") {
        toast.error("Camera/microphone permission denied");
      } else if (error.name === "NotFoundError") {
        toast.error("Camera/microphone not found");
      } else {
        toast.error("Failed to start call");
      }

      get()._cleanup();
    }
  },

  // ── Accept incoming call (receiver side) ──────────────────
  acceptCall: async (socket) => {
    const { _incomingOffer, remoteUser, callType } = get();

    if (!socket || !_incomingOffer || !remoteUser?._id) return;

    // Immediately show "Connecting..." while we set up WebRTC
    set({ callStatus: "connecting" });

    try {
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const localStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      const { pc, remoteStream } = await get()._createPeerConnection(
        socket,
        remoteUser._id
      );

      localStream.getTracks().forEach((track) => {
        track.enabled = true; // Explicitly enable
        pc.addTrack(track, localStream);
      });

      set({
        localStream,
        remoteStream,
        peerConnection: pc,
        isMuted: false,
        isVideoOff: false,
        callDuration: 0,
      });

      await pc.setRemoteDescription(
        new RTCSessionDescription(_incomingOffer)
      );

      const { _pendingCandidates } = get();
      for (const candidate of _pendingCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Failed to add buffered ICE candidate:", e);
        }
      }

      set({ _pendingCandidates: [] });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call:accept", {
        to: remoteUser._id,
        answer,
      });

      // Don't set "connected" here.
      // pc.onconnectionstatechange will transition to "connected"
      // once the peer connection is actually established.
      set({ _incomingOffer: null });

      // Start a timeout — if the connection isn't established in time, clean up
      const timeout = setTimeout(() => {
        const { callStatus } = get();
        if (callStatus === "connecting") {
          console.warn("Connection timed out after", CONNECTION_TIMEOUT_MS, "ms");
          toast.error("Connection timed out. Please try again.");
          get()._cleanup();
        }
      }, CONNECTION_TIMEOUT_MS);
      set({ _connectionTimeout: timeout });
    } catch (error) {
      console.error("Error accepting call:", error);

      if (error.name === "NotAllowedError") {
        toast.error("Camera/microphone permission denied");
      } else {
        toast.error("Failed to accept call");
      }

      get().rejectCall(socket);
    }
  },

  // ── Reject incoming call ──────────────────────────────────
  rejectCall: (socket) => {
    const { remoteUser } = get();

    if (socket && remoteUser?._id) {
      socket.emit("call:reject", { to: remoteUser._id });
    }

    get()._cleanup();
  },

  // ── End ongoing call ──────────────────────────────────────
  endCall: (socket) => {
    const { remoteUser } = get();

    if (socket && remoteUser?._id) {
      socket.emit("call:end", { to: remoteUser._id });
    }

    get()._cleanup();
  },

  // ── Toggle mute ───────────────────────────────────────────
  toggleMute: () => {
    const { localStream, isMuted } = get();

    if (!localStream) return;

    localStream.getAudioTracks().forEach((track) => {
      track.enabled = isMuted;
    });

    set({ isMuted: !isMuted });
  },

  // ── Toggle video ──────────────────────────────────────────
  toggleVideo: () => {
    const { localStream, isVideoOff } = get();

    if (!localStream) return;

    localStream.getVideoTracks().forEach((track) => {
      track.enabled = isVideoOff;
    });

    set({ isVideoOff: !isVideoOff });
  },

  // ── Socket event listeners ────────────────────────────────
  setupCallListeners: (socket, getUsers) => {
    if (!socket) return;

    // Clean up any existing listeners first
    socket.off("call:incoming");
    socket.off("call:accepted");
    socket.off("call:rejected");
    socket.off("call:ended");
    socket.off("call:ice-candidate");
    socket.off("call:user-offline");

    // Incoming call (receiver side)
    socket.on(
      "call:incoming",
      ({ from, callerName, callerPic, offer, callType }) => {
        const { callStatus } = get();

        // If already in a call, auto-reject
        if (callStatus !== "idle") {
          socket.emit("call:reject", { to: from });
          return;
        }

        // Build caller info from data sent by the backend
        let callerData = {
          _id: from,
          fullName: callerName || "User",
          profilePic: callerPic || "",
        };

        // Optionally enrich from local user list (e.g. if backend didn't send info)
        if ((!callerName || callerName === "User") && getUsers) {
          const users = getUsers();
          const foundUser = users.find((u) => u._id === from);
          if (foundUser) {
            callerData = foundUser;
          }
        }

        set({
          callStatus: "ringing",
          callType,
          remoteUser: callerData,
          isCaller: false,
          _incomingOffer: offer,
          _pendingCandidates: [],
          callDuration: 0,
        });
      }
    );

    // Call accepted (caller side receives this)
    socket.on("call:accepted", async ({ answer }) => {
      const { peerConnection, _pendingCandidates } = get();

      if (!peerConnection) return;

      // Immediately transition from "calling" → "connecting" so the
      // caller sees that the other party picked up
      set({ callStatus: "connecting" });

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        for (const candidate of _pendingCandidates) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          } catch (e) {
            console.warn("Failed to add buffered ICE candidate:", e);
          }
        }

        set({ _pendingCandidates: [] });

        // Start a timeout — if peer connection doesn't reach "connected"
        // within the limit, clean up gracefully
        const timeout = setTimeout(() => {
          const { callStatus } = get();
          if (callStatus === "connecting") {
            console.warn("Connection timed out after", CONNECTION_TIMEOUT_MS, "ms");
            toast.error("Connection timed out. Please try again.");
            get()._cleanup();
          }
        }, CONNECTION_TIMEOUT_MS);
        set({ _connectionTimeout: timeout });

        // Don't manually force "connected" here.
        // onconnectionstatechange will handle it.
      } catch (error) {
        console.error("Error handling accepted call:", error);
        get()._cleanup();
      }
    });

    // Call rejected
    socket.on("call:rejected", () => {
      toast("Call was declined", { icon: "📵" });
      get()._cleanup();
    });

    // Call ended by the other party
    socket.on("call:ended", () => {
      toast("Call ended", { icon: "📞" });
      get()._cleanup();
    });

    // ICE candidates from the other party
    socket.on("call:ice-candidate", async ({ candidate }) => {
      const { peerConnection } = get();

      if (!peerConnection) {
        set((state) => ({
          _pendingCandidates: [...state._pendingCandidates, candidate],
        }));
        return;
      }

      const remoteDescriptionSet =
        peerConnection.remoteDescription &&
        peerConnection.remoteDescription.type;

      if (!remoteDescriptionSet) {
        set((state) => ({
          _pendingCandidates: [...state._pendingCandidates, candidate],
        }));
        return;
      }

      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn("Error adding ICE candidate:", error);
      }
    });

    // User is offline
    socket.on("call:user-offline", () => {
      toast.error("User is offline");
      get()._cleanup();
    });
  },

  // ── Remove socket listeners ───────────────────────────────
  cleanupCallListeners: (socket) => {
    if (!socket) return;

    socket.off("call:incoming");
    socket.off("call:accepted");
    socket.off("call:rejected");
    socket.off("call:ended");
    socket.off("call:ice-candidate");
    socket.off("call:user-offline");
  },

  // ── Internal cleanup ──────────────────────────────────────
  _cleanup: () => {
    const {
      localStream,
      remoteStream,
      peerConnection,
      _durationInterval,
      _connectionTimeout,
    } = get();

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }

    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.onicecandidate = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.oniceconnectionstatechange = null;
      peerConnection.close();
    }

    if (_durationInterval) {
      clearInterval(_durationInterval);
    }

    if (_connectionTimeout) {
      clearTimeout(_connectionTimeout);
    }

    set({
      callStatus: "idle",
      callType: null,
      remoteUser: null,
      isCaller: false,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isMuted: false,
      isVideoOff: false,
      callDuration: 0,
      _durationInterval: null,
      _pendingCandidates: [],
      _incomingOffer: null,
      _connectionTimeout: null,
    });
  },
}));