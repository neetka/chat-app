# 🔧 Troubleshooting Guide

Common issues and their solutions for the Chat Application.

## Installation Issues

### Issue: `npm install` fails

**Solutions:**

1. Clear npm cache:

   ```bash
   npm cache clean --force
   ```

2. Delete lock files and node_modules:

   ```bash
   # In root directory
   rm -rf node_modules package-lock.json
   rm -rf backend/node_modules backend/package-lock.json
   rm -rf frontend/node_modules frontend/package-lock.json
   ```

3. Reinstall:

   ```bash
   npm run install:all
   ```

4. Check Node.js version (requires v18+):
   ```bash
   node --version
   ```

### Issue: Module not found errors

**Solution:** Ensure all dependencies are installed in the correct directories:

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Backend Issues

### Issue: `Error: Cannot find module 'server.js'`

**Solution:** This was fixed! Make sure you have the latest `backend/package.json`:

```json
"scripts": {
  "start": "node src/index.js",
  "dev": "nodemon src/index.js"
}
```

### Issue: MongoDB connection error

**Symptoms:**

```
MongoDB connection error: MongooseServerSelectionError
```

**Solutions:**

1. **Local MongoDB not running:**

   ```bash
   # Start MongoDB service
   mongod

   # Or on Windows with MongoDB service:
   net start MongoDB
   ```

2. **Wrong connection string:**

   - Check `MONGODB_URI` in `backend/.env`
   - For local: `mongodb://localhost:27017/chatapp`
   - For Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/chatapp`

3. **MongoDB not installed:**
   - Install from https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

### Issue: JWT_SECRET error

**Symptoms:**

```
Error: secretOrPrivateKey must have a value
```

**Solution:**

1. Make sure `backend/.env` exists
2. Check that `JWT_SECRET` is set:
   ```env
   JWT_SECRET=your-secret-key-here
   ```
3. Generate a secure secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

### Issue: Port already in use

**Symptoms:**

```
Error: listen EADDRINUSE: address already in use :::5001
```

**Solutions:**

1. **Find process using port 5001:**

   ```powershell
   # Windows
   netstat -ano | findstr :5001
   taskkill /PID <PID> /F
   ```

   ```bash
   # Linux/Mac
   lsof -i :5001
   kill -9 <PID>
   ```

2. **Change port:** Edit `backend/.env`:
   ```env
   PORT=5002
   ```

### Issue: Cloudinary errors

**Symptoms:**

```
Error: Must supply api_key
```

**Solution:**
Cloudinary is optional. Either:

1. **Configure Cloudinary** (for image uploads):

   - Sign up at https://cloudinary.com
   - Add credentials to `backend/.env`:
     ```env
     CLOUDINARY_CLOUD_NAME=your-cloud-name
     CLOUDINARY_API_KEY=your-api-key
     CLOUDINARY_API_SECRET=your-api-secret
     ```

2. **Or disable image features** (images won't work)

## Frontend Issues

### Issue: Cannot connect to backend

**Symptoms:**

- Login fails silently
- Network errors in browser console
- CORS errors

**Solutions:**

1. **Backend not running:**

   ```bash
   cd backend
   npm run dev
   ```

2. **Wrong backend URL:**

   - Check `frontend/src/lib/axios.js`
   - Default: `http://localhost:5001/api` in development

3. **CORS issues:** Backend is configured for localhost. Check `backend/src/index.js`:
   ```javascript
   cors({
     origin:
       process.env.NODE_ENV === "production"
         ? process.env.FRONTEND_URL
         : /^http:\/\/localhost:\d+$/,
     credentials: true,
   });
   ```

### Issue: WebSocket connection fails

**Symptoms:**

```
WebSocket connection failed
```

**Solutions:**

1. Ensure backend is running
2. Check Socket.io configuration in `backend/src/lib/socket.js`
3. Browser console shows specific error - read it carefully

### Issue: Encryption errors

**Symptoms:**

```
[decrypt failed: ...]
Failed to decode Base64 string
```

**Solutions:**

