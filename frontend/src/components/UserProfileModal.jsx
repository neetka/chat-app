import { useEffect, useState } from "react";
import {
  X,
  MessageSquare,
  Phone,
  Video,
  Clock,
  Loader2,
  User,
  Zap,
  Heart,
  PhoneMissed,
  UserPlus,
  UserCheck,
  ShieldX,
} from "lucide-react";
import { useProfileStore } from "../store/useProfileStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import { useChatStore } from "../store/useChatStore";

// ─── helpers ──────────────────────────────────────────────────────────────────
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Long time ago";
  const diff = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1)  return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  if (days < 7)     return `${days}d ago`;
  return new Date(lastSeen).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};


const TagChip = ({ label, variant = "primary" }) => {
  const styles = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${styles[variant]} whitespace-nowrap`}
    >
      {label}
    </span>
  );
};

// ─── component ────────────────────────────────────────────────────────────────
const UserProfileModal = ({ userId, onClose }) => {
  const { viewedProfile, isLoadingProfile, fetchProfile, clearProfile } = useProfileStore();
  const { onlineUsers, lastSeenMap, missedCallAlerts, clearMissedCallAlert } = useAuthStore();
  const { sendRequest, acceptRequest, rejectRequest } = useFriendStore();
  const { users, getUsers } = useChatStore();
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  useEffect(() => {
    if (userId) fetchProfile(userId);
    return () => clearProfile();
  }, [userId]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Get friendship info from sidebar user data
  const sidebarUser = users.find((u) => u._id === userId);
  const friendshipStatus = sidebarUser?.friendshipStatus || "none";
  const friendRequestDirection = sidebarUser?.friendRequestDirection || null;
  const friendRequestId = sidebarUser?.friendRequestId || null;

  const handleSendRequest = async () => {
    setIsSendingRequest(true);
    await sendRequest(userId);
    await getUsers();
    setIsSendingRequest(false);
  };

  const handleAccept = async () => {
    if (!friendRequestId) return;
    setIsSendingRequest(true);
    await acceptRequest(friendRequestId);
    await getUsers();
    setIsSendingRequest(false);
  };

  const handleReject = async () => {
    if (!friendRequestId) return;
    setIsSendingRequest(true);
    await rejectRequest(friendRequestId);
    await getUsers();
    setIsSendingRequest(false);
  };

  const isOnline = onlineUsers.includes(userId);
  const lastSeen = lastSeenMap[userId] || viewedProfile?.lastSeen;
  const hasMissedCall = missedCallAlerts.some((a) => a.fromId?.toString() === userId?.toString());

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div
        className="relative w-full max-w-sm h-full bg-base-100 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: "slideInRight 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header hero ─────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10 px-6 pt-12 pb-8 flex-shrink-0">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 btn btn-sm btn-circle btn-ghost"
          >
            <X size={18} />
          </button>

          {isLoadingProfile ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="animate-spin text-primary" size={36} />
              <p className="text-base-content/50 text-sm">Loading profile…</p>
            </div>
          ) : viewedProfile ? (
            <div className="flex flex-col items-center text-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={viewedProfile.profilePic || "/avatar.png"}
                  alt={viewedProfile.fullName}
                  className="size-24 rounded-full object-cover ring-4 ring-base-100 shadow-xl"
                />
                {/* Online dot */}
                <span
                  className={`absolute bottom-1 right-1 size-4 rounded-full ring-2 ring-base-100 ${
                    isOnline ? "bg-green-500" : "bg-base-300"
                  }`}
                />
              </div>

              {/* Name */}
              <div>
                <h2 className="text-xl font-bold">{viewedProfile.fullName}</h2>
                <p
                  className={`text-sm flex items-center justify-center gap-1 mt-0.5 ${
                    isOnline ? "text-green-500" : "text-base-content/50"
                  }`}
                >
                  {isOnline ? (
                    <>
                      <span className="size-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                      Online
                    </>
                  ) : (
                    <>
                      <Clock size={12} />
                      {lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : "Offline"}
                    </>
                  )}
                </p>
              </div>

              {/* Missed call alert banner */}
              {hasMissedCall && (
                <div className="w-full bg-warning/10 border border-warning/30 rounded-xl px-4 py-2 flex items-center gap-2">
                  <PhoneMissed size={16} className="text-warning flex-shrink-0" />
                  <span className="text-xs text-warning font-medium">
                    Tried to reach you while you were offline
                  </span>
                  <button
                    onClick={() => clearMissedCallAlert(userId)}
                    className="ml-auto text-warning/60 hover:text-warning"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* ── Friend request action button ────────────── */}
              <div className="w-full mt-2">
                {friendshipStatus === "accepted" && (
                  <div className="flex items-center justify-center gap-2 text-success text-sm">
                    <UserCheck size={16} />
                    <span className="font-medium">Friends</span>
                  </div>
                )}

                {friendshipStatus === "none" && (
                  <button
                    onClick={handleSendRequest}
                    disabled={isSendingRequest}
                    className="btn btn-primary btn-sm w-full gap-2"
                  >
                    {isSendingRequest ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <UserPlus size={14} />
                    )}
                    Send Friend Request
                  </button>
                )}

                {friendshipStatus === "pending" && friendRequestDirection === "sent" && (
                  <div className="flex items-center justify-center gap-2 text-warning text-sm">
                    <Clock size={14} />
                    <span className="font-medium">Request Pending</span>
                  </div>
                )}

                {friendshipStatus === "pending" && friendRequestDirection === "received" && (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleAccept}
                      disabled={isSendingRequest}
                      className="btn btn-success btn-sm flex-1 gap-1"
                    >
                      <UserCheck size={14} /> Accept
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isSendingRequest}
                      className="btn btn-ghost btn-sm flex-1 gap-1"
                    >
                      <ShieldX size={14} /> Decline
                    </button>
                  </div>
                )}

                {friendshipStatus === "rejected" && friendRequestDirection === "sent" && (
                  <button
                    onClick={handleSendRequest}
                    disabled={isSendingRequest}
                    className="btn btn-outline btn-sm w-full gap-2"
                  >
                    <UserPlus size={14} /> Send Again
                  </button>
                )}

                {friendshipStatus === "rejected" && friendRequestDirection === "received" && (
                  <div className="flex items-center justify-center gap-2 text-base-content/40 text-sm">
                    <ShieldX size={14} />
                    <span>Request Declined</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Scrollable body ──────────────────────────────── */}
        {!isLoadingProfile && viewedProfile && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Bio */}
            {viewedProfile.bio && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2">
                  About
                </h3>
                <p className="text-sm text-base-content/80 leading-relaxed">
                  {viewedProfile.bio}
                </p>
              </div>
            )}

            {/* Skills */}
            {viewedProfile.skills?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2 flex items-center gap-1.5">
                  <Zap size={12} className="text-primary" /> Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {viewedProfile.skills.map((s) => (
                    <TagChip key={s} label={s} variant="primary" />
                  ))}
                </div>
              </div>
            )}

            {/* Interests */}
            {viewedProfile.interests?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2 flex items-center gap-1.5">
                  <Heart size={12} className="text-secondary" /> Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {viewedProfile.interests.map((i) => (
                    <TagChip key={i} label={i} variant="secondary" />
                  ))}
                </div>
              </div>
            )}


            {/* Member since */}
            {viewedProfile.createdAt && (
              <p className="text-xs text-base-content/30 text-center pb-2">
                Member since{" "}
                {new Date(viewedProfile.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default UserProfileModal;
