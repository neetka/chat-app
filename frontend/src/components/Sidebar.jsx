import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus, PhoneMissed, UserPlus, UserCheck, Clock as ClockIcon, Check, X } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

// ── helper ─────────────────────────────────────────────────────────────────
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return null;
  const diff = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);
  if (minutes < 1)  return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  if (days < 7)     return `${days}d ago`;
  return new Date(lastSeen).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ── Friendship status badge ────────────────────────────────────────────────
const FriendshipBadge = ({ status, direction }) => {
  if (status === "accepted") {
    return (
      <span className="tooltip tooltip-left" data-tip="Friends">
        <UserCheck size={13} className="text-success" />
      </span>
    );
  }
  if (status === "pending" && direction === "sent") {
    return (
      <span className="tooltip tooltip-left" data-tip="Request sent">
        <ClockIcon size={13} className="text-warning" />
      </span>
    );
  }
  if (status === "pending" && direction === "received") {
    return (
      <span className="tooltip tooltip-left" data-tip="Wants to connect">
        <UserPlus size={13} className="text-info animate-pulse" />
      </span>
    );
  }
  return null;
};

// ── component ──────────────────────────────────────────────────────────────
const Sidebar = () => {
  const {
    getUsers, users, selectedUser, setSelectedUser, isUsersLoading,
    getGroups, groups, selectedGroup, setSelectedGroup, isGroupsLoading,
  } = useChatStore();

  const {
    onlineUsers,
    lastSeenMap,
    missedCallAlerts,
    unreadCounts,
    clearUnreadCount,
  } = useAuthStore();

  const {
    pendingRequests,
    fetchPending,
    acceptRequest,
    rejectRequest,
  } = useFriendStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab,      setActiveTab]      = useState("chats");
  const [isModalOpen,    setIsModalOpen]    = useState(false);

  useEffect(() => {
    getUsers();
    getGroups();
    fetchPending();
  }, [getUsers, getGroups, fetchPending]);

  const filteredUsers = showOnlineOnly
    ? users.filter((u) => onlineUsers.includes(u._id))
    : users;

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  const handleAcceptRequest = async (requestId) => {
    const success = await acceptRequest(requestId);
    if (success) getUsers(); // Refresh sidebar user list with updated friendship status
  };

  const handleRejectRequest = async (requestId) => {
    const success = await rejectRequest(requestId);
    if (success) getUsers();
  };

  const tabs = ["chats", "groups", "requests"];

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>

        {/* Tabs */}
        <div className="flex bg-base-200 p-1 rounded-lg mb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`flex-1 flex items-center justify-center py-1 text-sm rounded-md transition-colors capitalize relative ${
                activeTab === tab
                  ? "bg-white text-primary shadow-sm"
                  : "text-base-content/60 hover:text-base-content"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {/* Pending count badge on requests tab */}
              {tab === "requests" && pendingRequests.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-error-content text-[10px] font-bold flex items-center justify-center">
                  {pendingRequests.length > 9 ? "9+" : pendingRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Online filter */}
        {activeTab === "chats" && (
          <div className="mt-3 hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
            <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
          </div>
        )}

        {/* Create Group button */}
        {activeTab === "groups" && (
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm w-full gap-2 mt-2">
            <Plus className="size-4" />
            <span className="hidden lg:inline">New Group</span>
          </button>
        )}
      </div>

      {/* ── List ────────────────────────────────────────────── */}
      <div className="overflow-y-auto w-full py-3">
        {activeTab === "chats" ? (
          filteredUsers.length === 0 ? (
            <div className="text-center text-zinc-500 py-4">No online users</div>
          ) : (
            filteredUsers.map((user) => {
              const isOnline       = onlineUsers.includes(user._id);
              const unread         = unreadCounts[user._id] || 0;
              const lastSeen       = lastSeenMap[user._id] || user.lastSeen;
              const lastSeenLabel  = !isOnline ? formatLastSeen(lastSeen) : null;
              const hasMissedCall  = missedCallAlerts.some(
                (a) => a.fromId?.toString() === user._id?.toString()
              );
              const isSelected = selectedUser?._id === user._id;

              return (
                <button
                  key={user._id}
                  onClick={() => {
                    setSelectedUser(user);
                    if (unread > 0) clearUnreadCount(user._id);
                  }}
                  className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                    isSelected ? "bg-base-300 ring-1 ring-base-300" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative mx-auto lg:mx-0 flex-shrink-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-12 object-cover rounded-full"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
                    )}
                    {/* Unread badge */}
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-content text-[10px] font-bold flex items-center justify-center ring-2 ring-base-100">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>

                  {/* Text info */}
                  <div className="hidden lg:block text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium truncate">{user.fullName}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Friendship badge */}
                        <FriendshipBadge
                          status={user.friendshipStatus}
                          direction={user.friendRequestDirection}
                        />
                        {/* Missed call icon */}
                        {hasMissedCall && (
                          <span className="text-warning" title="Missed call">
                            <PhoneMissed size={13} />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400 truncate">
                      {isOnline
                        ? "Online"
                        : lastSeenLabel
                          ? `Last seen ${lastSeenLabel}`
                          : "Offline"
                      }
                    </div>
                  </div>
                </button>
              );
            })
          )
        ) : activeTab === "groups" ? (
          /* Groups list */
          groups.length === 0 ? (
            <div className="text-center text-zinc-500 py-4">No groups yet</div>
          ) : (
            groups.map((group) => (
              <button
                key={group._id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors ${
                  selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""
                }`}
              >
                <div className="relative mx-auto lg:mx-0">
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="hidden lg:block text-left min-w-0">
                  <div className="font-medium truncate">{group.name}</div>
                  <div className="text-xs text-zinc-400">{group.members.length} members</div>
                </div>
              </button>
            ))
          )
        ) : (
          /* ── Requests tab ─────────────────────────────────── */
          pendingRequests.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="text-4xl mb-3">🤝</div>
              <p className="text-zinc-500 text-sm">No pending requests</p>
              <p className="text-zinc-400 text-xs mt-1">
                When someone sends you a friend request, it will appear here
              </p>
            </div>
          ) : (
            pendingRequests.map((request) => {
              const sender = request.senderId;
              return (
                <div
                  key={request._id}
                  className="w-full p-3 flex items-center gap-3 border-b border-base-200 last:border-0"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <img
                      src={sender?.profilePic || "/avatar.png"}
                      alt={sender?.fullName || "User"}
                      className="size-12 object-cover rounded-full"
                    />
                  </div>

                  {/* Info + buttons */}
                  <div className="hidden lg:flex flex-col flex-1 min-w-0 gap-1.5">
                    <span className="font-medium text-sm truncate">
                      {sender?.fullName || "Unknown User"}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request._id)}
                        className="btn btn-xs btn-success gap-1 flex-1"
                      >
                        <Check size={12} /> Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request._id)}
                        className="btn btn-xs btn-ghost gap-1 flex-1"
                      >
                        <X size={12} /> Decline
                      </button>
                    </div>
                  </div>

                  {/* Mobile: compact buttons */}
                  <div className="lg:hidden flex flex-col gap-1">
                    <button
                      onClick={() => handleAcceptRequest(request._id)}
                      className="btn btn-xs btn-circle btn-success"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request._id)}
                      className="btn btn-xs btn-circle btn-ghost"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {isModalOpen && <CreateGroupModal onClose={() => setIsModalOpen(false)} />}
    </aside>
  );
};

export default Sidebar;