1. **Clear corrupted keys:**

   - Open DevTools → Application → IndexedDB
   - Delete `chatapp-secure` database
   - Refresh page and log in again

2. **Both users must have devices registered:**

   - Both sender and receiver need to log in at least once
   - Check IndexedDB for `deviceKeys` store

3. **Session corruption:**
   - Log out and log in again
   - Keys will regenerate automatically

### Issue: Messages not showing

**Checklist:**

- [ ] Both users are logged in
- [ ] Users selected each other from sidebar
- [ ] Backend WebSocket is connected (check terminal logs)
- [ ] No console errors in browser DevTools
- [ ] Messages are being saved (check MongoDB/network tab)

## Browser Issues

### Issue: Application not loading

1. **Hard refresh:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear cache:** DevTools → Network → Disable cache
3. **Try incognito mode**
4. **Check console for errors**

### Issue: IndexedDB errors

**Solution:** Clear IndexedDB:

1. DevTools → Application → Storage
2. Click "Clear site data"
3. Refresh page

## Development Issues

### Issue: Changes not reflecting

**Solutions:**

1. **Backend:** Nodemon should auto-restart. If not, restart manually
2. **Frontend:** Vite auto-reloads. Check if process is still running
3. **Hard refresh browser:** Ctrl+Shift+R

### Issue: Hot reload not working

**Solution:**

1. Check if files are saved
2. Restart dev server:

   ```bash
   # Backend
   cd backend
   npm run dev

   # Frontend
   cd frontend
   npm run dev
   ```

## Production Issues

### Issue: Build fails

**Solutions:**

1. **Check Node.js version:**

   ```bash
   node --version  # Should be v18+
   ```

2. **Clean install:**

   ```bash
   npm run install:all
   ```

3. **Build frontend:**
   ```bash
   cd frontend
   npm run build
   ```

### Issue: Production server not serving frontend

**Solution:** Make sure:

1. Frontend is built: `frontend/dist` folder exists
2. `NODE_ENV=production` in backend/.env
3. Backend is serving static files (check `backend/src/index.js`)

## Database Issues

### Issue: Data not persisting

**Solution:**

1. Check MongoDB is running
2. Verify connection string
3. Check MongoDB logs for errors

### Issue: Duplicate key error

**Symptoms:**

```
E11000 duplicate key error
```

**Solution:**

1. User already exists - use different email
2. Device already registered - clear IndexedDB and re-register

## Testing Issues

### Issue: Can't test with multiple users

**Solutions:**

1. Use different browsers
2. Use incognito mode + normal mode
3. Use different browser profiles
4. Use different devices/computers

## Getting More Help

1. **Check logs:**

   - Backend: Terminal where `npm run dev` is running
   - Frontend: Browser DevTools → Console

2. **Enable verbose logging:** Set `DEBUG=*` environment variable

3. **Check demo guide:** See [DEMO.md](DEMO.md) for testing steps

4. **Verify setup:** Run through [QUICKSTART.md](QUICKSTART.md) again

5. **Common error patterns:**
   - `Cannot find module`: Missing dependency or wrong import path
   - `Connection refused`: Service not running
   - `Invalid credentials`: Wrong password or user doesn't exist
   - `decrypt failed`: Key mismatch or corruption

## Prevention Tips

✅ Always keep dependencies updated
✅ Use environment variables, never hardcode secrets
✅ Clear IndexedDB when testing encryption
✅ Keep MongoDB running when using the app
✅ Use latest Node.js LTS version
✅ Don't commit `.env` files
✅ Test in multiple browsers
✅ Monitor browser console and terminal for errors

## Emergency Reset

If everything is broken:

```bash
# 1. Stop all servers (Ctrl+C)

# 2. Clean everything
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
rm -rf frontend/dist

# 3. Clear browser data
# DevTools → Application → Clear site data

# 4. Reinstall
npm run install:all

# 5. Recreate .env
npm run setup

# 6. Restart MongoDB
mongod

# 7. Start servers
npm run dev:backend  # Terminal 1
npm run dev:frontend # Terminal 2
```

This should fix most problems!
