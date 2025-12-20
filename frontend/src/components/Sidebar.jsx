import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Search } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } =
    useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = users
    .filter((user) => !showOnlineOnly || onlineUsers.includes(user._id))
    .filter((user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-80 border-r border-base-300 flex flex-col transition-all duration-200 bg-base-100">
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="size-5 text-primary" />
          </div>
          <div className="hidden lg:block">
            <h2 className="font-bold text-lg">Messages</h2>
            <p className="text-xs text-base-content/60">
              {onlineUsers.length - 1} contacts online
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden lg:block relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
          <input
            type="text"
            placeholder="Search contacts..."
            className="input input-sm w-full pl-9 bg-base-200/50 border-0 focus:bg-base-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Online filter toggle */}
        <div className="mt-3 hidden lg:flex items-center justify-between">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="toggle toggle-primary toggle-sm"
            />
            <span className="text-sm text-base-content/70">Online only</span>
          </label>
        </div>
      </div>

      {/* User List */}
      <div className="overflow-y-auto w-full flex-1">
        {filteredUsers.map((user) => {
          const isOnline = onlineUsers.includes(user._id);
          const isSelected = selectedUser?._id === user._id;

          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3 transition-all duration-200
                hover:bg-base-200/70
                ${
                  isSelected
                    ? "bg-primary/10 lg:border-l-4 lg:border-primary"
                    : ""
                }
              `}
            >
              {/* Avatar */}
              <div className="relative mx-auto lg:mx-0 flex-shrink-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className={`size-12 object-cover rounded-full transition-all duration-200 ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100"
                      : ""
                  }`}
                />
                {/* Online indicator */}
                <span
                  className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-base-100 ${
                    isOnline ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div className="font-semibold truncate">{user.fullName}</div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span
                    className={`${
                      isOnline ? "text-green-500" : "text-base-content/50"
                    }`}
                  >
                    {isOnline ? "● Online" : "○ Offline"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-base-content/50 py-12 px-4">
            <div className="size-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
              <Users className="size-8 opacity-50" />
            </div>
            <p className="font-medium">No users found</p>
            <p className="text-sm mt-1">
              {showOnlineOnly
                ? "No one is online right now"
                : "Try a different search"}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
