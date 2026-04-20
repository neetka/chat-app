// import { create } from "zustand";
// import toast from "react-hot-toast";

// const ICE_SERVERS = {
//   iceServers: [
//     { urls: "stun:stun.l.google.com:19302" },
//     { urls: "stun:stun1.l.google.com:19302" },
//   ],
// };

// export const useCallStore = create((set, get) => ({
//   // ── State ─────────────────────────────────────────────────
//   callStatus: "idle", // idle | calling | ringing | connected | ended
//   callType: null, // "voice" | "video"
//   remoteUser: null, // user object of the other party
//   isCaller: false,
//   localStream: null,
//   remoteStream: null,
//   peerConnection: null,
//   isMuted: false,
//   isVideoOff: false,
//   callDuration: 0,
//   _durationInterval: null,
//   _pendingCandidates: [], // ICE candidates received before remote description is set
//   _incomingOffer: null, // stored SDP offer from incoming call

//   // ── Initiate a call (caller side) ─────────────────────────
//   initiateCall: async (user, callType, socket) => {
//     if (!socket) {
//       toast.error("Not connected to server");
//       return;
//     }

//     try {
//       // Request media
//       const constraints = {
//         audio: true,
//         video: callType === "video",
//       };
//       const localStream = await navigator.mediaDevices.getUserMedia(constraints);

//       // Create peer connection
//       const pc = new RTCPeerConnection(ICE_SERVERS);

//       // Add local tracks to peer connection
//       localStream.getTracks().forEach((track) => {
//         pc.addTrack(track, localStream);
//       });

//       // Handle remote tracks
//       const remoteStream = new MediaStream();
//       pc.ontrack = (event) => {
//         event.streams[0].getTracks().forEach((track) => {
//           remoteStream.addTrack(track);
//         });
//         set({ remoteStream });
//       };

//       // Handle ICE candidates
//       pc.onicecandidate = (event) => {
//         if (event.candidate) {
//           socket.emit("call:ice-candidate", {
//             to: user._id,
//             candidate: event.candidate,
//           });
//         }
//       };

//       // Monitor connection state
//       pc.onconnectionstatechange = () => {
//         if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
//           get().endCall(socket);
//         }
//       };

//       // Create and send offer
//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);

//       socket.emit("call:initiate", {
//         to: user._id,
//         offer,
//         callType,
//       });

//       set({
//         callStatus: "calling",
//         callType,
//         remoteUser: user,
//         isCaller: true,
//         localStream,
//         remoteStream,
//         peerConnection: pc,
//         isMuted: false,
//         isVideoOff: false,
//         callDuration: 0,
//       });
//     } catch (error) {
//       console.error("Error initiating call:", error);
//       if (error.name === "NotAllowedError") {
//         toast.error("Camera/microphone permission denied");
//       } else if (error.name === "NotFoundError") {
//         toast.error("Camera/microphone not found");
//       } else {
//         toast.error("Failed to start call");
//       }
//       get()._cleanup();
//     }
//   },

//   // ── Accept incoming call (receiver side) ──────────────────
//   acceptCall: async (socket) => {
//     const { _incomingOffer, remoteUser, callType } = get();
//     if (!socket || !_incomingOffer || !remoteUser) return;

//     try {
//       const constraints = {
//         audio: true,
//         video: callType === "video",
//       };
//       const localStream = await navigator.mediaDevices.getUserMedia(constraints);

//       const pc = new RTCPeerConnection(ICE_SERVERS);

//       localStream.getTracks().forEach((track) => {
//         pc.addTrack(track, localStream);
//       });

//       const remoteStream = new MediaStream();
//       pc.ontrack = (event) => {
//         event.streams[0].getTracks().forEach((track) => {
//           remoteStream.addTrack(track);
//         });
//         set({ remoteStream });
//       };

//       pc.onicecandidate = (event) => {
//         if (event.candidate) {
//           socket.emit("call:ice-candidate", {
//             to: remoteUser._id,
//             candidate: event.candidate,
//           });
//         }
//       };

//       pc.onconnectionstatechange = () => {
//         if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
//           get().endCall(socket);
//         }
//       };

//       // Set remote description (the offer)
//       await pc.setRemoteDescription(new RTCSessionDescription(_incomingOffer));

//       // Process any ICE candidates that arrived before remote description was set
//       const { _pendingCandidates } = get();
//       for (const candidate of _pendingCandidates) {
//         try {
//           await pc.addIceCandidate(new RTCIceCandidate(candidate));
//         } catch (e) {
//           console.warn("Failed to add buffered ICE candidate:", e);
//         }
//       }

//       // Create and send answer
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);

//       socket.emit("call:accept", {
//         to: remoteUser._id,
//         answer,
//       });

//       // Start duration timer
//       const interval = setInterval(() => {
//         set((state) => ({ callDuration: state.callDuration + 1 }));
//       }, 1000);

