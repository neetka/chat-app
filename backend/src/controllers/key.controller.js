import crypto from "crypto";
import DeviceKeyBundle from "../models/deviceKeyBundle.model.js";

const MAX_ONE_TIME_PREKEYS = 200;

export const registerDevice = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      deviceId,
      identityKey,
      signedPreKey,
      oneTimePreKeys = [],
      bundleVersion = 1,
    } = req.body;

    if (!identityKey || !signedPreKey?.publicKey || !signedPreKey?.signature) {
      return res
        .status(400)
        .json({ message: "identityKey and signedPreKey are required" });
    }

    const normalizedDeviceId = deviceId || crypto.randomUUID();

    if (oneTimePreKeys.length > MAX_ONE_TIME_PREKEYS) {
      return res.status(400).json({
        message: `Too many one-time pre-keys (max ${MAX_ONE_TIME_PREKEYS})`,
      });
    }

    const existing = await DeviceKeyBundle.findOne({
      userId,
      deviceId: normalizedDeviceId,
    });

    if (existing) {
      return res.status(409).json({ message: "Device already registered" });
    }

    const bundle = await DeviceKeyBundle.create({
      userId,
      deviceId: normalizedDeviceId,
      identityKey,
      signedPreKey,
      oneTimePreKeys,
      bundleVersion,
      status: "active",
    });

    res.status(201).json({
      deviceId: bundle.deviceId,
      bundleVersion: bundle.bundleVersion,
      oneTimePreKeyCount: bundle.oneTimePreKeys.length,
    });
  } catch (error) {
    console.error("Error in registerDevice:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchBundle = async (req, res) => {
  try {
    const { userId } = req.params;

    const bundle = await DeviceKeyBundle.findOne({
      userId,
      status: "active",
      oneTimePreKeys: { $elemMatch: { used: false } },
    }).sort({ updatedAt: -1 });

    if (!bundle) {
      return res.status(404).json({ message: "No available bundle" });
    }

    const nextPreKey = bundle.oneTimePreKeys.find((pk) => !pk.used);
    if (!nextPreKey) {
      return res.status(404).json({ message: "No one-time pre-keys left" });
    }

    nextPreKey.used = true;
    bundle.bundleVersion += 1;
    await bundle.save();

    res.status(200).json({
      userId: bundle.userId,
      deviceId: bundle.deviceId,
      bundleVersion: bundle.bundleVersion,
      identityKey: bundle.identityKey,
      signedPreKey: bundle.signedPreKey,
      oneTimePreKey: {
        keyId: nextPreKey.keyId,
        publicKey: nextPreKey.publicKey,
      },
    });
  } catch (error) {
    console.error("Error in fetchBundle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const topUpPreKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    const { deviceId, oneTimePreKeys = [] } = req.body;

    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }

    if (!Array.isArray(oneTimePreKeys) || oneTimePreKeys.length === 0) {
      return res.status(400).json({ message: "oneTimePreKeys required" });
    }

    const bundle = await DeviceKeyBundle.findOne({
      userId,
      deviceId,
      status: "active",
    });

    if (!bundle) {
      return res.status(404).json({ message: "Device not found" });
    }

    const currentCount = bundle.oneTimePreKeys.filter((pk) => !pk.used).length;
    if (currentCount + oneTimePreKeys.length > MAX_ONE_TIME_PREKEYS) {
      return res.status(400).json({
        message: `Exceeds maximum one-time pre-keys (${MAX_ONE_TIME_PREKEYS})`,
      });
    }

    bundle.oneTimePreKeys.push(...oneTimePreKeys);
    bundle.bundleVersion += 1;
    await bundle.save();

    res.status(200).json({
      deviceId: bundle.deviceId,
      bundleVersion: bundle.bundleVersion,
      oneTimePreKeyCount: bundle.oneTimePreKeys.filter((pk) => !pk.used).length,
    });
  } catch (error) {
    console.error("Error in topUpPreKeys:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const revokeDevice = async (req, res) => {
  try {
    const userId = req.user._id;
    const { deviceId } = req.params;

    const bundle = await DeviceKeyBundle.findOne({
      userId,
      deviceId,
      status: "active",
    });

    if (!bundle) {
      return res.status(404).json({ message: "Device not found" });
    }

    bundle.status = "revoked";
    bundle.bundleVersion += 1;
    await bundle.save();

    res.status(200).json({
      deviceId: bundle.deviceId,
      status: bundle.status,
      bundleVersion: bundle.bundleVersion,
    });
  } catch (error) {
    console.error("Error in revokeDevice:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

