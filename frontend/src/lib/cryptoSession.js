import { sharedKey as x25519, generateKeyPair as generateX25519KeyPair } from "@stablelib/x25519";
import { HKDF } from "@stablelib/hkdf";
import { SHA256 } from "@stablelib/sha256";
import { randomBytes } from "@stablelib/random";
import { axiosInstance } from "./axios";
import {
  fetchPreKeyBundle,
  loadStoredDevice,
  storeDevice,
  topUpPreKeys,
} from "./cryptoClient";
import { getSessions, setSessions } from "./storage";

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (str) => {
  // Handle null/undefined
  if (str == null) {
    throw new Error(`Invalid Base64 input: value is null or undefined`);
  }
  
  // If it's already a Uint8Array, return it
  if (str instanceof Uint8Array) {
    return str;
  }
  
  // If it's an object, try to extract a string value
  if (typeof str === 'object') {
    // If it has a toString method, use it
    if (typeof str.toString === 'function') {
      str = str.toString();
    } else {
      // Try common property names
      str = str.value || str.data || str.key || JSON.stringify(str);
    }
  }
  
  // Ensure it's a string
  if (typeof str !== 'string') {
    throw new Error(`Invalid Base64 input: expected string, got ${typeof str}. Value: ${JSON.stringify(str).substring(0, 50)}`);
  }
  
  try {
    return new Uint8Array(atob(str).split("").map((c) => c.charCodeAt(0)));
  } catch (error) {
    throw new Error(`Failed to decode Base64 string: ${error.message}. Input: ${str.substring(0, 20)}...`);
  }
};

const loadSessions = async (userId) => getSessions(userId);

const saveSessions = async (userId, sessions) => setSessions(userId, sessions);

const DEBUG_RATCHET =
  typeof import.meta !== "undefined" && import.meta.env.MODE !== "production";

const debugLog = (...args) => {
  if (!DEBUG_RATCHET) return;
  console.log(...args);
};

const logKey = (label, key) => {
  if (!DEBUG_RATCHET) return;
  // Only log a short prefix of the key to avoid leaking full material
  const prefix = toBase64(key).slice(0, 8);
  debugLog(`[crypto] ${label} prefix:`, prefix);
};

// Helper function to use HKDF class
const hkdf = (hash, key, salt, info, length) => {
  const hkdfInstance = new HKDF(hash, key, salt, info);
  const result = hkdfInstance.expand(length);
  hkdfInstance.clean();
  return result;
};

const deriveRootAndChains = (secret, role) => {
  const salt = new Uint8Array(32);
  const root = hkdf(SHA256, secret, salt, new TextEncoder().encode("chatapp:x3dh:root"), 32);
  const sendInfo = new TextEncoder().encode(
    role === "initiator" ? "chatapp:x3dh:ck:send:init" : "chatapp:x3dh:ck:send:resp"
  );
  const recvInfo = new TextEncoder().encode(
    role === "initiator" ? "chatapp:x3dh:ck:recv:init" : "chatapp:x3dh:ck:recv:resp"
  );
  const sendKey = hkdf(SHA256, root, salt, sendInfo, 32);
  const recvKey = hkdf(SHA256, root, salt, recvInfo, 32);
  return { root, sendKey, recvKey };
};

const kdfRoot = (rootKey, dhOut) => {
  const salt = new Uint8Array(32);
  const out = hkdf(
    SHA256,
    dhOut,
    salt,
    new TextEncoder().encode("chatapp:dr:root"),
    64
  );
  const newRoot = out.slice(0, 32);
  const chainKey = out.slice(32);
  return { rootKey: newRoot, chainKey };
};

const kdfChain = (chainKey) => {
  const salt = new Uint8Array(32);
  const out = hkdf(
    SHA256,
    chainKey,
    salt,
    new TextEncoder().encode("chatapp:dr:chain"),
    64
  );
  const nextChainKey = out.slice(0, 32);
  const messageKey = out.slice(32);
  return { chainKey: nextChainKey, messageKey };
};

const makeInitialRatchetState = (root, sendKey, recvKey) => {
  const sendDh = generateX25519KeyPair();
  return {
    rootKey: toBase64(root),
    sendChainKey: toBase64(sendKey),
    recvChainKey: toBase64(recvKey),
    sendDh: {
      publicKey: toBase64(sendDh.publicKey),
      secretKey: toBase64(sendDh.secretKey),
    },
    recvDhPub: null,
    Ns: 0,
    Nr: 0,
    PNs: 0,
    skipped: {},
  };
};