//       set({
//         callStatus: "connected",
//         localStream,
//         remoteStream,
//         peerConnection: pc,
//         isMuted: false,
//         isVideoOff: false,
//         callDuration: 0,
//         _durationInterval: interval,
//         _pendingCandidates: [],
//         _incomingOffer: null,
//       });
//     } catch (error) {
//       console.error("Error accepting call:", error);
//       if (error.name === "NotAllowedError") {
//         toast.error("Camera/microphone permission denied");
//       } else {
//         toast.error("Failed to accept call");
//       }
//       get().rejectCall(socket);
//     }
//   },

//   // ── Reject incoming call ──────────────────────────────────
//   rejectCall: (socket) => {
//     const { remoteUser } = get();
//     if (socket && remoteUser) {
//       socket.emit("call:reject", { to: remoteUser._id });
//     }
//     get()._cleanup();
//   },

//   // ── End ongoing call ──────────────────────────────────────
//   endCall: (socket) => {
//     const { remoteUser } = get();
//     if (socket && remoteUser) {
//       socket.emit("call:end", { to: remoteUser._id });
//     }
//     get()._cleanup();
//   },

//   // ── Toggle mute ───────────────────────────────────────────
//   toggleMute: () => {
//     const { localStream, isMuted } = get();
//     if (localStream) {
//       localStream.getAudioTracks().forEach((track) => {
//         track.enabled = isMuted; // toggle: if muted, enable; if not, disable
//       });
//       set({ isMuted: !isMuted });
//     }
//   },

//   // ── Toggle video ──────────────────────────────────────────
//   toggleVideo: () => {
//     const { localStream, isVideoOff } = get();
//     if (localStream) {
//       localStream.getVideoTracks().forEach((track) => {
//         track.enabled = isVideoOff;
//       });
//       set({ isVideoOff: !isVideoOff });
//     }
//   },

//   // ── Socket event listeners ────────────────────────────────
//   setupCallListeners: (socket, getUsers) => {
//     if (!socket) return;

//     // Incoming call
//     socket.on("call:incoming", ({ from, offer, callType }) => {
//       const { callStatus } = get();

//       // If already in a call, auto-reject
//       if (callStatus !== "idle") {
//         socket.emit("call:reject", { to: from });
//         return;
//       }

//       // We need user info for the caller. Try to find from the users list.
//       // The `from` is a userId string. We'll store it and resolve later.
//       set({
//         callStatus: "ringing",
//         callType,
//         remoteUser: { _id: from }, // minimal object; ChatHeader/UI will enrich
//         isCaller: false,
//         _incomingOffer: offer,
//         _pendingCandidates: [],
//       });

//       // Try to enrich remote user info
//       if (getUsers) {
//         const users = getUsers();
//         const caller = users.find((u) => u._id === from);
//         if (caller) {
//           set({ remoteUser: caller });
//         }
//       }
//     });

//     // Call accepted by receiver
//     socket.on("call:accepted", async ({ from, answer }) => {
//       const { peerConnection } = get();
//       if (!peerConnection) return;

//       try {
//         await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

//         // Process buffered ICE candidates
//         const { _pendingCandidates } = get();
//         for (const candidate of _pendingCandidates) {
//           try {
//             await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
//           } catch (e) {
//             console.warn("Failed to add buffered ICE candidate:", e);
//           }
//         }
//         set({ _pendingCandidates: [] });

//         // Start duration timer
//         const interval = setInterval(() => {
//           set((state) => ({ callDuration: state.callDuration + 1 }));
//         }, 1000);

//         set({
//           callStatus: "connected",
//           _durationInterval: interval,
//         });
//       } catch (error) {
//         console.error("Error handling call accepted:", error);
//         get().endCall(socket);
//       }
//     });

//     // Call rejected
//     socket.on("call:rejected", () => {
//       toast("Call was declined", { icon: "📵" });
//       get()._cleanup();
//     });

//     // Call ended by other party
//     socket.on("call:ended", () => {
//       toast("Call ended", { icon: "📞" });
//       get()._cleanup();
//     });

//     // ICE candidate from other party
//     socket.on("call:ice-candidate", async ({ from, candidate }) => {
//       const { peerConnection } = get();

//       if (!peerConnection || !peerConnection.remoteDescription) {
//         // Buffer the candidate until remote description is set
//         set((state) => ({
//           _pendingCandidates: [...state._pendingCandidates, candidate],
//         }));
//         return;
//       }

//       try {
//         await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
//       } catch (error) {
//         console.warn("Error adding ICE candidate:", error);
//       }
//     });

//     // User is offline
//     socket.on("call:user-offline", () => {
//       toast.error("User is offline");
//       get()._cleanup();
//     });
//   },

//   cleanupCallListeners: (socket) => {
//     if (!socket) return;
//     socket.off("call:incoming");
//     socket.off("call:accepted");
//     socket.off("call:rejected");
//     socket.off("call:ended");
//     socket.off("call:ice-candidate");
//     socket.off("call:user-offline");
//   },

//   // ── Internal cleanup ──────────────────────────────────────
//   _cleanup: () => {
//     const { localStream, peerConnection, _durationInterval } = get();

