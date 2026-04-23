import mongoose from "mongoose";

const missedCallNotificationSchema = new mongoose.Schema(
  {
    fromId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fromName: { type: String, default: "" },
    fromPic:  { type: String, default: "" },
    callType: { type: String, enum: ["voice", "video"], default: "voice" },
    at:       { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email:    { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true, minlength: 6 },
    profilePic: { type: String, default: "" },

    // ── Profile ──────────────────────────────────────────────
    bio:       { type: String, default: "", maxlength: 200 },
    skills:    { type: [String], default: [] },
    interests: { type: [String], default: [] },

    // ── Activity Stats ────────────────────────────────────────
    stats: {
      messagesSent: { type: Number, default: 0 },
      callsDone:    { type: Number, default: 0 },
      callsMissed:  { type: Number, default: 0 },
    },

    // ── Last Seen ────────────────────────────────────────────
    lastSeen: { type: Date, default: null },

    // ── Missed Call Notifications (cleared on next login) ────
    missedCallNotifications: {
      type: [missedCallNotificationSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;