const storeSession = async (me, peerId, session) => {
  const sessions = await loadSessions(me);
  sessions[peerId] = session;
  await saveSessions(me, sessions);
};

const dhRatchet = (state, remoteDhPubB64) => {
  logKey("ratchet step remote dh", fromBase64(remoteDhPubB64));
  state.PNs = state.Ns;
  state.Ns = 0;
  state.Nr = 0;

  const dh1 = x25519(fromBase64(state.sendDh.secretKey), fromBase64(remoteDhPubB64));
  const { rootKey: rk1, chainKey: recvCK } = kdfRoot(fromBase64(state.rootKey), dh1);

  const newSend = generateX25519KeyPair();
  const dh2 = x25519(newSend.secretKey, fromBase64(remoteDhPubB64));
  const { rootKey: rk2, chainKey: sendCK } = kdfRoot(rk1, dh2);

  state.rootKey = toBase64(rk2);
  state.recvChainKey = toBase64(recvCK);
  state.sendChainKey = toBase64(sendCK);
  state.sendDh = {
    publicKey: toBase64(newSend.publicKey),
    secretKey: toBase64(newSend.secretKey),
  };
  state.recvDhPub = remoteDhPubB64;

  logKey("ratchet new root", rk2);
  logKey("ratchet new sendCK", sendCK);
  logKey("ratchet new recvCK", recvCK);
};

const nextSendMessageKey = (state) => {
  const { chainKey, messageKey } = kdfChain(fromBase64(state.sendChainKey));
  state.sendChainKey = toBase64(chainKey);
  const n = state.Ns;
  state.Ns += 1;
  return { messageKey, header: { dh: state.sendDh.publicKey, pn: state.PNs, n } };
};

const skipMessageKeys = (state, untilN) => {
  const skipped = [];
  while (state.Nr < untilN) {
    const { chainKey, messageKey } = kdfChain(fromBase64(state.recvChainKey));
    state.recvChainKey = toBase64(chainKey);
    state.skipped[`${state.recvDhPub}:${state.Nr}`] = toBase64(messageKey);
    skipped.push(state.Nr);
    state.Nr += 1;
  }
  if (skipped.length) {
    debugLog("[crypto] stored skipped mks", skipped.join(","));
  }
};

const trySkipped = (state, header) => {
  const key = `${header.dh}:${header.n}`;
  const mk = state.skipped[key];
  if (mk) {
    delete state.skipped[key];
    return fromBase64(mk);
  }
  return null;
};

const nextRecvMessageKey = (state, header) => {
  // If recvDhPub is null, this is the first message - set it
  if (!state.recvDhPub && header.dh) {
    state.recvDhPub = header.dh;
    state.Nr = 0;
  }
  
  // If the DH key changed, perform a ratchet step
  if (header.dh !== state.recvDhPub) {
    dhRatchet(state, header.dh);
  }
  
  // Skip any messages we missed
  skipMessageKeys(state, header.n);
  
  // Derive the message key for this message
  const { chainKey, messageKey } = kdfChain(fromBase64(state.recvChainKey));
  state.recvChainKey = toBase64(chainKey);
  state.Nr += 1;
  return messageKey;
};

const aesImport = (rawKey) =>
  crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

const validateRatchetState = (state) => {
  if (!state) return false;
  // Check that all required string fields are actually strings
  const stringFields = ['rootKey', 'sendChainKey', 'recvChainKey'];
  for (const field of stringFields) {
    if (!state[field] || typeof state[field] !== 'string') {
      return false;
    }
  }
  // Check sendDh structure
  if (!state.sendDh || typeof state.sendDh !== 'object') {
    return false;
  }
  if (typeof state.sendDh.publicKey !== 'string' || typeof state.sendDh.secretKey !== 'string') {
    return false;
  }
  return true;
};

