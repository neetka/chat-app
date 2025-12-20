# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Option 1: Automatic Setup (Recommended)

```bash
# 1. Install all dependencies
npm run install:all

# 2. Run the setup wizard
npm run setup

# 3. Start development servers (in separate terminals)
npm run dev:backend   # Terminal 1
npm run dev:frontend  # Terminal 2
```

### Option 2: Manual Setup

#### Step 1: Install Dependencies

```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

#### Step 2: Configure Environment

Create `backend/.env`:

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your-super-secret-jwt-key-change-this
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
FRONTEND_URL=http://localhost:5173
```

#### Step 3: Start MongoDB

Make sure MongoDB is running on your system:

```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas (cloud) and update MONGODB_URI
```

#### Step 4: Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

#### Step 5: Open Application

Navigate to: http://localhost:5173

## 📝 First Time Use

1. **Create an account**: Click "Sign Up" and register
2. **Login**: Use your credentials
3. **Start chatting**: Select a user from the sidebar
4. **Test encryption**: Open DevTools → Application → IndexedDB → chatapp_keys

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 5001 (backend)
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Or change PORT in backend/.env
```

### MongoDB Connection Error

- Verify MongoDB is running: `mongod --version`
- Check MONGODB_URI in backend/.env
- Use MongoDB Atlas for cloud database

### Dependencies Installation Failed

```bash
# Clear caches and reinstall
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
npm run install:all
```

### Build Errors

```bash
# Make sure you're using Node.js v18+
node --version

# Update dependencies
npm update
cd backend && npm update
cd ../frontend && npm update
```

## 📦 Environment Variables

### Required Variables

- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens (generate a strong random string)

### Optional Variables

- `CLOUDINARY_*`: Only needed for image upload feature
- `FRONTEND_URL`: Only needed in production deployment

### Generating JWT Secret

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or just use a long random string
```

## 🎯 Features to Test

1. **User Authentication**

   - Sign up with email/password
   - Login/logout
   - Profile updates

2. **Real-time Messaging**

   - Send/receive messages instantly
   - Online/offline status
   - Message persistence

3. **End-to-End Encryption**

   - X3DH handshake on first message
   - Double Ratchet for all messages
   - Check encryption in DevTools

4. **Image Sharing**

   - Upload profile pictures
   - Send images in chat (requires Cloudinary)

5. **Themes**
   - Switch between light/dark modes
   - Multiple color themes

## 📚 Additional Resources

- [README.md](README.md) - Full documentation
- [SECURITY.md](SECURITY.md) - Encryption details
- [DEMO.md](DEMO.md) - Testing guide

## 🆘 Still Having Issues?

1. Check the terminal logs for error messages
2. Open browser DevTools → Console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure MongoDB is running and accessible
5. Check that ports 5001 and 5173 are available

## 🎉 You're All Set!

Your encrypted chat application is ready to use. Enjoy secure messaging!
