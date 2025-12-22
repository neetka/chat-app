import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { X, Check, Users } from "lucide-react";
import toast from "react-hot-toast";

const CreateGroupModal = ({ onClose }) => {
  const { users, createGroup } = useChatStore();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return toast.error("Group name is required");
    if (selectedMembers.length === 0) return toast.error("Select at least one member");

    setIsSubmitting(true);
    const success = await createGroup({
      name: groupName,
      members: selectedMembers,
    });
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const toggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-base-content/50 hover:text-base-content"
        >
          <X className="size-5" />
        </button>

        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Users className="size-6 text-primary" />
          Create Group
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Group Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Weekend Trip Support"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Add Members</span>
              <span className="label-text-alt">{selectedMembers.length} selected</span>
            </label>
            <div className="max-h-48 overflow-y-auto border border-base-300 rounded-lg divide-y divide-base-200">
              {users.map((user) => (
                <label
                  key={user._id}
                  className="flex items-center gap-3 p-3 hover:bg-base-200 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={selectedMembers.includes(user._id)}
                    onChange={() => toggleMember(user._id)}
                  />
                  <div className="flex items-center gap-2">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-8 rounded-full object-cover"
                    />
                    <span className="font-medium text-sm">{user.fullName}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Group"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
