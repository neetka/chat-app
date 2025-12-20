import { generateKeyPair as generateEd25519KeyPair, sign } from "@stablelib/ed25519";
import {
  generateKeyPair as generateX25519KeyPair,
  sharedKey as x25519,
} from "@stablelib/x25519";
import { randomBytes } from "@stablelib/random";
import { axiosInstance } from "./axios";
import { getDeviceKeys, setDeviceKeys } from "./storage";

const toBase64 = (bytes) =>
  btoa(String.fromCharCode.apply(null, Array.from(bytes)));

const fromBase64 = (str) => {
  if (!str || typeof str !== 'string') {
    throw new Error(`Invalid Base64 input: expected string, got ${typeof str}`);
  }
  try {
    return new Uint8Array(atob(str).split("").map((c) => c.charCodeAt(0)));
  } catch (error) {
    throw new Error(`Failed to decode Base64 string: ${error.message}. Input: ${str.substring(0, 20)}...`);
  }
};

const generateKeyId = () => crypto.randomUUID();

export const loadStoredDevice = async (userId) => {
  const device = await getDeviceKeys(userId);
  if (!device) return null;
  
  // Validate that required fields exist and are strings (Base64 encoded)
  const requiredFields = [
    'identity.secretKey',
    'identity.publicKey',
    'signedPreKey.secretKey',
    'signedPreKey.publicKey',
  ];
  
  for (const field of requiredFields) {
    const keys = field.split('.');
    let value = device;
    for (const key of keys) {
      value = value?.[key];
    }
    if (!value || typeof value !== 'string') {
      console.warn(`Corrupted device key detected: ${field} is missing or invalid. Regenerating device...`);
      // Clear corrupted device and return null to trigger regeneration
      await setDeviceKeys(userId, null);
      return null;
    }
  }
  
  return device;
};

export const storeDevice = async (userId, data) => {
  await setDeviceKeys(userId, data);
};

export const generateDeviceBundle = () => {
  // Identity key now uses X25519 for DH; we still keep an Ed25519 key to sign the signed pre-key
  const identityDh = generateX25519KeyPair();
  const identitySig = generateEd25519KeyPair();

  const signedPre = generateX25519KeyPair();
  const signature = sign(identitySig.secretKey, signedPre.publicKey);

  const oneTimePreKeys = Array.from({ length: 20 }).map(() => {
    const key = generateX25519KeyPair();
    return {
      keyId: generateKeyId(),
      publicKey: toBase64(key.publicKey),
      secretKey: toBase64(key.secretKey),
    };
  });

  return {
    deviceId: generateKeyId(),
    identity: {
      publicKey: toBase64(identityDh.publicKey),
      secretKey: toBase64(identityDh.secretKey),
    },
    identitySignature: {
      publicKey: toBase64(identitySig.publicKey),
      secretKey: toBase64(identitySig.secretKey),
    },
    signedPreKey: {
      publicKey: toBase64(signedPre.publicKey),
      secretKey: toBase64(signedPre.secretKey),
      signature: toBase64(signature),
    },
    oneTimePreKeys,
  };
};

export const ensureDeviceRegistration = async (userId) => {
  const existing = await loadStoredDevice(userId);
  if (existing?.deviceId) {
    return existing;
  }

  const bundle = generateDeviceBundle();

  const payload = {
    deviceId: bundle.deviceId,
    identityKey: bundle.identity.publicKey,
    signedPreKey: {
      publicKey: bundle.signedPreKey.publicKey,
      signature: bundle.signedPreKey.signature,
    },
    oneTimePreKeys: bundle.oneTimePreKeys.map((pk) => ({
      keyId: pk.keyId,
      publicKey: pk.publicKey,
    })),
  };

  await axiosInstance.post("/keys/devices", payload);

  await storeDevice(userId, {
    deviceId: bundle.deviceId,
    identity: bundle.identity,
    signedPreKey: bundle.signedPreKey,
    oneTimePreKeys: bundle.oneTimePreKeys,
  });

  return loadStoredDevice(userId);
};

export const fetchPreKeyBundle = async (userId) => {
  const res = await axiosInstance.get(`/keys/bundle/${userId}`);
  return res.data;
};

export const topUpPreKeys = async (userId) => {
  const stored = await loadStoredDevice(userId);
  if (!stored) throw new Error("No stored device");

  const newKeys = Array.from({ length: 20 }).map(() => {
    const kp = generateX25519KeyPair();
    return {
      keyId: generateKeyId(),
      publicKey: toBase64(kp.publicKey),
      secretKey: toBase64(kp.secretKey),
    };
  });

  await axiosInstance.post("/keys/prekeys", {
    deviceId: stored.deviceId,
    oneTimePreKeys: newKeys.map((k) => ({
      keyId: k.keyId,
      publicKey: k.publicKey,
    })),
  });

  const updated = {
    ...stored,
    oneTimePreKeys: [...stored.oneTimePreKeys, ...newKeys],
  };
  await storeDevice(userId, updated);
  return updated;
};

