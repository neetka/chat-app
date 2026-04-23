import { X, Lock, Timer, UserPlus, Phone, Video, Info } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";
import AddMemberModal from "./AddMemberModal";
import UserProfileModal from "./UserProfileModal";
import { useState } from "react";

const ChatHeader = () => {
  const { selectedUser, selectedGroup, setSelectedUser, setSelectedGroup, encryptionEnabled, toggleEncryption, disappearingDuration, setDisappearingDuration, isTyping } = useChatStore();
  const { onlineUsers, authUser, socket, missedCallAlerts } = useAuthStore();
  const { initiateCall, callStatus } = useCallStore();
  const [showAddMember,    setShowAddMember]    = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isGroup  = !!selectedGroup;
  const target   = selectedGroup || selectedUser;
  if (!target) return null;

  if (isGroup) {
    console.log("Current User:", authUser._id);
    console.log("Group Admin:", selectedGroup.admin);
    const adminId = selectedGroup.admin?._id || selectedGroup.admin;
    console.log("Comparison:", adminId, "===", authUser._id, "Match?", adminId === authUser._id);
  }

  const isOnline = !isGroup && selectedUser ? onlineUsers.includes(selectedUser._id) : false;

  // Check for missed call from this user
  const hasMissedCall = !isGroup && selectedUser
    ? missedCallAlerts.some((a) => a.fromId?.toString() === selectedUser._id?.toString())
    : false;

  const durations = [
    { label: "Off", value: 0 },
    { label: "10s", value: 10 },
    { label: "1m",  value: 60 },
    { label: "1h",  value: 3600 },
    { label: "24h", value: 86400 },
  ];

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">

        {/* ── Left: avatar + name (clickable for P2P profile) ── */}
        <div
          className={`flex items-center gap-3 ${!isGroup ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
          onClick={() => !isGroup && setShowProfileModal(true)}
          title={!isGroup ? "View profile" : undefined}
        >
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              {isGroup ? (
                <div className="size-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {selectedGroup.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">
                {isGroup ? selectedGroup.name : selectedUser.fullName}
              </h3>
              {/* Missed call badge */}
              {hasMissedCall && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-warning/20 text-warning text-[10px] font-semibold border border-warning/30">
                  <Phone size={9} />missed
                </span>
              )}
            </div>
            <p className="text-sm text-base-content/70">
              {isGroup
                ? `${selectedGroup.members?.length || 0} members`
                : isTyping ? "Typing…" : (isOnline ? "Online" : "Offline")
              }
            </p>
          </div>
          {/* Info icon hint for P2P */}
          {!isGroup && (
            <Info size={14} className="text-base-content/30 hidden sm:block" />
          )}
        </div>

        {/* ── Right: actions ─────────────────────────────────── */}
        <div className="flex items-center gap-1">
          {/* Voice & Video Call (P2P only) */}
          {!isGroup && selectedUser && (
            <>
              <button
                onClick={() => initiateCall(selectedUser, "voice", socket)}
                className="btn btn-sm btn-ghost text-base-content/70 hover:text-success"
                title="Voice call"
                disabled={!isOnline || callStatus !== "idle"}
                id="voice-call-btn"
              >
                <Phone className="size-5" />
              </button>
              <button
                onClick={() => initiateCall(selectedUser, "video", socket)}
                className="btn btn-sm btn-ghost text-base-content/70 hover:text-info"
                title="Video call"
                disabled={!isOnline || callStatus !== "idle"}
                id="video-call-btn"
              >
                <Video className="size-5" />
              </button>
            </>
          )}

          {/* Add Member (Groups & Admin only) */}
          {isGroup && (selectedGroup.admin?._id === authUser._id || selectedGroup.admin === authUser._id) && (
            <button onClick={() => setShowAddMember(true)} className="btn btn-sm btn-ghost text-primary" title="Add Member">
              <UserPlus className="size-5" />
            </button>
          )}

          {/* Disappearing messages (P2P only) */}
          {!isGroup && (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className={`btn btn-sm btn-ghost ${disappearingDuration > 0 ? "text-primary" : "text-base-content/60"}`} title="Disappearing Messages">
                <Timer className="size-5" />
                {disappearingDuration > 0 && <span className="text-xs">{durations.find((d) => d.value === disappearingDuration)?.label}</span>}
              </div>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-300">
                <li className="menu-title text-xs opacity-50 px-2">Disappearing</li>
                {durations.map((d) => (
                  <li key={d.value}>
                    <button
                      className={disappearingDuration === d.value ? "active" : ""}
                      onClick={() => { setDisappearingDuration(d.value); if (document.activeElement) document.activeElement.blur(); }}
                    >
                      {d.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Encryption toggle (P2P only) */}
          {!isGroup && (
            <button
              onClick={toggleEncryption}
              className={`btn btn-sm btn-ghost ${encryptionEnabled ? "text-success" : "text-warning"}`}
              title={encryptionEnabled ? "End-to-end encrypted" : "Encryption disabled"}
            >
              <Lock className="size-5" />
            </button>
          )}

          <button onClick={() => isGroup ? setSelectedGroup(null) : setSelectedUser(null)}>
            <X />
          </button>
        </div>
      </div>

      {/* Modals */}
      {isGroup && (
        <AddMemberModal
          isOpen={showAddMember}
          onClose={() => setShowAddMember(false)}
          groupId={selectedGroup._id}
          currentMembers={selectedGroup.members || []}
        />
      )}

      {showProfileModal && !isGroup && selectedUser && (
        <UserProfileModal
          userId={selectedUser._id}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
};

export default ChatHeader;
