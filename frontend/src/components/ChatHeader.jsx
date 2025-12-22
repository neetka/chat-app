import { X, Lock, Timer, UserPlus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

import AddMemberModal from "./AddMemberModal";
import { useState } from "react";

const ChatHeader = () => {
  const { selectedUser, selectedGroup, setSelectedUser, setSelectedGroup, encryptionEnabled, toggleEncryption, disappearingDuration, setDisappearingDuration, isTyping } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [showAddMember, setShowAddMember] = useState(false);

  const isGroup = !!selectedGroup;
  const target = selectedGroup || selectedUser;
  
  if (!target) return null;

  // DEBUG LOGGING
  if (isGroup) {
      console.log("Current User:", authUser._id);
      console.log("Group Admin:", selectedGroup.admin);
      const adminId = selectedGroup.admin?._id || selectedGroup.admin;
      console.log("Comparison:", adminId, "===", authUser._id, "Match?", adminId === authUser._id);
  }

  const isOnline = !isGroup && selectedUser ? onlineUsers.includes(selectedUser._id) : false;
  
  const durations = [
    { label: "Off", value: 0 },
    { label: "10s", value: 10 },
    { label: "1m", value: 60 },
    { label: "1h", value: 3600 },
    { label: "24h", value: 86400 },
  ];

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
            <h3 className="font-medium">{isGroup ? selectedGroup.name : selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {isGroup 
                ? `${selectedGroup.members?.length || 0} members` 
                : (isTyping ? "Typing..." : (isOnline ? "Online" : "Offline"))
              }
            </p>
          </div>
        </div>

        {/* Close button */}
        <div className="flex items-center gap-2">
          {/* Add Member Button (Groups & Admin only) */}
          {isGroup && (
             // Handle both populated object and direct ID ID
             (selectedGroup.admin?._id === authUser._id || selectedGroup.admin === authUser._id)
          ) && (
              <button 
                onClick={() => setShowAddMember(true)}
                className="btn btn-sm btn-ghost text-primary"
                title="Add Member"
              >
                  <UserPlus className="size-5" />
              </button>
          )}

          {/* Disappearing Messages Toggle (Only P2P for now) */}
          {!isGroup && (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className={`btn btn-sm btn-ghost ${disappearingDuration > 0 ? 'text-primary' : 'text-base-content/60'}`} title="Disappearing Messages">
              <Timer className="size-5" />
              {disappearingDuration > 0 && <span className="text-xs">{durations.find(d => d.value === disappearingDuration)?.label}</span>}
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-300">
              <li className="menu-title text-xs opacity-50 px-2">Disappearing</li>
              {durations.map((duration) => (
                <li key={duration.value}>
                  <button 
                    className={disappearingDuration === duration.value ? "active" : ""}
                    onClick={() => {
                        setDisappearingDuration(duration.value);
                        if (document.activeElement) document.activeElement.blur();
                    }}
                  >
                    {duration.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          )}

           {/* Encryption Toggle (Only P2P) */}
           {!isGroup && (
            <button
                onClick={toggleEncryption}
                className={`btn btn-sm btn-ghost ${encryptionEnabled ? 'text-success' : 'text-warning'}`}
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
    </div>
  );
};
export default ChatHeader;
