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

const CallOverlay = () => {
  const {
    callStatus,
    callType,
    remoteUser,
    isCaller,
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

  const { socket, authUser } = useAuthStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ringtoneRef = useRef(null);

  // Attach local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Attach remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Play ringtone when ringing or calling
  useEffect(() => {
    if (callStatus === "ringing" || callStatus === "calling") {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      let oscillator = null;
      let interval = null;

      const playTone = () => {
        try {
          oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.frequency.value = callStatus === "ringing" ? 440 : 480;
          oscillator.type = "sine";
          gainNode.gain.value = 0.08;
          oscillator.start();
          setTimeout(() => {
            if (oscillator) {
              try { oscillator.stop(); } catch (e) {}
              oscillator = null;
            }
          }, 400);
        } catch (e) {}
      };

      playTone();
      interval = setInterval(playTone, 2000);
      ringtoneRef.current = { audioCtx, interval };

      return () => {
        if (interval) clearInterval(interval);
        if (audioCtx.state !== "closed") {
          audioCtx.close().catch(() => {});
        }
      };
    }
  }, [callStatus]);

  // Don't render if idle
  if (callStatus === "idle") return null;

  const isVideoCall = callType === "video";
  const isConnected = callStatus === "connected";
  const isRinging = callStatus === "ringing";
  const isCalling = callStatus === "calling";
  const isConnecting = callStatus === "connecting";

  const remoteName = remoteUser?.fullName || "User";
  const remoteAvatar = remoteUser?.profilePic || "/avatar.png";

  // Determine status text
  let statusText = "";
  if (isCalling) statusText = "Calling...";
  if (isRinging) statusText = `Incoming ${isVideoCall ? "video" : "voice"} call`;
  if (isConnecting) statusText = "Connecting...";
  if (isConnected) statusText = formatDuration(callDuration);

  // Should we show the large centered user info?
  // Show it for: ringing, calling, connecting, AND connected voice calls
  const showCenteredInfo =
    !isConnected || !isVideoCall || isRinging || isCalling || isConnecting;

  return (
    <div className="call-overlay" id="call-overlay">
      {/* Background */}
      <div className="call-overlay__bg" />

      {/* Remote Video (full screen for video calls) */}
      {isVideoCall && isConnected && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="call-overlay__remote-video"
        />
      )}

      {/* Main Content */}
      <div className="call-overlay__content">
        {/* Centered avatar + name — shown for voice calls always, and video calls before connected */}
        {showCenteredInfo && (
          <div className="call-overlay__user-info">
            <div
              className={`call-overlay__avatar ${
                isCalling || isRinging || isConnecting
                  ? "call-overlay__avatar--pulsing"
                  : ""
              }`}
            >
              <img src={remoteAvatar} alt={remoteName} />
            </div>

            <h2 className="call-overlay__name">{remoteName}</h2>

            <p className="call-overlay__status">{statusText}</p>
          </div>
        )}

        {/* Name + duration badge for connected VIDEO calls (top overlay) */}
        {isVideoCall && isConnected && (
          <div className="call-overlay__top-info">
            <span className="call-overlay__top-name">{remoteName}</span>
            <span className="call-overlay__top-duration">
              {formatDuration(callDuration)}
            </span>
          </div>
        )}

        {/* Local Video PiP — for video calls */}
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
            <span className="call-overlay__pip-label">You</span>
          </div>
        )}

        {/* Controls */}
        <div className="call-overlay__controls">
          {/* Incoming call: Accept / Reject */}
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

          {/* Calling (outgoing, waiting for answer) */}
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

          {/* Connecting (after accepting, before peer connection) */}
          {isConnecting && (
            <div className="call-overlay__controls-row">
              <button
                onClick={() => endCall(socket)}
                className="call-btn call-btn--reject"
                title="Cancel"
                id="call-cancel-connecting-btn"
              >
                <X className="size-6" />
              </button>
            </div>
          )}

          {/* In-call controls */}
          {isConnected && (
            <div className="call-overlay__controls-row">
              <button
                onClick={toggleMute}
                className={`call-btn ${
                  isMuted ? "call-btn--active" : "call-btn--default"
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
                  className={`call-btn ${
                    isVideoOff ? "call-btn--active" : "call-btn--default"
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