/**
 * Simple E2EE using AES-256-GCM with conversation-specific keys
 *
 * This is a simpler alternative to Signal Protocol that:
 * - Uses a shared secret key from environment
 * - Derives unique keys per conversation (user pair)
 * - Always decryptable as long as you have the secret (no session state)
 * - Provides confidentiality and integrity via AES-GCM
 *
 * Trade-offs vs Signal Protocol:
 * - No forward secrecy (if master key is compromised, all messages can be decrypted)
 * - No post-compromise security
 * - But: Much simpler, no session sync issues, messages always readable
 */

// Get the encryption secret from environment or use a default for dev
const getEncryptionSecret = () => {
  const secret = import.meta.env.VITE_ENCRYPTION_SECRET;
  if (!secret) {
    console.warn(
      "[crypto] VITE_ENCRYPTION_SECRET not set, using default (NOT SECURE FOR PRODUCTION)"
    );
    return "chat-app-default-secret-change-in-production-2024";
  }
  return secret;
};

// Convert string to Uint8Array
const stringToBytes = (str) => new TextEncoder().encode(str);

// Convert Uint8Array to Base64
const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));

// Convert Base64 to Uint8Array
const fromBase64 = (str) => {
  if (!str || typeof str !== "string") {
    throw new Error("Invalid Base64 input");
  }
  return new Uint8Array(
    atob(str)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
};

/**
 * Derive a conversation-specific key from the master secret and user IDs
 * This ensures each conversation has a unique encryption key
 */
const deriveConversationKey = async (userId1, userId2) => {
  const secret = getEncryptionSecret();

  // Sort user IDs to ensure consistent key regardless of sender/receiver order
  const sortedIds = [userId1, userId2].sort().join(":");
  const keyMaterial = `${secret}:conversation:${sortedIds}`;

  // Import the key material
  const keyData = await crypto.subtle.importKey(
    "raw",
    stringToBytes(keyMaterial),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive a 256-bit AES key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: stringToBytes("chat-app-salt-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return derivedKey;
};

/**
 * Encrypt a message for a specific conversation
 * @param {string} myUserId - Current user's ID
 * @param {string} peerId - Other user's ID
 * @param {string} plaintext - Message to encrypt
 * @returns {Promise<{ciphertext: string, iv: string}>}
 */
export const encryptMessage = async (myUserId, peerId, plaintext) => {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty message");
  }

  const key = await deriveConversationKey(myUserId, peerId);

  // Generate a random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the message
  const encodedText = stringToBytes(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedText
  );

  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
  };
};

/**
 * Decrypt a message from a specific conversation
 * @param {string} myUserId - Current user's ID
 * @param {string} peerId - Other user's ID
 * @param {string} ciphertextB64 - Base64 encoded ciphertext
 * @param {string} ivB64 - Base64 encoded IV
 * @returns {Promise<string>} - Decrypted plaintext
 */
export const decryptMessage = async (
  myUserId,
  peerId,
  ciphertextB64,
  ivB64
) => {
  if (!ciphertextB64 || !ivB64) {
    throw new Error("Missing ciphertext or IV");
  }

  const key = await deriveConversationKey(myUserId, peerId);

  const ciphertext = fromBase64(ciphertextB64);
  const iv = fromBase64(ivB64);

  // Decrypt the message
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
};

/**
 * Check if the encryption secret is properly configured
 */
export const isEncryptionConfigured = () => {
  const secret = import.meta.env.VITE_ENCRYPTION_SECRET;
  return !!secret && secret.length >= 32;
};

/**
 * Get encryption status info
 */
export const getEncryptionInfo = () => {
  const configured = isEncryptionConfigured();
  return {
    configured,
    algorithm: "AES-256-GCM",
    keyDerivation: "PBKDF2-SHA256",
    warning: configured
      ? null
      : "Using default secret - set VITE_ENCRYPTION_SECRET for production",
  };
};
