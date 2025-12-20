## Chat App Frontend

This is the React + Vite frontend for the end-to-end encrypted chat application. It talks to the backend over HTTP and WebSockets, while keeping all cryptographic operations (X3DH, Double Ratchet, AES-GCM) strictly on the client.

### Architecture (High Level)

```text
+-----------+                                   +-----------+
|  Client A |                                   |  Client B |
|  (Browser)|                                   |  (Browser)|
+-----+-----+                                   +-----+-----+
      |                                               ^
      | X3DH pre-key fetch / upload (public keys)     |
      v                                               |
+-----+-------------------------------+---------------+-----+
|                 Server              |                     |
|  - Auth (JWT / cookies)             |                     |
|  - Stores only PUBLIC identity /    |                     |
|    pre-key bundles                  |                     |
|  - Stores & relays ciphertext, IV,  |                     |
|    ratchet headers, metadata        |                     |
+-----+-------------------------------+---------------------+
      ^                                               |
      |  Encrypted messages (AES-GCM)                 |
      |  + ratchet headers / X3DH handshake          |
      |                                               v
+-----+-----+                                   +-----+-----+
|  Client A |                                   |  Client B |
|  (Browser)|                                   |  (Browser)|
+-----------+                                   +-----------+
```

All long‑term and session private keys are stored only in the browser (IndexedDB).

### Threat Model

- **Trusted components**
  - Client code running in the user’s browser (assuming supply chain is trusted and the device is not fully compromised).
  - Browser cryptography primitives and random number generation.
- **Untrusted / potentially malicious components**
  - Application backend (can read all messages it stores/relays).
  - Network infrastructure (can eavesdrop, MITM, or reorder/delay traffic).
- **Attacker capabilities**
  - Observe and modify all traffic between clients and server.
  - Compromise the server and read the database.
  - Temporarily compromise a client device and exfiltrate keys/state (post‑compromise security is limited but non‑zero due to the ratchet).

### Security Properties

- **End-to-end encryption**
  - Messages are encrypted with keys derived from X3DH + Double Ratchet and decrypted only on clients.
  - The server can never see plaintext content.
- **Forward secrecy**
  - Each message uses a fresh message key derived from a ratcheting chain.
  - Once used, message keys are discarded; past messages remain confidential even if current state is later compromised.
- **Post-compromise security**
  - After an attacker loses access to a compromised device, new DH ratchet steps will eventually produce fresh keys that the attacker cannot derive, re‑securing future messages.
- **Deniability (limited)**
  - The protocol reuses ideas from Signal’s X3DH + Double Ratchet, but this implementation has not been audited, so no formal deniability claims are made.

### Disappearing Messages

- **Design**
  - Sender can set an expiry time per message (5s, 30s, 1m, or keep forever).
  - Expiry metadata is encrypted along with the message payload using the same Double Ratchet + AES-GCM session.
  - After expiry, messages are automatically deleted from the local UI and a deletion event is sent to the recipient.
  - Expired messages cannot be recovered from IndexedDB (only keys/ratchet state are stored there, not message content).
- **Security guarantees**
  - Expiry metadata is end-to-end encrypted; the server cannot read or enforce expiry times.
  - Once a message expires and is deleted locally, the plaintext is no longer accessible (message keys are discarded by the ratchet).
  - Deletion events are relayed via Socket.IO but not enforced by the server; clients handle expiry independently.
- **Non-goals**
  - **No server enforcement**: The backend only relays deletion events; it does not validate or enforce expiry times.
  - **No recovery**: Expired messages cannot be recovered from the server's ciphertext alone (requires the ratchet state that was active at the time, which is discarded).
  - **No cross-device sync**: Expiry timers are local to each device; if a user has multiple devices, expiry must be handled per-device.

### Limitations

- **Single device per user (practical)**
  - While the backend and key model allow multiple devices, this implementation is effectively single‑device oriented and does not yet implement full multi‑device sync semantics.
- **No group sender keys yet**
  - Group chats (if added) would currently need to encrypt per-recipient; optimized group sender key schemes (like MLS/Group Signal) are **not** implemented.
- **No formal verification / audit**
  - The cryptographic design is inspired by well-known protocols but has not been formally verified or reviewed by professional cryptographers.
- **Local compromise still breaks security**
  - A fully compromised client device (e.g. malware with access to IndexedDB and runtime memory) can read ongoing conversations and sometimes stored state.

For more detail, see `SECURITY.md` at the project root.