export const ensureSessionWithPeer = async (me, peerId) => {
  const sessions = await loadSessions(me);
  if (sessions[peerId]) {
    // Validate the stored session has correct structure
    if (!validateRatchetState(sessions[peerId]?.ratchet)) {
      console.warn("Corrupted session detected, regenerating...");
      delete sessions[peerId];
      await saveSessions(me, sessions);
    } else {
      return { session: sessions[peerId], handshakePayload: null };
    }
  }

  const myDevice = await loadStoredDevice(me);
  if (!myDevice) throw new Error("No local device keys");

  const bundle = await fetchPreKeyBundle(peerId);
  
  // Validate bundle structure
  if (!bundle.signedPreKey || typeof bundle.signedPreKey.publicKey !== 'string') {
    throw new Error("Invalid bundle structure: signedPreKey.publicKey must be a string");
  }
  if (typeof bundle.identityKey !== 'string') {
    throw new Error("Invalid bundle structure: identityKey must be a string");
  }
  if (!bundle.oneTimePreKey || typeof bundle.oneTimePreKey.publicKey !== 'string') {
    throw new Error("Invalid bundle structure: oneTimePreKey.publicKey must be a string");
  }
  
  const eph = generateX25519KeyPair();

  const dh1 = x25519(fromBase64(myDevice.identity.secretKey), fromBase64(bundle.signedPreKey.publicKey));
  const dh2 = x25519(fromBase64(eph.secretKey), fromBase64(bundle.identityKey));
  const dh3 = x25519(fromBase64(eph.secretKey), fromBase64(bundle.signedPreKey.publicKey));
  const dh4 = x25519(fromBase64(eph.secretKey), fromBase64(bundle.oneTimePreKey.publicKey));

  const concat = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
  concat.set(dh1, 0);
  concat.set(dh2, dh1.length);
  concat.set(dh3, dh1.length + dh2.length);
  concat.set(dh4, dh1.length + dh2.length + dh3.length);

  const { root, sendKey, recvKey } = deriveRootAndChains(concat, "initiator");
  logKey("initiator root", root);
  logKey("initiator sendKey", sendKey);
  logKey("initiator recvKey", recvKey);

  const ratchetState = makeInitialRatchetState(root, sendKey, recvKey);
  const session = {
    role: "initiator",
    peerDeviceId: bundle.deviceId,
    usedPreKeyId: bundle.oneTimePreKey.keyId,
    bundleVersion: bundle.bundleVersion,
    handshake: {
      ephPubKey: toBase64(eph.publicKey),
      identityKey: myDevice.identity.publicKey,
      usedPreKeyId: bundle.oneTimePreKey.keyId,
    },
    ratchet: ratchetState,
  };

  await storeSession(me, peerId, session);

  return { session, handshakePayload: session.handshake };
};

const buildResponderSession = async (me, peerId, handshake, ratchetHeader) => {
  const sessions = await loadSessions(me);
  if (sessions[peerId]) return sessions[peerId];

  const myDevice = await loadStoredDevice(me);
  if (!myDevice) throw new Error("No local device keys");

  if (!handshake || !handshake.usedPreKeyId) {
    throw new Error("Invalid handshake: missing usedPreKeyId");
  }
  if (!handshake.identityKey || !handshake.ephPubKey) {
    throw new Error("Invalid handshake: missing identityKey or ephPubKey");
  }

  const preKey = myDevice.oneTimePreKeys.find((pk) => pk.keyId === handshake.usedPreKeyId);
  if (!preKey) {
    console.error("[crypto] Available pre-key IDs:", myDevice.oneTimePreKeys.map(pk => pk.keyId));
    throw new Error(`One-time pre-key not found/expired. Looking for: ${handshake.usedPreKeyId}`);
  }
  if (preKey.used) {
    throw new Error("One-time pre-key already used");
  }

  const dh1 = x25519(fromBase64(myDevice.signedPreKey.secretKey), fromBase64(handshake.identityKey));
  const dh2 = x25519(fromBase64(myDevice.identity.secretKey), fromBase64(handshake.ephPubKey));
  const dh3 = x25519(fromBase64(myDevice.signedPreKey.secretKey), fromBase64(handshake.ephPubKey));
  const dh4 = x25519(fromBase64(preKey.secretKey), fromBase64(handshake.ephPubKey));

  const concat = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
  concat.set(dh1, 0);
  concat.set(dh2, dh1.length);
  concat.set(dh3, dh1.length + dh2.length);
  concat.set(dh4, dh1.length + dh2.length + dh3.length);

  const { root, sendKey, recvKey } = deriveRootAndChains(concat, "responder");
  logKey("responder root", root);
  logKey("responder sendKey", sendKey);
  logKey("responder recvKey", recvKey);

  // mark pre-key as used locally
  preKey.used = true;
  await storeDevice(me, { ...myDevice });

  const ratchetState = makeInitialRatchetState(root, sendKey, recvKey);
  
  // For the first message, we need to set recvDhPub to the initiator's send DH public key
  // This must be set BEFORE processing the first message
  if (ratchetHeader?.dh) {
    ratchetState.recvDhPub = ratchetHeader.dh;
    // Also set the initial message number expectation
    // The initiator's first message will have n=0, so we should be ready to receive it
    ratchetState.Nr = 0;
  } else {
    throw new Error("Missing ratchet header DH key in first message");
  }

  const session = {
    role: "responder",
    peerDeviceId: null, // Not needed for responder
    usedPreKeyId: handshake.usedPreKeyId,
    handshake: null,
    ratchet: ratchetState,
  };

  await storeSession(me, peerId, session);
  return session;
};

