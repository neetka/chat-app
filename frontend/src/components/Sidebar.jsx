import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

const Sidebar = () => {
  const { 
    getUsers, 
    users, 
    selectedUser, 
    setSelectedUser, 
    isUsersLoading,
    getGroups,
    groups,
    selectedGroup,
    setSelectedGroup,
    isGroupsLoading
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("chats"); // "chats" or "groups"
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      
      {/* Header */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-base-200 p-1 rounded-lg mb-4">
             <button 
                className={`flex-1 flex items-center justify-center py-1 text-sm rounded-md transition-colors ${activeTab === 'chats' ? 'bg-white text-primary shadow-sm' : 'text-base-content/60 hover:text-base-content'}`}
                onClick={() => setActiveTab('chats')}
             >
                Chats
             </button>
             <button 
                className={`flex-1 flex items-center justify-center py-1 text-sm rounded-md transition-colors ${activeTab === 'groups' ? 'bg-white text-primary shadow-sm' : 'text-base-content/60 hover:text-base-content'}`}
                onClick={() => setActiveTab('groups')}
             >
                Groups
             </button>
        </div>

        {/* Online Filter (Only for Chats) */}
        {activeTab === 'chats' && (
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
        
        {/* Create Group Button */}
        {activeTab === 'groups' && (
            <button 
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary btn-sm w-full gap-2 mt-2"
            >
                <Plus className="size-4" />
                <span className="hidden lg:inline">New Group</span>
            </button>
        )}
      </div>

      <div className="overflow-y-auto w-full py-3">
        {activeTab === 'chats' ? (
            // Users List
            filteredUsers.length === 0 ? (
                <div className="text-center text-zinc-500 py-4">No online users</div>
            ) : (
                filteredUsers.map((user) => (
                <button
                    key={user._id}
                    onClick={() => setSelectedUser(user)}
                    className={`
                    w-full p-3 flex items-center gap-3
                    hover:bg-base-300 transition-colors
                    ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                    `}
                >
                    <div className="relative mx-auto lg:mx-0">
                    <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="size-12 object-cover rounded-full"
                    />
                    {onlineUsers.includes(user._id) && (
                        <span
                        className="absolute bottom-0 right-0 size-3 bg-green-500 
                        rounded-full ring-2 ring-zinc-900"
                        />
                    )}
                    </div>

                    <div className="hidden lg:block text-left min-w-0">
                    <div className="font-medium truncate">{user.fullName}</div>
                    <div className="text-sm text-zinc-400">
                        {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                    </div>
                    </div>
                </button>
                ))
            )
        ) : (
            // Groups List
            groups.length === 0 ? (
                <div className="text-center text-zinc-500 py-4">No groups yet</div>
            ) : (
                groups.map((group) => (
                    <button
                        key={group._id}
                        onClick={() => setSelectedGroup(group)}
                        className={`
                        w-full p-3 flex items-center gap-3
                        hover:bg-base-300 transition-colors
                        ${selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                        `}
                    >
                        <div className="relative mx-auto lg:mx-0">
                            {/* Group Avatar Placeholder */}
                           <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                               {group.name.charAt(0).toUpperCase()}
                           </div>
                        </div>

                        <div className="hidden lg:block text-left min-w-0">
                        <div className="font-medium truncate">{group.name}</div>
                        <div className="text-xs text-zinc-400">
                            {group.members.length} members
                        </div>
                        </div>
                    </button>
                ))
            )
        )}
      </div>
      
      {isModalOpen && <CreateGroupModal onClose={() => setIsModalOpen(false)} />}
    </aside>
  );
};
export default Sidebar;
