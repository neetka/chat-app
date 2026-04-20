import { create } from "zustand";
import toast from "react-hot-toast";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useCallStore = create((set, get) => ({
  // ── State ─────────────────────────────────────────────────
  callStatus: "idle", // idle | calling | ringing | connected
  callType: null, // voice | video
  activeRoomId: null, // Room ID for the mesh network
  participants: [], // Array of users in the call or being called
  isCaller: false, // True if we initiated the call

  localStream: null,
  peerConnections: {}, // { [userId]: RTCPeerConnection }
  remoteStreams: {}, // { [userId]: MediaStream }

  isMuted: false,
  isVideoOff: false,

  callDuration: 0,
  _durationInterval: null,
  _pendingCandidates: {}, // { [userId]: [RTCIceCandidate...] }

  // ── Helpers ───────────────────────────────────────────────
  _startCallTimer: () => {
    const { _durationInterval } = get();
    if (_durationInterval) clearInterval(_durationInterval);
    const interval = setInterval(() => {
      set((state) => ({ callDuration: state.callDuration + 1 }));
    }, 1000);
    set({ _durationInterval: interval });
  },

  _cleanup: (resetStateToIdle = true) => {
    const { localStream, peerConnections, _durationInterval } = get();

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    Object.values(peerConnections).forEach((pc) => pc.close());

    if (_durationInterval) {
      clearInterval(_durationInterval);
    }

    if (resetStateToIdle) {
      set({
        callStatus: "idle",
        callType: null,
        activeRoomId: null,
        participants: [],
        isCaller: false,
        localStream: null,
        peerConnections: {},
        remoteStreams: {},
        isMuted: false,
        isVideoOff: false,
        callDuration: 0,
        _durationInterval: null,
        _pendingCandidates: {},
      });
    }
  },

  // Create an RTCPeerConnection for a specific remote user
  _createPeerConnection: (socket, remoteUserId, roomId) => {
    const { localStream, peerConnections, remoteStreams, _pendingCandidates } = get();

    if (peerConnections[remoteUserId]) {
        console.warn(`PeerConnection already exists for ${remoteUserId}`);
        return peerConnections[remoteUserId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const remoteMediaStream = new MediaStream();

    // Attach local stream tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        if (!remoteMediaStream.getTracks().some((t) => t.id === track.id)) {
          remoteMediaStream.addTrack(track);
        }
      });
      console.log(`Received track from ${remoteUserId}`);
      set((state) => ({
        remoteStreams: { ...state.remoteStreams, [remoteUserId]: remoteMediaStream },
      }));
    };

    // Send Trickle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call:ice-candidate", {
          to: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    // Monitor Connection State
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteUserId}: ${pc.connectionState}`);
      
      if (pc.connectionState === "connected") {
        const { callStatus } = get();
        if (callStatus !== "connected") {
          set({ callStatus: "connected" });
          get()._startCallTimer();
        }
      }

      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        console.log(`Disconnected from ${remoteUserId}`);
        // Remove their specific PC and Stream
        const { peerConnections, remoteStreams } = get();
        const newPCs = { ...peerConnections };
        const newStreams = { ...remoteStreams };
        delete newPCs[remoteUserId];
        delete newStreams[remoteUserId];
        
        set({
            peerConnections: newPCs,
            remoteStreams: newStreams
        });

        // If everyone left and I'm not ringing, maybe end call? Let backend events handle total drop.
      }
    };

    // Store the newly created PC
    set((state) => ({
      peerConnections: { ...state.peerConnections, [remoteUserId]: pc },
      remoteStreams: { ...state.remoteStreams, [remoteUserId]: remoteMediaStream },
    }));

    return pc;
  },

  // ── Actions ───────────────────────────────────────────────

  initiateCall: async (targets, callType, socket) => {
    if (!socket) {
      toast.error("Not connected to server");
      return;
    }

    try {
      const constraints = { audio: true, video: callType === "video" };
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Generate a unique room ID for this call cluster
      const roomId = crypto.randomUUID(); 

      set({
        callStatus: "calling",
        callType,
        activeRoomId: roomId,
        participants: targets,
        isCaller: true,
        localStream,
        peerConnections: {},
        remoteStreams: {},
        isMuted: false,
        isVideoOff: false,
        callDuration: 0,
      });

      // Ping all targets
      socket.emit("call:ring", {
        toUsers: targets.map((t) => t._id || t),
        callType,
        roomId,
        // The UI might need to know who is calling
      });

    } catch (error) {
      console.error("Error initiating call:", error);
      if (error.name === "NotAllowedError") toast.error("Camera/microphone permission denied");
      else toast.error("Failed to start call");
      get()._cleanup();
    }
  },

  acceptCall: async (socket) => {
    const { activeRoomId, callType } = get();
    if (!socket || !activeRoomId) return;

    try {
      const constraints = { audio: true, video: callType === "video" };
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);

      set({
        callStatus: "calling", // transition visual before pure connected
        localStream,
        peerConnections: {},
        remoteStreams: {},
        isMuted: false,
        isVideoOff: false,
        callDuration: 0,
      });

      // Join the mesh room
      socket.emit("call:join", { roomId: activeRoomId });

    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Failed to accept call");
      get().rejectCall(socket);
    }
  },

  rejectCall: (socket) => {
    const { activeRoomId, participants } = get();
    if (socket && activeRoomId) {
       // We reject everyone we were ringing
       participants.forEach(p => {
           socket.emit("call:reject", { toUser: p._id || p, roomId: activeRoomId });
       });
    }
    get()._cleanup();
  },

  endCall: (socket) => {
    const { activeRoomId } = get();
    if (socket && activeRoomId) {
      socket.emit("call:leave", { roomId: activeRoomId });
    }
    get()._cleanup();
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = isMuted;
    });
    set({ isMuted: !isMuted });
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = isVideoOff;
    });
    set({ isVideoOff: !isVideoOff });
  },

  // ── Socket Events ───────────────────────────────────────────
  setupCallListeners: (socket, getUsers) => {
    if (!socket) return;
    
    // Clear old listeners
    socket.off("call:incoming");
    socket.off("call:user-joined");
    socket.off("call:offer");
    socket.off("call:answer");
    socket.off("call:ice-candidate");
    socket.off("call:rejected");
    socket.off("call:user-left");

    // A peer is calling us
    socket.on("call:incoming", ({ fromUser, roomId, callType, participants }) => {
      const { callStatus } = get();
      if (callStatus !== "idle") {
        // Auto reject if already busy
        socket.emit("call:reject", { toUser: fromUser._id, roomId });
        return;
      }
      
      // Attempt to resolve participant identities
      let fullParticipants = participants.map(id => ({ _id: id }));
      if (getUsers) {
          const allUsers = getUsers();
          fullParticipants = participants.map(id => allUsers.find(u => u._id === id) || { _id: id });
          // Ensure caller is at the front for display purposes
          if(!fullParticipants.some(p => p._id === fromUser._id)) fullParticipants.push(fromUser);
      }

      set({
        callStatus: "ringing",
        callType,
        activeRoomId: roomId,
        participants: fullParticipants,
        isCaller: false,
        callDuration: 0,
      });
    });

    // Someone joined the room we are in! (If I am in the room, I act as the initiator for this specific link)
    socket.on("call:user-joined", async ({ userId }) => {
        const { activeRoomId } = get();
        console.log(`User ${userId} joined room ${activeRoomId}. Creating Offer...`);
        try {
            const pc = get()._createPeerConnection(socket, userId, activeRoomId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("call:offer", { to: userId, offer, roomId: activeRoomId });
        } catch (e) {
            console.error("Error creating offer for new user:", e);
        }
    });

    // Someone sent us an offer
    socket.on("call:offer", async ({ from, offer, roomId }) => {
        console.log(`Received Offer from ${from}`);
        try {
            const pc = get()._createPeerConnection(socket, from, roomId);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Apply any candidates buffered before description was set
            const pending = get()._pendingCandidates[from] || [];
            for (const candidate of pending) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            set(state => {
                const newPending = { ...state._pendingCandidates };
                newPending[from] = [];
                return { _pendingCandidates: newPending };
            });

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("call:answer", { to: from, answer, roomId });
        } catch (e) {
            console.error("Error handling incoming offer:", e);
        }
    });

    // Someone sent us an answer to our offer
    socket.on("call:answer", async ({ from, answer }) => {
        console.log(`Received Answer from ${from}`);
        try {
            const pc = get().peerConnections[from];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                const pending = get()._pendingCandidates[from] || [];
                for (const candidate of pending) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                set(state => {
                    const newPending = { ...state._pendingCandidates };
                    newPending[from] = [];
                    return { _pendingCandidates: newPending };
                });
            }
        } catch (e) {
            console.error("Error setting remote description from answer:", e);
        }
    });

    socket.on("call:ice-candidate", async ({ from, candidate }) => {
       const pc = get().peerConnections[from];
       if (!pc || !pc.remoteDescription) {
           set(state => ({
               _pendingCandidates: {
                   ...state._pendingCandidates,
                   [from]: [...(state._pendingCandidates[from] || []), candidate]
               }
           }));
           return;
       }
       try {
           await pc.addIceCandidate(new RTCIceCandidate(candidate));
       } catch (e) {
           console.warn("Failed to add ICE candidate:", e);
       }
    });

    // A recipient rejected the ping
    socket.on("call:rejected", ({ from }) => {
        toast(`User declined call`, { icon: "📵" });
        // Optionally end completely if it was a 1-on-1
        const { participants } = get();
        if (participants.length <= 1) {
            get()._cleanup();
        }
    });

    // A user left the mesh
    socket.on("call:user-left", ({ userId }) => {
        toast(`User left call`, { icon: "👋" });
        const { peerConnections, remoteStreams } = get();
        pc = peerConnections[userId];
        if (pc) pc.close();
        
        const newPCs = { ...peerConnections };
        const newStreams = { ...remoteStreams };
        delete newPCs[userId];
        delete newStreams[userId];
        
        set({ peerConnections: newPCs, remoteStreams: newStreams });
        
        // If object is empty, maybe end call?
        if (Object.keys(newPCs).length === 0) {
            get()._cleanup();
        }
    });
  },

  cleanupCallListeners: (socket) => {
    if (!socket) return;
    socket.off("call:incoming");
    socket.off("call:user-joined");
    socket.off("call:offer");
    socket.off("call:answer");
    socket.off("call:ice-candidate");
    socket.off("call:rejected");
    socket.off("call:user-left");
  },
}));