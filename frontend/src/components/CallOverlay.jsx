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
  Users,
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
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream || null;
      if (stream) {
        await videoEl.play().catch((err) => {
          console.warn(`${label} video play failed:`, err);
        });
      }
    }
  } catch (err) {
    console.error(`Error attaching ${label} stream:`, err);
  }
};

// Component for a Single remote video to help manage React refs effectively
const RemoteVideoParticipant = ({ stream, participant }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        attachAndPlay(videoRef.current, stream, `remote-${participant?._id}`);
    }, [stream]);

    return (
        <div className="relative w-full h-full bg-base-300 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 shadow-lg">
            {stream && stream.getVideoTracks().length > 0 ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center justify-center space-y-4">
                     <div className="size-20 rounded-full bg-primary/20 flex items-center justify-center shadow-[0_0_15px_rgba(var(--p),0.5)] border border-primary/30">
                        <img 
                            src={participant?.profilePic || "/avatar.png"} 
                            alt={participant?.fullName || "User"} 
                            className="size-16 rounded-full object-cover" 
                        />
                     </div>
                     <span className="text-white font-medium bg-black/40 px-3 py-1 rounded-full text-sm shadow-md backdrop-blur-md">
                         {participant?.fullName || "Connecting..."}
                     </span>
                </div>
            )}
            
            {/* Overlay Name badge if video is active */}
             {stream && stream.getVideoTracks().length > 0 && (
                 <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
                     <div className="size-6 rounded-full overflow-hidden border border-white/20">
                         <img src={participant?.profilePic || "/avatar.png"} alt="" className="size-full object-cover"/>
                     </div>
                     <span className="text-white text-xs font-medium tracking-wide">
                        {participant?.fullName?.split(" ")[0] || "User"}
                    </span>
                 </div>
             )}
        </div>
    );
};