const encryptAesGcm = async (rawKeyB64, plaintext) => {
  const key = await aesImport(fromBase64(rawKeyB64));
  const iv = randomBytes(12);
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  return { ciphertext: toBase64(new Uint8Array(ciphertext)), iv: toBase64(iv) };
};

const decryptAesGcm = async (rawKeyB64, ciphertextB64, ivB64) => {
  const key = await aesImport(fromBase64(rawKeyB64));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivB64) },
    key,
    fromBase64(ciphertextB64)
  );
  return new TextDecoder().decode(plaintext);
};

export const encryptForPeer = async (me, peerId, plaintext) => {
  const { session, handshakePayload } = await ensureSessionWithPeer(me, peerId);
  const { messageKey, header } = nextSendMessageKey(session.ratchet);
  const { ciphertext, iv } = await encryptAesGcm(toBase64(messageKey), plaintext);
  debugLog("[crypto] encryptForPeer ciphertext len", ciphertext.length);

  await storeSession(me, peerId, session);

  const combinedHandshake = handshakePayload
    ? { x3dh: handshakePayload, ratchet: header }
    : { ratchet: header };

  return { ciphertext, iv, handshake: combinedHandshake };
};

export const decryptFromPeer = async (me, peerId, payload) => {
  try {
    const sessions = await loadSessions(me);
    let session = sessions[peerId];

    if (!session && payload.handshake?.x3dh) {
      debugLog("[crypto] Building responder session for first message");
      try {
        session = await buildResponderSession(
          me,
          peerId,
          payload.handshake.x3dh,
          payload.handshake.ratchet
        );
        sessions[peerId] = session;
        await saveSessions(me, sessions);
        debugLog("[crypto] Responder session created successfully");
      } catch (error) {
        console.error("[crypto] Failed to build responder session:", error);
        throw new Error(`Failed to establish session: ${error.message}`);
      }
    }

    if (!session) {
      throw new Error("No session available to decrypt. Missing X3DH handshake data.");
    }

    const header = payload.handshake?.ratchet;
    if (!header) {
      throw new Error("Missing ratchet header in payload");
    }

    const maybeSkipped = trySkipped(session.ratchet, header);
    let messageKey;
    if (maybeSkipped) {
      messageKey = maybeSkipped;
      debugLog("[crypto] Using skipped message key");
    } else {
      messageKey = nextRecvMessageKey(session.ratchet, header);
      debugLog("[crypto] Derived new message key");
    }

    const plaintext = await decryptAesGcm(toBase64(messageKey), payload.ciphertext, payload.iv);
    debugLog("[crypto] decryptFromPeer ok len", plaintext.length);

    await storeSession(me, peerId, session);
    return plaintext;
  } catch (error) {
    console.error("[crypto] decryptFromPeer error:", error);
    console.error("[crypto] Payload:", {
      hasHandshake: !!payload.handshake,
      hasX3dh: !!payload.handshake?.x3dh,
      hasRatchet: !!payload.handshake?.ratchet,
      hasCiphertext: !!payload.ciphertext,
      hasIv: !!payload.iv,
    });
    throw error;
  }
};

export const ensurePrekeysAvailable = async (me) => {
  const device = await loadStoredDevice(me);
  if (!device) return;
  const unused = device.oneTimePreKeys.filter((k) => !k.used).length;
  if (unused < 5) {
    await topUpPreKeys(me);
  }
};

