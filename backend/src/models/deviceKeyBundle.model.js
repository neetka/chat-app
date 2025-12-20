import mongoose from "mongoose";

const oneTimePreKeySchema = new mongoose.Schema(
  {
    keyId: { type: String, required: true },
    publicKey: { type: String, required: true },
    used: { type: Boolean, default: false },
  },
  { _id: false }
);

const deviceKeyBundleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
    },
    bundleVersion: { type: Number, default: 1 },
    identityKey: {
      type: String,
      required: true,
    },
    signedPreKey: {
      publicKey: { type: String, required: true },
      signature: { type: String, required: true },
      expiresAt: { type: Date },
    },
    oneTimePreKeys: [oneTimePreKeySchema],
  },
  { timestamps: true }
);

deviceKeyBundleSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export default mongoose.model("DeviceKeyBundle", deviceKeyBundleSchema);

