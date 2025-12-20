import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import {
  Camera,
  Mail,
  User,
  Calendar,
  Shield,
  Edit3,
  CheckCircle,
  X,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const ProfilePage = () => {
  const {
    authUser,
    isUpdatingProfile,
    updateProfile,
    changePassword,
    deleteAccount,
  } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [editName, setEditName] = useState(authUser?.fullName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Loading states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleEditProfile = async () => {
    if (!editName.trim()) return;
    const success = await updateProfile({ fullName: editName.trim() });
    if (success) {
      setShowEditModal(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      return;
    }
    setIsChangingPassword(true);
    const success = await changePassword({
      currentPassword,
      newPassword,
    });
    setIsChangingPassword(false);
    if (success) {
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeletingAccount(true);
    await deleteAccount();
    setIsDeletingAccount(false);
  };

  const memberSince = authUser.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gradient-to-br from-base-100 via-base-100 to-base-200">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header Card with Avatar */}
        <div className="relative bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-2xl p-8 mb-6 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Section */}
            <div className="relative group">
              <div className="relative">
                <img
                  src={selectedImg || authUser.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="size-32 sm:size-36 rounded-full object-cover ring-4 ring-base-100 shadow-xl"
                />
                {/* Online indicator */}
                <span className="absolute bottom-2 right-2 size-5 bg-green-500 rounded-full ring-4 ring-base-100" />
              </div>
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-primary hover:bg-primary-focus
                  p-3 rounded-full cursor-pointer shadow-lg
                  transition-all duration-300 hover:scale-110
                  ${
                    isUpdatingProfile ? "animate-pulse pointer-events-none" : ""
                  }
                `}
              >
                <Camera className="w-5 h-5 text-primary-content" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>

            {/* User Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-bold">{authUser?.fullName}</h1>
              <p className="text-base-content/60 mt-1 flex items-center justify-center sm:justify-start gap-2">
                <Mail size={16} />
                {authUser?.email}
              </p>
              {isUpdatingProfile && (
                <p className="text-sm text-primary mt-2 animate-pulse">
                  Updating profile picture...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Information Card */}
          <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="text-primary" size={22} />
                Personal Information
              </h2>
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => {
                  setEditName(authUser?.fullName || "");
                  setShowEditModal(true);
                }}
              >
                <Edit3 size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="group">
                <label className="text-sm text-base-content/60 mb-1 block">
                  Full Name
                </label>
                <div className="flex items-center gap-3 p-4 bg-base-200/50 rounded-xl border border-base-300 group-hover:border-primary/30 transition-colors">
                  <User size={18} className="text-base-content/40" />
                  <span className="font-medium">{authUser?.fullName}</span>
                </div>
              </div>

              <div className="group">
                <label className="text-sm text-base-content/60 mb-1 block">
                  Email Address
                </label>
                <div className="flex items-center gap-3 p-4 bg-base-200/50 rounded-xl border border-base-300 group-hover:border-primary/30 transition-colors">
                  <Mail size={18} className="text-base-content/40" />
                  <span className="font-medium">{authUser?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information Card */}
          <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <Shield className="text-secondary" size={22} />
              Account Details
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-xl border border-base-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Member Since</p>
                    <p className="font-medium">{memberSince}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-xl border border-base-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle size={18} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">
                      Account Status
                    </p>
                    <p className="font-medium text-green-500">Active</p>
                  </div>
                </div>
                <span className="size-3 bg-green-500 rounded-full animate-pulse" />
              </div>

              <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-xl border border-base-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Shield size={18} className="text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Security</p>
                    <p className="font-medium">Password Protected</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn btn-outline btn-sm gap-2"
              onClick={() => {
                setEditName(authUser?.fullName || "");
                setShowEditModal(true);
              }}
            >
              <Edit3 size={14} />
              Edit Profile
            </button>
            <button
              className="btn btn-outline btn-sm gap-2"
              onClick={() => setShowPasswordModal(true)}
            >
              <Shield size={14} />
              Change Password
            </button>
            <button
              className="btn btn-outline btn-error btn-sm gap-2"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={14} />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowEditModal(false)}
            >
              <X size={20} />
            </button>
            <h3 className="font-bold text-lg mb-4">Edit Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Full Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEditProfile}
                disabled={isUpdatingProfile || !editName.trim()}
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/50"
            onClick={() => setShowEditModal(false)}
          />
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowPasswordModal(false)}
            >
              <X size={20} />
            </button>
            <h3 className="font-bold text-lg mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Current Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className="input input-bordered w-full pr-10"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">New Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="input input-bordered w-full pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Confirm New Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-error text-sm mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowPasswordModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={
                  isChangingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  newPassword !== confirmPassword ||
                  newPassword.length < 6
                }
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/50"
            onClick={() => setShowPasswordModal(false)}
          />
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setShowDeleteModal(false)}
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-error/10 rounded-full">
                <AlertTriangle size={24} className="text-error" />
              </div>
              <h3 className="font-bold text-lg">Delete Account</h3>
            </div>
            <div className="space-y-4">
              <p className="text-base-content/70">
                This action is{" "}
                <span className="text-error font-semibold">permanent</span> and
                cannot be undone. All your data, messages, and profile
                information will be permanently deleted.
              </p>
              <div className="bg-error/5 border border-error/20 rounded-lg p-4">
                <p className="text-sm text-base-content/70 mb-2">
                  Type{" "}
                  <span className="font-mono font-bold text-error">DELETE</span>{" "}
                  to confirm:
                </p>
                <input
                  type="text"
                  className="input input-bordered input-error w-full"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                />
              </div>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmText !== "DELETE"}
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          />
        </div>
      )}
    </div>
  );
};
export default ProfilePage;
