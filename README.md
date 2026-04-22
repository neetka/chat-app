# 💬 Yapp — Encrypted Real-Time Chat Application

A full-stack real-time chat application with **end-to-end encryption**, **voice & video calling**, and **offline email notifications**.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-6+-green?logo=mongodb)
![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-orange?logo=webrtc)
![License](https://img.shields.io/badge/License-ISC-yellow)

> **Live Demo:** [yapp-27.vercel.app](https://yapp-27.vercel.app)

---

## ✨ Features

### 🔐 End-to-End Encryption

- **AES-256-GCM** encryption for all messages
- **PBKDF2-SHA256** key derivation (100,000 iterations)
- **Per-conversation keys** — each chat has a unique encryption key
- **Zero-knowledge server** — server never sees plaintext messages
- Client-side encryption/decryption only

### 📞 Voice & Video Calling

- **Peer-to-peer** WebRTC voice and video calls
- **STUN/TURN** server support for NAT traversal
- In-call controls: mute, camera toggle, end call
- Ringtone for incoming calls
- Connection state tracking with automatic timeout
- Picture-in-picture local video preview
- Works across different networks (production-ready with TURN relay)

### 📧 Offline Email Notifications

- Automatic email alerts when recipient is offline
- Beautiful HTML email templates
- **5-minute cooldown** to prevent spam
- Configurable via Nodemailer (Gmail, SMTP, etc.)

### 👥 Group Chats

- Create and manage group conversations
- Add/remove group members
- Real-time group messaging

### 💬 Real-time Messaging

- WebSocket-based instant messaging via Socket.io
- Online/offline user presence indicators
- Typing indicators
- Message delivery status (sent / delivered / read)
- Image sharing via Cloudinary
- Message encryption indicators (🔒)
- Message deletion

### 🎨 Modern UI/UX

- 32+ themes via DaisyUI
- Fully responsive design
- Profile customization (avatar, name, password)
- Landing page with animated hero
- Smooth animations and transitions

### 🛡️ Security & Rate Limiting

- API rate limiting (100 requests per 15 min per IP)
- JWT-based authentication
- Secure cookie-based sessions

---

## 🔐 Security Overview

| Feature                | Description                                |
| ---------------------- | ------------------------------------------ |
| 🔒 **AES-256-GCM**     | Military-grade authenticated encryption    |
| 🔑 **PBKDF2**          | Secure key derivation with 100k iterations |
| 🎲 **Random IV**       | Unique initialization vector per message   |
| ✅ **Integrity Check** | GCM provides authentication + encryption   |
| 🚫 **Zero Knowledge**  | Server cannot decrypt messages             |

---

## 🛠️ Tech Stack

### Backend

- **Node.js** + Express.js
- **MongoDB** + Mongoose ODM
- **Socket.io** — Real-time WebSocket communication
- **JWT** — Secure authentication
- **Nodemailer** — Email notifications
- **Cloudinary** — Image storage & CDN

### Frontend

- **React 19** + Vite (lightning fast)
- **Zustand** — Lightweight state management
- **TailwindCSS** + DaisyUI — Beautiful UI components
- **Socket.io Client** — Real-time updates
- **Web Crypto API** — Native browser encryption
- **WebRTC** — Peer-to-peer voice & video calls

---

## 📦 Installation

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account (for image uploads)
- TURN server credentials (for production video calling — free from [metered.ca](https://www.metered.ca/stun-turn))

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/neetka/chat-app.git
   cd chat-app
   ```

2. **Install dependencies**

   ```bash
   # Install all dependencies at once
   npm run install:all

   # Or manually:
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

3. **Configure environment variables**

   **Option A: Interactive setup (recommended)**

   ```bash
   npm run setup
   ```

   **Option B: Manual setup**

   ```bash
   # Copy example files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   **Backend `backend/.env` configuration:**

   ```env
   PORT=5001
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/chatapp

   # Authentication
   JWT_SECRET=your-super-secret-jwt-key

   # Cloudinary (for images)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Email Notifications (Gmail example)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   APP_NAME=ChatApp

   # Frontend URL
   FRONTEND_URL=http://localhost:5173

   # TURN server credentials for WebRTC video/voice calling
   # Get free credentials from https://www.metered.ca/stun-turn
   TURN_SERVER_URL=stun:stun.relay.metered.ca:80,turn:global.relay.metered.ca:80,turn:global.relay.metered.ca:443,turns:global.relay.metered.ca:443?transport=tcp
   TURN_SERVER_USERNAME=your-metered-username
   TURN_SERVER_CREDENTIAL=your-metered-credential
   ```

   **Frontend `frontend/.env` configuration:**

   ```env
   # Encryption secret (IMPORTANT - must be same for all users)
   VITE_ENCRYPTION_SECRET=your-32-character-secret-key-here
   ```

   > 📧 **Gmail Setup**: Create an App Password at [Google App Passwords](https://myaccount.google.com/apppasswords)

   > 📞 **TURN Server**: Sign up at [metered.ca/stun-turn](https://www.metered.ca/stun-turn) for free TURN credentials (500 GB/month free tier). Video calling works locally without TURN, but **requires TURN in production** for cross-network connectivity.

4. **Start the application**

   **Development mode (two terminals):**

   Terminal 1 — Backend:

   ```bash
   cd backend
   npm run dev
   ```

   Terminal 2 — Frontend:

   ```bash
   cd frontend
   npm run dev
   ```

   **Production mode:**

   ```bash
   npm run build
   npm start
   ```

5. **Access the application**
   - Development: http://localhost:5173
   - Production: http://localhost:5001

---

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method   | Endpoint           | Description            | Auth |
| -------- | ------------------ | ---------------------- | ---- |
| `POST`   | `/signup`          | Create new account     | No   |
| `POST`   | `/login`           | Log in                 | No   |
| `POST`   | `/logout`          | Log out                | Yes  |
| `PUT`    | `/update-profile`  | Update profile info    | Yes  |
| `PUT`    | `/change-password` | Change password        | Yes  |
| `DELETE` | `/delete-account`  | Delete account         | Yes  |
| `GET`    | `/check`           | Check auth status      | Yes  |

### Messages (`/api/messages`)

| Method   | Endpoint           | Description                    | Auth |
| -------- | ------------------ | ------------------------------ | ---- |
| `GET`    | `/users`           | Get users for sidebar          | Yes  |
| `GET`    | `/:id`             | Get messages with a user       | Yes  |
| `POST`   | `/send/:id`        | Send a message                 | Yes  |
| `DELETE` | `/:id`             | Delete a message               | Yes  |

### Groups (`/api/groups`)

| Method   | Endpoint           | Description           | Auth |
| -------- | ------------------ | --------------------- | ---- |
| `POST`   | `/`                | Create a group        | Yes  |
| `GET`    | `/`                | Get user's groups     | Yes  |

### Calling (`/api/call`)

| Method | Endpoint        | Description                          | Auth |
| ------ | --------------- | ------------------------------------ | ---- |
| `GET`  | `/ice-servers`  | Get TURN/ICE server config for WebRTC | Yes  |

### Keys (`/api/keys`)

| Method | Endpoint           | Description                | Auth |
| ------ | ------------------ | -------------------------- | ---- |
| `POST` | `/register`        | Register device public key | Yes  |
| `GET`  | `/:userId`         | Get user's public key      | Yes  |

---

## 📞 WebRTC Calling Architecture

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│   Caller    │                  │   Server    │                  │  Receiver   │
│             │                  │ (Signaling) │                  │             │
└──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
       │                                │                                │
       │ 1. Create offer ──────────────►│ 2. Relay offer ──────────────►│
       │                                │                                │
       │                                │◄──────────── 3. Create answer │
       │◄────────── 4. Relay answer ────│                                │
       │                                │                                │
       │ 5. Exchange ICE candidates ◄──►│◄──► 6. Exchange ICE candidates│
       │                                │                                │
       │◄───────────────── 7. Peer-to-peer media stream ───────────────►│
       │              (via STUN direct / TURN relay)                     │
```

- **Signaling** is done over Socket.io through the server
- **Media** flows peer-to-peer via WebRTC (STUN for direct, TURN for relayed)
- TURN credentials are fetched from the backend at call time, never hardcoded in frontend

---

## 🔒 How Encryption Works

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│   Sender    │                  │   Server    │                  │  Receiver   │
│             │                  │ (No Access) │                  │             │
└──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
       │                                │                                │
       │ 1. Derive conversation key     │                                │
       │    (PBKDF2 + user IDs)         │                                │
       │                                │                                │
       │ 2. Encrypt with AES-256-GCM    │                                │
       │                                │                                │
       │ 3. Send ciphertext ───────────►│ 4. Store (can't decrypt) ─────►│
       │                                │                                │
       │                                │                 5. Derive same │
       │                                │                    key & decrypt│
       │                                │                                │
```

---

## 📧 Email Notifications

When a user is **offline**, the sender's message triggers an email notification:

- Beautiful HTML email with sender info
- "Open App" button links to the chat
- 5-minute cooldown prevents spam
- Shows encryption status (🔒)

---

## 🎯 Quick Start Scripts

### Windows

**Batch Script (CMD):**

```bash
start.bat
```

**PowerShell Script:**

```powershell
.\start.ps1
```

### macOS / Linux

```bash
# Option 1: Using npm scripts
npm run dev:backend   # Terminal 1
npm run dev:frontend  # Terminal 2

# Option 2: Direct commands
cd backend && npm run dev   # Terminal 1
cd frontend && npm run dev  # Terminal 2
```

---

## 🧪 Testing

See [DEMO.md](DEMO.md) for detailed testing instructions of the encryption features.

---

## 📖 Documentation

| Document                                 | Description                     |
| ---------------------------------------- | ------------------------------- |
| [QUICKSTART.md](QUICKSTART.md)           | Get started in 5 minutes        |
| [SECURITY.md](SECURITY.md)               | Encryption architecture details |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues & solutions       |
| [DEMO.md](DEMO.md)                       | Feature testing guide           |

---

## 🗂️ Project Structure

```
chat-app/
├── backend/
│   └── src/
│       ├── controllers/         # Route handlers
│       ├── lib/                 # DB, socket.io, utilities
│       ├── middleware/          # Auth, rate limiting
│       ├── models/              # Mongoose schemas
│       ├── routes/              # Express routes (auth, messages, groups, call, keys)
│       ├── seeds/               # Database seed scripts
│       └── index.js             # Server entry point
├── frontend/
│   └── src/
│       ├── components/          # React components (Chat, Call, Sidebar, etc.)
│       ├── lib/                 # Axios, crypto utilities
│       ├── pages/               # Page components (Home, Login, SignUp, Profile, Settings)
│       ├── store/               # Zustand stores (auth, chat, call, theme)
│       ├── App.jsx              # App root with routing
│       └── main.jsx             # Entry point
├── package.json                 # Root scripts (setup, build, dev)
├── setup.js                     # Interactive setup wizard
└── README.md
```

---

## ⚠️ Security Note

This application uses **AES-256-GCM** encryption with **PBKDF2** key derivation. While this provides strong confidentiality:

- All clients must share the same `VITE_ENCRYPTION_SECRET`
- No forward secrecy (if secret is compromised, past messages can be decrypted)
- Suitable for private deployments where you control all clients

For maximum security, consider implementing the Signal Protocol with forward secrecy.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

ISC

---

<p align="center">
  Made with ❤️ | End-to-End Encrypted | Voice & Video Calling | 2024
</p>