const CallOverlay = () => {
  const {
    callStatus,
    callType,
    participants, // array of users being called
    localStream,
    remoteStreams, // { [userId]: MediaStream }
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

  useEffect(() => {
    attachAndPlay(localVideoRef.current, localStream, "local");
  }, [localStream]);

  if (callStatus === "idle") return null;

  const isVideoCall = callType === "video";
  const isConnected = callStatus === "connected";
  const isRinging = callStatus === "ringing";
  const isCalling = callStatus === "calling";
  
  // Who is the caller? The caller usually sits at participants[0] or we explicitly pass it
  // If we are ringing, participants[0] is the caller
  const primaryCaller = participants.length > 0 ? participants[0] : null;

  // Determine grid layout structure based on number of active remote streams
  const activeStreamEntries = Object.entries(remoteStreams).filter(([id, stream]) => stream);
  
  // If no streams are active yet, but we are supposed to be connected to 1 person, fallback UI handles it.
  const numVideos = activeStreamEntries.length;
  let gridClass = "grid-cols-1";
  if (numVideos === 2) gridClass = "grid-cols-1 md:grid-cols-2";
  else if (numVideos > 2) gridClass = "grid-cols-2 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 bg-base-300">
      
      {/* Dynamic blurred background to match theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-base-100 to-base-300 opacity-95"></div>
      
      {/* Top Bar showing participants/Status */}
      <div className="absolute top-6 left-0 w-full flex justify-center px-6 z-10">
          <div className="bg-base-100/60 backdrop-blur-xl border border-base-content/10 px-6 py-2.5 rounded-full flex items-center gap-3 shadow-2xl">
              <div className="flex -space-x-2">
                 {participants.slice(0, 3).map((p, i) => (
                    <img key={i} src={p.profilePic || "/avatar.png"} className="size-8 rounded-full border-2 border-base-100 relative z-[1]" alt="User"/>
                 ))}
                 {participants.length > 3 && (
                     <div className="size-8 rounded-full border-2 border-base-100 bg-base-200 flex items-center justify-center text-xs font-bold relative z-[0]">
                         +{participants.length - 3}
                     </div>
                 )}
              </div>
              <div className="h-4 w-px bg-base-content/20 mx-1"></div>
              {isConnected ? (
                  <span className="text-sm font-bold tracking-widest text-primary animate-pulse">{formatDuration(callDuration)}</span>
              ) : (
                  <span className="text-sm font-medium tracking-wide text-base-content/70">
                      {isCalling && "Establishing Connection..."}
                      {isRinging && "Incoming Group Call..."}
                  </span>
              )}
          </div>
      </div>

      {/* Main Video Area (Mesh Grid) */}
      <div className={`relative z-0 w-full max-w-7xl flex-1 flex my-20 p-2 sm:p-4 rounded-3xl bg-base-200/50 border border-base-content/5 shadow-2xl backdrop-blur-sm overflow-hidden`}>
          
          {/* While Ringing / Calling: Show centralized beautiful avatar instead of videos */}
          {(!isConnected && numVideos === 0) ? (
              <div className="w-full flex flex-col items-center justify-center gap-8">
                  <div className={`relative ${isRinging || isCalling ? 'animate-pulse' : ''}`}>
                      <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl"></div>
                      <div className="absolute -inset-8 bg-secondary/10 rounded-full blur-3xl"></div>
                      <img 
                          src={primaryCaller?.profilePic || "/avatar.png"} 
                          alt="Caller Avatar" 
                          className="size-32 sm:size-40 rounded-full border-4 border-base-100 shadow-2xl relative z-10" 
                      />
                  </div>
                  <div className="text-center space-y-2 relative z-10">
                      <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-base-content to-base-content/60 text-transparent bg-clip-text">
                          {participants.length > 1 ? `Group Call` : primaryCaller?.fullName}
                      </h2>
                      <p className="text-lg text-base-content/60">
                          {participants.length > 1 ? `with ${primaryCaller?.fullName} and ${participants.length - 1} others` : 'Incoming video call...'}
                      </p>
                  </div>
              </div>
          ) : (
              // Connected / Render Grid
              <div className={`w-full h-full grid gap-4 ${gridClass} p-2`}>
                  {activeStreamEntries.map(([participantId, stream]) => (
                      <RemoteVideoParticipant 
                          key={participantId} 
                          stream={stream} 
                          participant={participants.find(p => p._id === participantId)} 
                      />
                  ))}
                  
                  {/* Fallback if somehow connected but streams haven't trickled yet */}
                  {numVideos === 0 && isConnected && (
                      <div className="col-span-full h-full flex flex-col items-center justify-center bg-base-300 rounded-xl border border-base-content/5">
                          <span className="loading loading-spinner text-primary loading-lg"></span>
                          <span className="mt-4 text-base-content/50 font-medium">Waiting for peers...</span>
                      </div>
                  )}
              </div>
          )}

      </div>

      {/* Floating Picture in Picture for Local User */}
      {isVideoCall && localStream && isConnected && (
        <div className="absolute bottom-32 right-6 sm:bottom-10 sm:right-10 w-32 sm:w-48 aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-base-100 bg-base-300 z-50 transform hover:scale-105 transition-transform duration-300">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-base-300 flex items-center justify-center backdrop-blur-md">
                <VideoOff className="size-8 text-base-content/50" />
              </div>
            )}
        </div>
      )}

      {/* Controls Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 sm:gap-6 bg-base-100/80 backdrop-blur-xl px-8 py-4 rounded-full border border-base-content/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] z-50">
        
        {isRinging && (
          <>
            <button
              onClick={() => rejectCall(socket)}
              className="size-14 rounded-full bg-error hover:bg-error/90 flex items-center justify-center text-white shadow-lg hover:shadow-error/50 transition-all hover:scale-110 active:scale-95"
            >
              <PhoneOff className="size-6" />
            </button>
            <button
              onClick={() => acceptCall(socket)}
              className="size-14 rounded-full bg-success hover:bg-success/90 flex items-center justify-center text-white shadow-lg focus:outline-none focus:ring-4 focus:ring-success/30 hover:shadow-success/50 transition-all hover:scale-110 animate-bounce"
            >
              <Phone className="size-6" />
            </button>
          </>
        )}

        {isCalling && (
          <button
            onClick={() => endCall(socket)}
            className="size-14 rounded-full bg-error hover:bg-error/90 flex items-center justify-center text-white shadow-lg hover:shadow-error/50 transition-all hover:scale-110"
          >
            <X className="size-6" />
          </button>
        )}

        {isConnected && (
          <>
            <button
              onClick={toggleMute}
              className={`size-14 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 active:scale-95 ${
                isMuted ? "bg-error/90 hover:bg-error" : "bg-base-content/20 hover:bg-base-content/30"
              }`}
            >
              {isMuted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
            </button>

            {isVideoCall && (
              <button
                onClick={toggleVideo}
                className={`size-14 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 active:scale-95 ${
                  isVideoOff ? "bg-error/90 hover:bg-error" : "bg-base-content/20 hover:bg-base-content/30"
                }`}
              >
                {isVideoOff ? <VideoOff className="size-6" /> : <Video className="size-6" />}
              </button>
            )}

            <button
              onClick={() => endCall(socket)}
              className="size-14 rounded-full bg-error hover:bg-error/90 flex items-center justify-center text-white shadow-lg hover:shadow-error/50 transition-all hover:scale-110 active:scale-95 ml-4"
            >
              <PhoneOff className="size-6" />
            </button>
          </>
        )}
      </div>

    </div>
  );
};

export default CallOverlay;