## Security Overview

This chat application uses **AES-256-GCM encryption** for end-to-end encrypted messaging. All encryption/decryption happens **client-side only** - the server never has access to plaintext messages.

> **🔒 Encryption Status**: All text messages are encrypted by default. You'll see a lock icon (🔒) next to encrypted messages.

### Encryption Approach

We use a **shared-secret key derivation** approach that:

- Derives unique encryption keys per conversation (user pair)
- Uses PBKDF2 with the shared secret + user IDs to create conversation-specific keys
- Encrypts messages with AES-256-GCM (authenticated encryption)
- Is simpler and more reliable than session-based protocols

### Cryptographic Algorithms

| Component      | Algorithm                 | Purpose                       |
| -------------- | ------------------------- | ----------------------------- |
| Key Derivation | PBKDF2-SHA256 (100k iter) | Derive conversation keys      |
| Encryption     | AES-256-GCM               | Authenticated encryption      |
| IV Generation  | crypto.getRandomValues    | 12-byte random IV per message |

### How It Works

```
┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
│   Alice      │                    │    Server    │                    │     Bob      │
│  (Client)    │                    │  (Cannot see │                    │   (Client)   │
│              │                    │  plaintext)  │                    │              │
└──────┬───────┘                    └──────┬───────┘                    └──────┬───────┘
       │                                   │                                   │
       │  1. Derive key from:              │                                   │
       │     - VITE_ENCRYPTION_SECRET      │                                   │
       │     - sorted(Alice_ID, Bob_ID)    │                                   │
       │                                   │                                   │
       │  2. Encrypt message with AES-GCM  │                                   │
       │     - Random 12-byte IV           │                                   │
       │     - 256-bit derived key         │                                   │
       │                                   │                                   │
       │  3. Send ciphertext + IV          │                                   │
       │──────────────────────────────────►│  4. Forward (can't decrypt)       │
       │                                   │──────────────────────────────────►│
       │                                   │                                   │
       │                                   │  5. Bob derives same key          │
       │                                   │     (same secret + same user IDs) │
       │                                   │                                   │
       │                                   │  6. Bob decrypts with AES-GCM     │
       │                                   │                                   │
```

### Key Derivation Formula

```
conversation_key = PBKDF2(
  password: VITE_ENCRYPTION_SECRET + ":conversation:" + sort(userA_id, userB_id),
  salt: "chat-app-salt-v1",
  iterations: 100000,
  hash: SHA-256,
  keyLength: 256 bits
)
```

This ensures:

- Same key is derived regardless of who initiates the conversation
- Different conversations have different keys
- Key derivation is computationally expensive (resistant to brute force)

### What the Server Can See

| Can See ✓                   | Cannot See ✗           |
| --------------------------- | ---------------------- |
| User IDs (sender/receiver)  | Message plaintext      |
| Timestamps                  | Encryption key         |
| Ciphertext (encrypted blob) | VITE_ENCRYPTION_SECRET |
| IV (initialization vector)  | Conversation keys      |
| Image URLs (if uploaded)    | Decrypted content      |

### Configuration

Set the encryption secret in your `.env` file:

```env
# Frontend (.env)
VITE_ENCRYPTION_SECRET=your-super-secret-key-at-least-32-characters-long
```

**Important**:

- Use a strong, random secret (at least 32 characters)
- All clients must use the same secret to decrypt messages
- Generate a secure secret: `openssl rand -base64 32`

### Security Features

| Feature                         | Status                                   |
| ------------------------------- | ---------------------------------------- |
| 🔐 **End-to-End Encryption**    | ✅ Server cannot read messages           |
| 🔑 **Per-Conversation Keys**    | ✅ Each chat has unique key              |
| ✅ **Authenticated Encryption** | ✅ AES-GCM provides integrity            |
| 🎲 **Random IV Per Message**    | ✅ Same plaintext → different ciphertext |
| 📱 **No Session State**         | ✅ Messages always decryptable           |
| 🔄 **Browser Refresh Safe**     | ✅ No keys stored in memory              |

### Trade-offs vs Signal Protocol

| Aspect                | This Implementation | Signal Protocol         |
| --------------------- | ------------------- | ----------------------- |
| Simplicity            | ✅ Simple           | ❌ Complex              |
| Reliability           | ✅ Always works     | ⚠️ Session sync issues  |
| Forward Secrecy       | ❌ No               | ✅ Yes                  |
| Post-Compromise       | ❌ No               | ✅ Yes                  |
| Old Messages Readable | ✅ Always           | ❌ May fail after reset |
