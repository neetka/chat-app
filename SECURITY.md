## Security Overview

This chat application uses a combination of an X3DH-style pre-key handshake and a Double Ratchet-style session to provide end-to-end encryption between clients. All sensitive cryptographic operations happen **only on the client**; the server never has access to plaintext messages or long‑term private keys.

### X3DH-style Handshake

When two users start a conversation:

- Each device has:
  - An **identity key pair** (X25519) stored locally.
  - A **signed pre-key** and a pool of **one-time pre-keys**, whose **public** parts are uploaded to the server.
- The initiator fetches the recipient’s **pre-key bundle** from the server and performs several Diffie–Hellman operations:
  - \( DH(I\_A, S\_B) \) – initiator identity with recipient signed pre-key
  - \( DH(E\_A, I\_B) \) – initiator ephemeral with recipient identity
  - \( DH(E\_A, S\_B) \) – initiator ephemeral with recipient signed pre-key
  - \( DH(E\_A, O\_B) \) – initiator ephemeral with recipient one-time pre-key
- These DH outputs are concatenated and run through **HKDF-SHA256** to derive a shared **root key** and initial **sending/receiving chain keys**.
- The first encrypted message includes:
  - The initiator’s **ephemeral public key**.
  - A reference to the **one-time pre-key** used.
  - A **ratchet header** (current ratchet public key, message numbers).

The recipient reconstructs the same shared secret using its own private keys and the handshake payload, then initializes its side of the Double Ratchet.

### Double Ratchet-style Session

Once the X3DH root key is established:

- Each peer maintains, per conversation:
  - A **root key**.
  - A **sending chain key** and **receiving chain key**.
  - A pair of **DH ratchet keys** (current local private/public, last remote public).
  - Message counters and a store of **skipped message keys** for out-of-order delivery.
- For every message:
  - A fresh **message key** is derived from the current chain key using HKDF-SHA256.
  - The payload is encrypted with **AES-GCM** using that one-time message key.
  - A **ratchet header** (DH public key and message numbers) is attached.
- When a new ratchet public key is received:
  - A new DH output is computed and run through a root KDF to derive:
    - A new **root key**.
    - A new **receiving chain key**.
  - A new local DH key pair is generated to derive the next **sending chain key**.

This provides:

- **Forward secrecy**: Compromise of current keys does not reveal past messages, because old message keys are derived from previous chain states and then discarded.
- **Post-compromise security**: After an attacker loses access to a device’s state, new DH ratchet steps heal the conversation so future messages are again secure.

### What the Server Can and Cannot See

The server **can see**:

- User identifiers and authentication metadata (for example, JWT‑based sessions).
- Public key material:
  - Identity public keys.
  - Signed pre-key public keys + signatures.
  - One-time pre-key public keys.
- Encrypted message metadata:
  - Sender and receiver user IDs.
  - Timestamps.
  - Ciphertext and AES-GCM IV.
  - Ratchet headers and X3DH handshake metadata (public keys, key IDs, message numbers).
  - Optional media URLs (if images are uploaded).

The server **cannot see**:

- Any **private keys** (identity, signed pre-key, one-time pre-keys, or ratchet private keys).
- Any **plaintext message content**.
- Any **message keys**, chain keys, or root keys.

All private cryptographic material and session state are stored only on the client (in IndexedDB) and never transmitted to the server.


