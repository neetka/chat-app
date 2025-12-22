import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { X, Search, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

const AddMemberModal = ({ isOpen, onClose, groupId, currentMembers }) => {
  const { getUsers, users, addMemberToGroup } = useChatStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        getUsers();
    }
  }, [isOpen, getUsers]);

  if (!isOpen) return null;

  // Filter out users who are already members
  const availableUsers = users.filter(user => {
      // Check if user is already in currentMembers
      const isMember = currentMembers.some(member => member._id === user._id);
      
      // Also filter by search term
      const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      
      return !isMember && matchesSearch;
  });

  const handleAddMember = async (userId) => {
      setIsLoading(true);
      const success = await addMemberToGroup(groupId, userId);
      setIsLoading(false);
      if (success) {
          // Keep modal open to add more? Or close? User choice.
          // Let's keep open but maybe show success?
          // Actually usually better to keep open or just let user click 'X'.
          // But the list will update (remove the added user) because we update selectedGroup which updates currentMembers
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200/50">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            Add Members
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
            
            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/50" />
                <input
                    type="text"
                    placeholder="Search users..."
                    className="input input-bordered w-full pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto space-y-2">
                {availableUsers.length === 0 ? (
                    <div className="text-center p-4 text-base-content/50">
                        No available users found
                    </div>
                ) : (
                    availableUsers.map(user => (
                        <div key={user._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 transition-colors border border-transparent hover:border-base-300">
                            <div className="flex items-center gap-3">
                                <img src={user.profilePic || "/avatar.png"} alt={user.fullName} className="size-10 rounded-full object-cover" />
                                <div className="font-medium">{user.fullName}</div>
                            </div>
                            <button 
                                onClick={() => handleAddMember(user._id)}
                                disabled={isLoading}
                                className="btn btn-sm btn-primary btn-outline"
                            >
                                <UserPlus className="size-4" />
                                Add
                            </button>
                        </div>
                    ))
                )}
            </div>

        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