//     // Stop all media tracks
//     if (localStream) {
//       localStream.getTracks().forEach((track) => track.stop());
//     }

//     // Close peer connection
//     if (peerConnection) {
//       peerConnection.close();
//     }

//     // Clear duration timer
//     if (_durationInterval) {
//       clearInterval(_durationInterval);
//     }

//     set({
//       callStatus: "idle",
//       callType: null,
//       remoteUser: null,
//       isCaller: false,
//       localStream: null,
//       remoteStream: null,
//       peerConnection: null,
//       isMuted: false,
//       isVideoOff: false,
//       callDuration: 0,
//       _durationInterval: null,
//       _pendingCandidates: [],
//       _incomingOffer: null,
//     });
//   },
// }));
import { create } from "zustand";
import toast from "react-hot-toast";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const createRemoteStreamHandler = (set) => {
  const remoteStream = new MediaStream();

  return {
    remoteStream,
    handleTrack: (event) => {
      event.streams[0].getTracks().forEach((track) => {
        const alreadyExists = remoteStream
          .getTracks()
          .some((t) => t.id === track.id);

        if (!alreadyExists) {
          remoteStream.addTrack(track);
        }
      });

      set({ remoteStream });
    },
  };
};

export const useCallStore = create((set, get) => ({
  callStatus: "idle", // idle | calling | ringing | connected
  callType: null, // voice | video
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

  _createPeerConnection: (socket, otherUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    const { remoteStream, handleTrack } = createRemoteStreamHandler(set);

    pc.ontrack = handleTrack;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
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
        const { callStatus } = get();
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
        get()._cleanup(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
    };

    return { pc, remoteStream };
  },

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

      const { pc, remoteStream } = get()._createPeerConnection(socket, user._id);

      localStream.getTracks().forEach((track) => {
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

      get()._cleanup(false);
    }
  },

  acceptCall: async (socket) => {
    const { _incomingOffer, remoteUser, callType } = get();

    if (!socket || !_incomingOffer || !remoteUser?._id) return;

    try {
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const localStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      const { pc, remoteStream } = get()._createPeerConnection(
        socket,
        remoteUser._id
      );

      localStream.getTracks().forEach((track) => {
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

      // Important:
      // Don't set `connected` here forcefully.
      // Let `pc.onconnectionstatechange` handle it when connection is actually ready.
      set({
        callStatus: "calling",
        _incomingOffer: null,
      });
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

  rejectCall: (socket) => {
    const { remoteUser } = get();

    if (socket && remoteUser?._id) {
      socket.emit("call:reject", { to: remoteUser._id });
    }

    get()._cleanup(false);
  },

  endCall: (socket) => {
    const { remoteUser } = get();

    if (socket && remoteUser?._id) {
      socket.emit("call:end", { to: remoteUser._id });
    }

    get()._cleanup(false);
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

  setupCallListeners: (socket, getUsers) => {
    if (!socket) return;

    socket.off("call:incoming");
    socket.off("call:accepted");
    socket.off("call:rejected");
    socket.off("call:ended");
    socket.off("call:ice-candidate");
    socket.off("call:user-offline");

    socket.on("call:incoming", ({ from, offer, callType }) => {
      const { callStatus } = get();

      if (callStatus !== "idle") {
        socket.emit("call:reject", { to: from });
        return;
      }

      let callerData = { _id: from };

      if (getUsers) {
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
    });

    socket.on("call:accepted", async ({ answer }) => {
      const { peerConnection, _pendingCandidates } = get();

      if (!peerConnection) return;

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

        // Don't manually force connected here.
        // Actual connection completion will be detected by onconnectionstatechange.
      } catch (error) {
        console.error("Error handling accepted call:", error);
        get()._cleanup(false);
      }
    });

    socket.on("call:rejected", () => {
      toast("Call was declined", { icon: "📵" });
      get()._cleanup(false);
    });

    socket.on("call:ended", () => {
      toast("Call ended", { icon: "📞" });
      get()._cleanup(false);
    });

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
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.warn("Error adding ICE candidate:", error);
      }
    });

    socket.on("call:user-offline", () => {
      toast.error("User is offline");
      get()._cleanup(false);
    });
  },

  cleanupCallListeners: (socket) => {
    if (!socket) return;

    socket.off("call:incoming");
    socket.off("call:accepted");
    socket.off("call:rejected");
    socket.off("call:ended");
    socket.off("call:ice-candidate");
    socket.off("call:user-offline");
  },

  _cleanup: (resetRemoteToo = true) => {
    const {
      localStream,
      remoteStream,
      peerConnection,
      _durationInterval,
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

    set({
      callStatus: "idle",
      callType: null,
      remoteUser: null,
      isCaller: false,
      localStream: null,
      remoteStream: resetRemoteToo ? null : remoteStream,
      peerConnection: null,
      isMuted: false,
      isVideoOff: false,
      callDuration: 0,
      _durationInterval: null,
      _pendingCandidates: [],
      _incomingOffer: null,
    });
  },
}));