# Demo Guide: Testing Security Features

This guide walks through testing the end-to-end encryption features: X3DH handshake, Double Ratchet, and disappearing messages.

## Prerequisites

1. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. Set up environment variables:
   - Backend: Create `.env` with `PORT`, `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*` (if using image uploads).
   - Frontend: Uses Vite defaults; backend API should be at `http://localhost:5001` in development.

3. Start servers:
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

4. Open two browser windows (or use incognito + normal):
   - Window A: `http://localhost:5173` (User A)
   - Window B: `http://localhost:5173` (User B)

## Test 1: X3DH Handshake

**Goal**: Verify that two users establish a secure session on first contact.

### Steps

1. **User A**: Sign up or log in.
   - Open browser DevTools → Application → IndexedDB → `chatapp_keys`.
   - Verify that a device bundle exists with `identityPrivateKey`, `signedPreKey`, `oneTimePreKeys` (array).

2. **User B**: Sign up or log in.
   - Check IndexedDB similarly; should have a separate device bundle.

3. **User A**: Select User B from the sidebar and send a message (e.g., "Hello").
   - Open DevTools → Network → find the POST to `/api/messages/send/:id`.
   - Inspect the request body:
     - `ciphertext`: Base64-encoded encrypted payload.
     - `iv`: Initialization vector.
     - `handshake`: Should contain X3DH metadata (identity pubkey, signed pre-key, one-time pre-key, ephemeral key) and initial ratchet header.

4. **User B**: Should receive the message and decrypt it.
   - Check DevTools → Application → IndexedDB → `chatapp_sessions`.
   - Should see a session entry for User A with `rootKey`, `sendChainKey`, `recvChainKey`, etc.

5. **Verify handshake**:
   - In both browsers, check the console (if `DEBUG_RATCHET` is enabled in dev mode).
   - Look for logs like:
     ```
     [X3DH Initiator] Root key derived: abc12345...
     [X3DH Responder] Root key derived: abc12345...
     ```
   - The root key prefixes should match (same shared secret derived).

## Test 2: Double Ratchet

**Goal**: Verify that messages use fresh keys and ratchet steps occur.

### Steps

1. **User A → User B**: Send 3-5 messages in sequence.
   - Check DevTools → Network for each message.
   - Each `handshake` should have a `ratchet` object with:
     - `dh`: Current ratchet public key (may change on ratchet step).
     - `n`: Message number (increments: 0, 1, 2, ...).
     - `pn`: Previous message number (for skipped message handling).

2. **User B → User A**: Send a message back.
   - This should trigger a ratchet step (new `dh` key).
   - Check console logs (if debug enabled):
     ```
     [Ratchet] Step occurred: new DH key received
     [Ratchet] Root key updated: xyz67890...
     ```

3. **Verify forward secrecy**:
   - Send a few more messages.
   - In IndexedDB → `chatapp_sessions`, check that:
     - `sendChainKey` and `recvChainKey` are different from earlier values.
     - `skippedKeys` may have entries if messages arrived out of order.

4. **Test out-of-order delivery** (optional, requires network manipulation):
   - Send messages A1, A2, A3.
   - If A3 arrives before A2, the ratchet should store A2's key in `skippedKeys` and use it when A2 arrives.

## Test 3: Disappearing Messages

**Goal**: Verify that messages auto-delete after expiry and cannot be recovered.

### Steps

1. **User A**: Select User B, choose "5s" from the expiry dropdown, send "Test disappearing message".

2. **User B**: Should see the message with a clock icon and "5s" label next to the timestamp.

3. **Wait 5 seconds**:
   - **User A**: Message should disappear from the UI.
   - **User B**: Message should disappear from the UI.
   - Check browser console for deletion events (if Socket.IO logging is enabled).

4. **Verify no recovery**:
   - Refresh the page (User A or User B).
   - The expired message should not reappear (it was deleted from local state and the server only has ciphertext that requires the old ratchet state to decrypt).

5. **Test different expiry times**:
   - Send messages with "30s", "1m", and "Keep" (no expiry).
   - Verify that only messages with expiry show the clock icon and auto-delete.

6. **Verify encrypted expiry metadata**:
   - In DevTools → Network, inspect a message with expiry.
   - The `ciphertext` field contains the encrypted payload (text + expiry time).
   - The server cannot read the expiry time; only the client decrypts it.

## Debug Tips

### Enable Ratchet Logging

In `frontend/src/lib/cryptoSession.js`, `DEBUG_RATCHET` is `true` in development mode by default. You should see logs like:

```
[X3DH Initiator] Root key derived: abc12345...
[Ratchet] Encrypting message #0
[Ratchet] Decrypting message #1
```

### Inspect IndexedDB

1. Open DevTools → Application → IndexedDB.
2. `chatapp_keys`: Device identity keys, pre-keys (private keys stored here).
3. `chatapp_sessions`: Per-peer ratchet state (root key, chain keys, DH keys, message numbers).

**Note**: Never share IndexedDB dumps or screenshots containing actual key material.

### Network Inspection

- All message payloads should be `ciphertext` + `iv` + `handshake` (no plaintext).
- Pre-key bundle fetches (`/api/keys/bundle/:userId`) return only public keys.
- Deletion events (`deleteMessage` via Socket.IO) contain only `messageId`, not content.

## Troubleshooting

- **Messages not decrypting**: Check that both users have device bundles registered (IndexedDB → `chatapp_keys`).
- **Expiry not working**: Verify that `expiresAt` is set in the message object after decryption; check console for timer scheduling.
- **Ratchet errors**: Ensure IndexedDB is accessible (some browsers block it in private/incognito mode with strict settings).

## Security Notes

- This is a demo/testing environment. In production, ensure:
  - HTTPS/WSS for all traffic.
  - Secure random number generation (browser Web Crypto API is used).
  - No key material in logs or error messages.
  - Regular security audits of the cryptographic implementation.

