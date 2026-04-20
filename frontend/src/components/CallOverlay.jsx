// import { useEffect, useRef } from "react";
// import { useCallStore } from "../store/useCallStore";
// import { useAuthStore } from "../store/useAuthStore";
// import {
//   Phone,
//   PhoneOff,
//   Mic,
//   MicOff,
//   Video,
//   VideoOff,
//   X,
// } from "lucide-react";

// const formatDuration = (seconds) => {
//   const mins = Math.floor(seconds / 60);
//   const secs = seconds % 60;
//   return `${mins.toString().padStart(2, "0")}:${secs
//     .toString().padStart(2, "0")}`;
// };

// const CallOverlay = () => {
//   const {
//     callStatus,
//     callType,
//     remoteUser,
//     isCaller,
//     localStream,
//     remoteStream,
//     isMuted,
//     isVideoOff,
//     callDuration,
//     acceptCall,
//     rejectCall,
//     endCall,
//     toggleMute,
//     toggleVideo,
//   } = useCallStore();

//   const { socket } = useAuthStore();
//   const localVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);
//   const ringtoneRef = useRef(null);

//   // Attach local video stream
//   useEffect(() => {
//     if (localVideoRef.current && localStream) {
//       localVideoRef.current.srcObject = localStream;
//     }
//   }, [localStream]);

//   // Attach remote video stream
//   useEffect(() => {
//     if (remoteVideoRef.current && remoteStream) {
//       remoteVideoRef.current.srcObject = remoteStream;
//     }
//   }, [remoteStream]);

//   // Play ringtone when ringing
//   useEffect(() => {
//     if (callStatus === "ringing" || callStatus === "calling") {
//       // Use Web Audio API for a simple ringtone
//       const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
//       let oscillator = null;
//       let gainNode = null;
//       let interval = null;

//       const playTone = () => {
//         oscillator = audioCtx.createOscillator();
//         gainNode = audioCtx.createGain();
//         oscillator.connect(gainNode);
//         gainNode.connect(audioCtx.destination);
//         oscillator.frequency.value = callStatus === "ringing" ? 440 : 480;
//         oscillator.type = "sine";
//         gainNode.gain.value = 0.1;
//         oscillator.start();
//         setTimeout(() => {
//           if (oscillator) {
//             oscillator.stop();
//             oscillator = null;
//           }
//         }, 500);
//       };

//       playTone();
//       interval = setInterval(playTone, 2000);

//       ringtoneRef.current = { audioCtx, interval };

//       return () => {
//         if (interval) clearInterval(interval);
//         if (audioCtx.state !== "closed") {
//           audioCtx.close();
//         }
//       };
//     }
//   }, [callStatus]);

//   // Don't render if idle
//   if (callStatus === "idle") return null;

//   const isVideoCall = callType === "video";
//   const isConnected = callStatus === "connected";
//   const isRinging = callStatus === "ringing";
//   const isCalling = callStatus === "calling";

//   return (
//     <div className="call-overlay" id="call-overlay">
//       {/* Background */}
//       <div className="call-overlay__bg" />

//       {/* Remote Video (full screen when connected + video call) */}
//       {isVideoCall && isConnected && (
//         <video
//           ref={remoteVideoRef}
//           autoPlay
//           playsInline
//           className="call-overlay__remote-video"
//         />
//       )}

//       {/* Main Content */}
//       <div className="call-overlay__content">
//         {/* Avatar & Status — shown when NOT connected to video, OR voice call */}
//         {(!isConnected || !isVideoCall) && (
//           <div className="call-overlay__user-info">
//             <div
//               className={`call-overlay__avatar ${
//                 isCalling || isRinging ? "call-overlay__avatar--pulsing" : ""
//               }`}
//             >
//               <img
//                 src={remoteUser?.profilePic || "/avatar.png"}
//                 alt={remoteUser?.fullName || "User"}
//               />
//             </div>
//             <h2 className="call-overlay__name">
//               {remoteUser?.fullName || "User"}
//             </h2>
//             <p className="call-overlay__status">
//               {isCalling && "Calling..."}
//               {isRinging && `Incoming ${isVideoCall ? "video" : "voice"} call...`}
//               {isConnected && formatDuration(callDuration)}
//             </p>
//           </div>
//         )}

//         {/* Duration overlay for connected video calls */}
//         {isVideoCall && isConnected && (
//           <div className="call-overlay__duration-badge">
//             <span>{formatDuration(callDuration)}</span>
//           </div>
//         )}

//         {/* Local Video PiP — for video calls when connected */}
//         {isVideoCall && localStream && isConnected && (
//           <div className="call-overlay__pip">
//             <video
//               ref={localVideoRef}
//               autoPlay
//               playsInline
//               muted
//               className="call-overlay__local-video"
//             />
//             {isVideoOff && (
//               <div className="call-overlay__pip-off">
//                 <VideoOff className="size-6" />
//               </div>
//             )}
//           </div>
//         )}

//         {/* Controls */}
//         <div className="call-overlay__controls">
//           {/* Incoming call: Accept / Reject */}
//           {isRinging && (
//             <div className="call-overlay__controls-row">
//               <button
//                 onClick={() => rejectCall(socket)}
//                 className="call-btn call-btn--reject"
//                 title="Decline"
//                 id="call-reject-btn"
//               >
//                 <PhoneOff className="size-6" />
//               </button>
//               <button
//                 onClick={() => acceptCall(socket)}
//                 className="call-btn call-btn--accept"
//                 title="Accept"
//                 id="call-accept-btn"
//               >
//                 <Phone className="size-6" />
//               </button>
//             </div>
//           )}

