import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div className="px-4 py-3 border-b border-base-300 bg-base-100 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar with online indicator */}
          <div className="relative">
            <div className="avatar">
              <div className="size-11 rounded-full ring-2 ring-offset-2 ring-offset-base-100 ring-primary/20">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt={selectedUser.fullName}
                  className="object-cover"
                />
              </div>
            </div>
            {/* Online indicator dot */}
            <span
              className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-base-100 ${
                isOnline ? "bg-green-500" : "bg-gray-400"
              }`}
            />
          </div>

          {/* User info */}
          <div>
            <h3 className="font-semibold text-base">{selectedUser.fullName}</h3>
            <div className="flex items-center gap-1.5">
              <span
                className={`size-2 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <p
                className={`text-sm ${
                  isOnline ? "text-green-600" : "text-base-content/60"
                }`}
              >
                {isOnline ? "Active now" : "Offline"}
              </p>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setSelectedUser(null)}
          className="btn btn-ghost btn-sm btn-circle hover:bg-error/10 hover:text-error"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
