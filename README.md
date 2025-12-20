# Encrypted Chat Application

A full-stack real-time chat application with end-to-end encryption using the Signal Protocol (X3DH + Double Ratchet).

## 🔐 Security Features

- **X3DH Key Agreement**: Secure session establishment between users
- **Double Ratchet Protocol**: Forward secrecy and post-compromise security
- **AES-GCM Encryption**: Message content protection
- **Client-side Cryptography**: All encryption happens in the browser
- **IndexedDB Storage**: Secure local key storage

## 🚀 Tech Stack

### Backend

- Node.js + Express
- MongoDB + Mongoose
- Socket.io (WebSocket)
- JWT Authentication
- Cloudinary (image storage)

### Frontend

- React 19 + Vite
- Zustand (state management)
- TailwindCSS + DaisyUI
- Socket.io Client
- StableLib (cryptography)

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
   # Copy example file
   cp backend/.env.example backend/.env

   # Edit backend/.env and fill in:
   # - MONGODB_URI: Your MongoDB connection string
   # - JWT_SECRET: A strong random secret (or let setup script generate)
   # - CLOUDINARY_*: Your Cloudinary credentials (optional)
   ```

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

- ✅ User authentication (signup/login)
- ✅ Real-time messaging with WebSockets
- ✅ End-to-end encryption
- ✅ Online user presence
- ✅ Image sharing
- ✅ Profile customization
- ✅ Multiple themes
- ✅ Responsive design

## 📝 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚠️ Security Note

This is a demonstration project implementing cryptographic protocols. For production use, conduct a thorough security audit and consider using established libraries like libsignal.