//           {/* Calling (outgoing, waiting for answer) */}
//           {isCalling && (
//             <div className="call-overlay__controls-row">
//               <button
//                 onClick={() => endCall(socket)}
//                 className="call-btn call-btn--reject"
//                 title="Cancel"
//                 id="call-cancel-btn"
//               >
//                 <X className="size-6" />
//               </button>
//             </div>
//           )}

//           {/* In-call controls */}
//           {isConnected && (
//             <div className="call-overlay__controls-row">
//               <button
//                 onClick={toggleMute}
//                 className={`call-btn ${isMuted ? "call-btn--active" : "call-btn--default"}`}
//                 title={isMuted ? "Unmute" : "Mute"}
//                 id="call-mute-btn"
//               >
//                 {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
//               </button>

//               {isVideoCall && (
//                 <button
//                   onClick={toggleVideo}
//                   className={`call-btn ${isVideoOff ? "call-btn--active" : "call-btn--default"}`}
//                   title={isVideoOff ? "Turn on camera" : "Turn off camera"}
//                   id="call-video-btn"
//                 >
//                   {isVideoOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
//                 </button>
//               )}

//               <button
//                 onClick={() => endCall(socket)}
//                 className="call-btn call-btn--reject"
//                 title="End call"
//                 id="call-end-btn"
//               >
//                 <PhoneOff className="size-6" />
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CallOverlay;

import { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  X,
} from "lucide-react";

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const attachAndPlay = async (videoEl, stream, label) => {
  if (!videoEl) return;

  try {
    videoEl.srcObject = stream || null;

    if (stream) {
      console.log(`${label} stream tracks:`, stream.getTracks().map((t) => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted,
        id: t.id,
      })));
    }

    await videoEl.play().catch((err) => {
      console.warn(`${label} video play failed:`, err);
    });
  } catch (err) {
    console.error(`Error attaching ${label} stream:`, err);
  }
};

const CallOverlay = () => {
  const {
    callStatus,
    callType,
    remoteUser,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCallStore();

  const { socket } = useAuthStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    attachAndPlay(localVideoRef.current, localStream, "local");
  }, [localStream]);

  useEffect(() => {
    attachAndPlay(remoteVideoRef.current, remoteStream, "remote");
  }, [remoteStream]);

  if (callStatus === "idle") return null;

  const isVideoCall = callType === "video";
  const isConnected = callStatus === "connected";
  const isRinging = callStatus === "ringing";
  const isCalling = callStatus === "calling";

  return (
    <div className="call-overlay" id="call-overlay">
      <div className="call-overlay__bg" />

      {/* Remote video */}
      {isVideoCall && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="call-overlay__remote-video"
        />
      )}

      <div className="call-overlay__content">
        {/* Show avatar only until remote stream actually arrives */}
        {(!isConnected || !isVideoCall) && !remoteStream && (
          <div className="call-overlay__user-info">
            <div
              className={`call-overlay__avatar ${isCalling || isRinging ? "call-overlay__avatar--pulsing" : ""
                }`}
            >
              <img
                src={remoteUser?.profilePic || "/avatar.png"}
                alt={remoteUser?.fullName || "User"}
              />
            </div>

            <h2 className="call-overlay__name">
              {remoteUser?.fullName || "User"}
            </h2>

            <p className="call-overlay__status">
              {isCalling && "Connecting..."}
              {isRinging &&
                `Incoming ${isVideoCall ? "video" : "voice"} call...`}
              {isConnected && formatDuration(callDuration)}
            </p>
          </div>
        )}

        {isVideoCall && isConnected && (
          <div className="call-overlay__duration-badge">
            <span>{formatDuration(callDuration)}</span>
          </div>
        )}

        {/* Local video preview */}
        {isVideoCall && localStream && (
          <div className="call-overlay__pip">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="call-overlay__local-video"
            />
            {isVideoOff && (
              <div className="call-overlay__pip-off">
                <VideoOff className="size-6" />
              </div>
            )}
          </div>
        )}

        <div className="call-overlay__controls">
          {isRinging && (
            <div className="call-overlay__controls-row">
              <button
                onClick={() => rejectCall(socket)}
                className="call-btn call-btn--reject"
                title="Decline"
                id="call-reject-btn"
              >
                <PhoneOff className="size-6" />
              </button>

              <button
                onClick={() => acceptCall(socket)}
                className="call-btn call-btn--accept"
                title="Accept"
                id="call-accept-btn"
              >
                <Phone className="size-6" />
              </button>
            </div>
          )}

          {isCalling && (
            <div className="call-overlay__controls-row">
              <button
                onClick={() => endCall(socket)}
                className="call-btn call-btn--reject"
                title="Cancel"
                id="call-cancel-btn"
              >
                <X className="size-6" />
              </button>
            </div>
          )}

          {isConnected && (
            <div className="call-overlay__controls-row">
              <button
                onClick={toggleMute}
                className={`call-btn ${isMuted ? "call-btn--active" : "call-btn--default"
                  }`}
                title={isMuted ? "Unmute" : "Mute"}
                id="call-mute-btn"
              >
                {isMuted ? (
                  <MicOff className="size-5" />
                ) : (
                  <Mic className="size-5" />
                )}
              </button>

              {isVideoCall && (
                <button
                  onClick={toggleVideo}
                  className={`call-btn ${isVideoOff ? "call-btn--active" : "call-btn--default"
                    }`}
                  title={isVideoOff ? "Turn on camera" : "Turn off camera"}
                  id="call-video-btn"
                >
                  {isVideoOff ? (
                    <VideoOff className="size-5" />
                  ) : (
                    <Video className="size-5" />
                  )}
                </button>
              )}

              <button
                onClick={() => endCall(socket)}
                className="call-btn call-btn--reject"
                title="End call"
                id="call-end-btn"
              >
                <PhoneOff className="size-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;