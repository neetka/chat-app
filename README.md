# 💬 Encrypted Chat Application

A full-stack real-time chat application with **end-to-end encryption** and **offline email notifications**.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-6+-green?logo=mongodb)
![License](https://img.shields.io/badge/License-ISC-yellow)

## ✨ Features

### 🔐 End-to-End Encryption

- **AES-256-GCM** encryption for all messages
- **PBKDF2-SHA256** key derivation (100,000 iterations)
- **Per-conversation keys** - each chat has a unique encryption key
- **Zero-knowledge server** - server never sees plaintext messages
- Client-side encryption/decryption only

### 📧 Offline Email Notifications

- Automatic email alerts when recipient is offline
- Beautiful HTML email templates
- **5-minute cooldown** to prevent spam
- Configurable via Nodemailer (Gmail, SMTP, etc.)

### 💬 Real-time Messaging

- WebSocket-based instant messaging
- Online/offline user presence
- Image sharing via Cloudinary
- Message encryption indicators (🔒)

### 🎨 Modern UI/UX

- 32+ themes via DaisyUI
- Fully responsive design
- Profile customization
- Smooth animations

## 🔐 Security Features

| Feature                | Description                                |
| ---------------------- | ------------------------------------------ |
| 🔒 **AES-256-GCM**     | Military-grade authenticated encryption    |
| 🔑 **PBKDF2**          | Secure key derivation with 100k iterations |
| 🎲 **Random IV**       | Unique initialization vector per message   |
| ✅ **Integrity Check** | GCM provides authentication + encryption   |
| 🚫 **Zero Knowledge**  | Server cannot decrypt messages             |

## 🛠️ Tech Stack

### Backend

- **Node.js** + Express.js
- **MongoDB** + Mongoose ODM
- **Socket.io** - Real-time WebSocket communication
- **JWT** - Secure authentication
- **Nodemailer** - Email notifications
- **Cloudinary** - Image storage & CDN

### Frontend

- **React 19** + Vite (lightning fast)
- **Zustand** - Lightweight state management
- **TailwindCSS** + DaisyUI - Beautiful UI components
- **Socket.io Client** - Real-time updates
- **Web Crypto API** - Native browser encryption

## 📦 Installation

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account (for image uploads)

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
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

   **Backend `.env` configuration:**

   ```env
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
   ```

   **Frontend `.env` configuration:**

   ```env
   # Encryption secret (IMPORTANT - must be same for all users)
   VITE_ENCRYPTION_SECRET=your-32-character-secret-key-here
   ```

   > 📧 **Gmail Setup**: Create an App Password at [Google App Passwords](https://myaccount.google.com/apppasswords)

4. **Start the application**

   **Development mode (two terminals):**

   Terminal 1 - Backend:

   ```bash
   cd backend
   npm run dev
   ```

   Terminal 2 - Frontend:

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

## 🧪 Testing

See [DEMO.md](DEMO.md) for detailed testing instructions of the encryption features.

## 📖 Documentation

- [QUICKSTART.md](QUICKSTART.md) - Get started in 5 minutes
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
- [SECURITY.md](SECURITY.md) - Detailed security architecture
- [DEMO.md](DEMO.md) - Feature testing guide

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

### Manual Start

```bash
# Option 1: Using npm scripts
npm run dev:backend   # Terminal 1
npm run dev:frontend  # Terminal 2

# Option 2: Direct commands
cd backend && npm run dev   # Terminal 1
cd frontend && npm run dev  # Terminal 2
```

## 🔑 Key Features

- ✅ User authentication (signup/login with JWT)
- ✅ Real-time messaging with WebSockets
- ✅ **End-to-end encryption (AES-256-GCM)**
- ✅ **Offline email notifications**
- ✅ Online/offline user presence
- ✅ Image sharing (encrypted metadata)
- ✅ Profile customization
- ✅ 32+ themes (DaisyUI)
- ✅ Fully responsive design
- ✅ Encryption status indicators

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
       │                                │                    key & decrypt
       │                                │                                │
```

## 📧 Email Notifications

When a user is **offline**, the sender's message triggers an email notification:

- Beautiful HTML email with sender info
- "Open App" button links to the chat
- 5-minute cooldown prevents spam
- Shows encryption status (🔒)

**Example email:**

> 💬 **New message from John Doe**  
> 🔒 Message is encrypted - open the app to read it

## 📝 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚠️ Security Note

This application uses **AES-256-GCM** encryption with **PBKDF2** key derivation. While this provides strong confidentiality:

- All clients must share the same `VITE_ENCRYPTION_SECRET`
- No forward secrecy (if secret is compromised, past messages can be decrypted)
- Suitable for private deployments where you control all clients

For maximum security, consider implementing the Signal Protocol with forward secrecy.

## 📚 Documentation

| Document                                 | Description                     |
| ---------------------------------------- | ------------------------------- |
| [QUICKSTART.md](QUICKSTART.md)           | Get started in 5 minutes        |
| [SECURITY.md](SECURITY.md)               | Encryption architecture details |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues & solutions       |
| [DEMO.md](DEMO.md)                       | Feature testing guide           |

---

<p align="center">
  Made with ❤️ | End-to-End Encrypted | 2024
</p>
