import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import {
  Camera, Mail, User, Calendar, Shield, Edit3, CheckCircle,
  X, Eye, EyeOff, Trash2, AlertTriangle, Loader2,
  MessageSquare, Phone, PhoneMissed, Plus, Zap, Heart,
} from "lucide-react";

// ── Reusable sub-components ──────────────────────────────────────────────────

const TagChip = ({ label, onRemove, variant = "primary" }) => {
  const styles = {
    primary:   "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${styles[variant]}`}>
      {label}
      {onRemove && (
        <button onClick={onRemove} className="opacity-60 hover:opacity-100 transition-opacity">
          <X size={10} />
        </button>
      )}
    </span>
  );
};

const TagInputRow = ({ placeholder, value, onChange, onAdd, disabled }) => (
  <div className="flex gap-2">
    <input
      type="text"
      className="input input-bordered input-sm flex-1"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); onAdd(); } }}
      disabled={disabled}
    />
    <button className="btn btn-sm btn-ghost" onClick={onAdd} disabled={disabled || !value.trim()}>
      <Plus size={14} />
    </button>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile, changePassword, deleteAccount } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  // Modal visibility
  const [showEditModal,     setShowEditModal]     = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal,   setShowDeleteModal]   = useState(false);

  // Basic form state
  const [editName,          setEditName]          = useState(authUser?.fullName || "");
  const [currentPassword,   setCurrentPassword]   = useState("");
  const [newPassword,       setNewPassword]       = useState("");
  const [confirmPassword,   setConfirmPassword]   = useState("");
  const [showCurrentPass,   setShowCurrentPass]   = useState(false);
  const [showNewPass,       setShowNewPass]       = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Profile enrichment state
  const [editBio,       setEditBio]       = useState(authUser?.bio || "");
  const [editSkills,    setEditSkills]    = useState([...(authUser?.skills    || [])]);
  const [editInterests, setEditInterests] = useState([...(authUser?.interests || [])]);
  const [skillInput,    setSkillInput]    = useState("");
  const [interestInput, setInterestInput] = useState("");

  // Loading flags
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount,  setIsDeletingAccount]  = useState(false);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      setSelectedImg(reader.result);
      await updateProfile({ profilePic: reader.result });
    };
  };

  const openEditModal = () => {
    setEditName(authUser?.fullName || "");
    setEditBio(authUser?.bio || "");
    setEditSkills([...(authUser?.skills    || [])]);
    setEditInterests([...(authUser?.interests || [])]);
    setSkillInput(""); setInterestInput("");
    setShowEditModal(true);
  };

  const handleEditProfile = async () => {
    if (!editName.trim()) return;
    const success = await updateProfile({
      fullName: editName.trim(),
      bio: editBio,
      skills: editSkills,
      interests: editInterests,
    });
    if (success) setShowEditModal(false);
  };

  const addTag = (input, list, setList, setInput) => {
    const tag = input.trim().replace(/,$/, "");
    if (!tag || list.includes(tag) || list.length >= 10) return;
    setList([...list, tag]);
    setInput("");
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return;
    setIsChangingPassword(true);
    const ok = await changePassword({ currentPassword, newPassword });
    setIsChangingPassword(false);
    if (ok) { setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeletingAccount(true);
    await deleteAccount();
    setIsDeletingAccount(false);
  };

  const memberSince = authUser.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  return (
    <div className="min-h-screen pt-20 pb-10 bg-gradient-to-br from-base-100 via-base-100 to-base-200">
      <div className="max-w-4xl mx-auto px-4 space-y-6">

        {/* ── Header card ──────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-2xl p-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 sm:size-36 rounded-full object-cover ring-4 ring-base-100 shadow-xl"
              />
              <span className="absolute bottom-2 right-2 size-5 bg-green-500 rounded-full ring-4 ring-base-100" />
              <label
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 bg-primary hover:bg-primary-focus p-3 rounded-full cursor-pointer shadow-lg transition-all duration-300 hover:scale-110 ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
              >
                <Camera className="w-5 h-5 text-primary-content" />
                <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUpdatingProfile} />
              </label>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-bold">{authUser?.fullName}</h1>
              <p className="text-base-content/60 mt-1 flex items-center justify-center sm:justify-start gap-2">
                <Mail size={16} />{authUser?.email}
              </p>
              {authUser?.bio && (
                <p className="text-sm text-base-content/70 mt-2 max-w-sm italic">{authUser.bio}</p>
              )}
              {isUpdatingProfile && (
                <p className="text-sm text-primary mt-2 animate-pulse">Updating profile picture…</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Info grid ─────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="text-primary" size={22} />Personal Information
              </h2>
              <button className="btn btn-ghost btn-sm btn-circle" onClick={openEditModal}><Edit3 size={16} /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Full Name",     value: authUser?.fullName, icon: User },
                { label: "Email Address", value: authUser?.email,    icon: Mail },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="group">
                  <label className="text-sm text-base-content/60 mb-1 block">{label}</label>
                  <div className="flex items-center gap-3 p-4 bg-base-200/50 rounded-xl border border-base-300 group-hover:border-primary/30 transition-colors">
                    <Icon size={18} className="text-base-content/40" />
                    <span className="font-medium">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <Shield className="text-secondary" size={22} />Account Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-base-200/50 rounded-xl border border-base-300">
                <div className="p-2 bg-primary/10 rounded-lg"><Calendar size={18} className="text-primary" /></div>
                <div><p className="text-sm text-base-content/60">Member Since</p><p className="font-medium">{memberSince}</p></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-xl border border-base-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle size={18} className="text-green-500" /></div>
                  <div><p className="text-sm text-base-content/60">Account Status</p><p className="font-medium text-green-500">Active</p></div>
                </div>
                <span className="size-3 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="flex items-center gap-3 p-4 bg-base-200/50 rounded-xl border border-base-300">
                <div className="p-2 bg-secondary/10 rounded-lg"><Shield size={18} className="text-secondary" /></div>
                <div><p className="text-sm text-base-content/60">Security</p><p className="font-medium">Password Protected</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bio & Skills/Interests grid ───────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* About Me */}
          <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="text-accent" size={22} />About Me
              </h2>
              <button className="btn btn-ghost btn-sm btn-circle" onClick={openEditModal}><Edit3 size={16} /></button>
            </div>
            {authUser?.bio
              ? <p className="text-base-content/80 leading-relaxed text-sm">{authUser.bio}</p>
              : <p className="text-base-content/30 italic text-sm">No bio yet. Click edit to add one.</p>
            }
          </div>

          {/* Skills & Interests */}
          <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Zap className="text-primary" size={22} />Skills &amp; Interests
              </h2>
              <button className="btn btn-ghost btn-sm btn-circle" onClick={openEditModal}><Edit3 size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-base-content/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Zap size={10} className="text-primary" />Skills
                </p>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {authUser?.skills?.length > 0
                    ? authUser.skills.map((s) => <TagChip key={s} label={s} variant="primary" />)
                    : <span className="text-xs text-base-content/30 italic">None added yet</span>}
                </div>
              </div>
              <div>
                <p className="text-xs text-base-content/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Heart size={10} className="text-secondary" />Interests
                </p>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {authUser?.interests?.length > 0
                    ? authUser.interests.map((i) => <TagChip key={i} label={i} variant="secondary" />)
                    : <span className="text-xs text-base-content/30 italic">None added yet</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-outline btn-sm gap-2" onClick={openEditModal}><Edit3 size={14} />Edit Profile</button>
            <button className="btn btn-outline btn-sm gap-2" onClick={() => setShowPasswordModal(true)}><Shield size={14} />Change Password</button>
            <button className="btn btn-outline btn-error btn-sm gap-2" onClick={() => setShowDeleteModal(true)}><Trash2 size={14} />Delete Account</button>
          </div>
        </div>
      </div>

      {/* ═══ Edit Profile Modal ══════════════════════════════════════════════ */}
      {showEditModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowEditModal(false)}><X size={20} /></button>
            <h3 className="font-bold text-lg mb-5">Edit Profile</h3>
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="label"><span className="label-text font-medium">Full Name</span></label>
                <input type="text" className="input input-bordered w-full" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" />
              </div>

              {/* Bio */}
              <div>
                <label className="label"><span className="label-text font-medium">Bio</span><span className="label-text-alt text-base-content/40">{editBio.length}/200</span></label>
                <textarea
                  className="textarea textarea-bordered w-full resize-none"
                  rows={3}
                  maxLength={200}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell people a little about yourself…"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="label">
                  <span className="label-text font-medium flex items-center gap-1"><Zap size={13} className="text-primary" />Skills</span>
                  <span className="label-text-alt text-base-content/40">{editSkills.length}/10</span>
                </label>
                <TagInputRow
                  placeholder="e.g. React, Design…"
                  value={skillInput}
                  onChange={setSkillInput}
                  onAdd={() => addTag(skillInput, editSkills, setEditSkills, setSkillInput)}
                  disabled={editSkills.length >= 10}
                />
                <div className="flex flex-wrap gap-1.5 mt-2 min-h-[28px]">
                  {editSkills.map((s, i) => (
                    <TagChip key={i} label={s} onRemove={() => setEditSkills(editSkills.filter((_, idx) => idx !== i))} variant="primary" />
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="label">
                  <span className="label-text font-medium flex items-center gap-1"><Heart size={13} className="text-secondary" />Interests</span>
                  <span className="label-text-alt text-base-content/40">{editInterests.length}/10</span>
                </label>
                <TagInputRow
                  placeholder="e.g. Gaming, Music…"
                  value={interestInput}
                  onChange={setInterestInput}
                  onAdd={() => addTag(interestInput, editInterests, setEditInterests, setInterestInput)}
                  disabled={editInterests.length >= 10}
                />
                <div className="flex flex-wrap gap-1.5 mt-2 min-h-[28px]">
                  {editInterests.map((s, i) => (
                    <TagChip key={i} label={s} onRemove={() => setEditInterests(editInterests.filter((_, idx) => idx !== i))} variant="secondary" />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditProfile} disabled={isUpdatingProfile || !editName.trim()}>
                {isUpdatingProfile ? <><Loader2 size={16} className="animate-spin" />Saving…</> : "Save Changes"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setShowEditModal(false)} />
        </div>
      )}

      {/* ═══ Change Password Modal ═══════════════════════════════════════════ */}
      {showPasswordModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowPasswordModal(false)}><X size={20} /></button>
            <h3 className="font-bold text-lg mb-4">Change Password</h3>
            <div className="space-y-4">
              {[
                { label: "Current Password", val: currentPassword, set: setCurrentPassword, show: showCurrentPass, toggle: () => setShowCurrentPass(!showCurrentPass) },
                { label: "New Password",     val: newPassword,     set: setNewPassword,     show: showNewPass,    toggle: () => setShowNewPass(!showNewPass) },
              ].map(({ label, val, set, show, toggle }) => (
                <div key={label}>
                  <label className="label"><span className="label-text">{label}</span></label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} className="input input-bordered w-full pr-10" value={val} onChange={(e) => set(e.target.value)} placeholder={`Enter ${label.toLowerCase()}`} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50" onClick={toggle}>
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              ))}
              <div>
                <label className="label"><span className="label-text">Confirm New Password</span></label>
                <input type="password" className="input input-bordered w-full" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                {confirmPassword && newPassword !== confirmPassword && <p className="text-error text-sm mt-1">Passwords do not match</p>}
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowPasswordModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleChangePassword} disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}>
                {isChangingPassword ? <><Loader2 size={16} className="animate-spin" />Changing…</> : "Change Password"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setShowPasswordModal(false)} />
        </div>
      )}

      {/* ═══ Delete Account Modal ════════════════════════════════════════════ */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowDeleteModal(false)}><X size={20} /></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-error/10 rounded-full"><AlertTriangle size={24} className="text-error" /></div>
              <h3 className="font-bold text-lg">Delete Account</h3>
            </div>
            <p className="text-base-content/70 mb-4">This action is <span className="text-error font-semibold">permanent</span> and cannot be undone. All your data will be deleted.</p>
            <div className="bg-error/5 border border-error/20 rounded-lg p-4">
              <p className="text-sm text-base-content/70 mb-2">Type <span className="font-mono font-bold text-error">DELETE</span> to confirm:</p>
              <input type="text" className="input input-bordered input-error w-full" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE" />
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-error" onClick={handleDeleteAccount} disabled={isDeletingAccount || deleteConfirmText !== "DELETE"}>
                {isDeletingAccount ? <><Loader2 size={16} className="animate-spin" />Deleting…</> : <><Trash2 size={16} />Delete Account</>}
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setShowDeleteModal(false)} />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
