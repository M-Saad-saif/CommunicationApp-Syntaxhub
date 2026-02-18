# CollabSpace — Real-Time Collaboration Platform

A production-ready MERN + Vite collaboration platform with multi-user video calling, screen sharing, collaborative whiteboard, file sharing, and secure authentication.

---

## Architecture Overview

```
collabspace/
├── backend/                   # Node.js / Express API + Socket.io
│   ├── config/database.js     # Mongoose connection
│   ├── controllers/           # Route handlers (auth, rooms, files)
│   ├── middleware/            # auth (JWT), error, upload (multer)
│   ├── models/                # Mongoose schemas (User, Room)
│   ├── routes/                # Express routers
│   ├── socket/index.js        # Socket.io signaling hub
│   ├── utils/token.js         # JWT helpers
│   ├── app.js                 # Express app config
│   └── server.js              # HTTP server + DB init
│
└── frontend/                  # React + Vite
    └── src/
        ├── api/               # axios instance + socket singleton
        ├── components/
        │   ├── Call/          # VideoGrid, VideoTile, CallControls
        │   ├── Whiteboard/    # Canvas-based collaborative drawing
        │   ├── FileShare/     # Upload + real-time file broadcast
        │   └── UI/            # Chat
        ├── context/           # AuthContext (React Context + localStorage)
        ├── hooks/             # useWebRTC, useMedia
        ├── pages/             # Login, Register, Dashboard, Room
        └── styles/            # global.css
```

---

## WebRTC Signaling Flow

This platform uses a **mesh architecture** — every peer creates a direct P2P connection to every other peer.

```
Peer A joins room
    │
    ├─► Server: room:join
    │
    └◄── Server: room:existing-peers  [ { socketId, username } for all active peers ]
              │
              └─► Peer A creates RTCPeerConnection for each existing peer
                  Peer A creates Offer → setLocalDescription
                  Peer A emits: webrtc:offer  (targetSocketId, offer)
                        │
                  Server forwards to Peer B
                        │
                  Peer B receives: webrtc:offer
                  Peer B creates RTCPeerConnection
                  Peer B setRemoteDescription(offer)
                  Peer B creates Answer → setLocalDescription
                  Peer B emits: webrtc:answer (targetSocketId, answer)
                        │
                  Server forwards to Peer A
                        │
                  Peer A: setRemoteDescription(answer)

  ICE Candidates:
    Both peers exchange candidates via webrtc:ice-candidate events
    Server forwards them directly using targetSocketId routing

  Screen sharing:
    Caller calls replaceTrack() on each RTCPeerConnection sender
    No renegotiation needed — track replacement is instant
```

---

## Prerequisites

- **Node.js** >= 18
- **MongoDB** (local or MongoDB Atlas)
- **Git**

---

## Local Setup

### 1. Clone and install

```bash
git clone <your-repo-url> collabspace
cd collabspace

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/collabspace
JWT_SECRET=change_this_to_a_random_32_char_string_in_production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE_MB=50
UPLOAD_DIR=uploads
```

### 3. Run locally

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Vite starts on http://localhost:5173
```

Visit `http://localhost:5173`, register an account, create a room.

---

## Production Deployment

### Option A: VPS (Ubuntu/Debian with Nginx + PM2)

#### 1. Install dependencies on server

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 process manager
sudo npm install -g pm2

# Nginx
sudo apt-get install -y nginx
```

#### 2. Clone and build

```bash
git clone <your-repo> /var/www/collabspace
cd /var/www/collabspace

# Build frontend
cd frontend
npm ci
npm run build  # outputs to frontend/dist/

# Install backend
cd ../backend
npm ci --omit=dev
```

#### 3. Configure PM2

Create `/var/www/collabspace/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'collabspace-api',
    script: './backend/server.js',
    cwd: '/var/www/collabspace',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      MONGO_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/collabspace',
      JWT_SECRET: 'your_very_long_random_secret_here',
      CLIENT_URL: 'https://yourdomain.com',
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '500M',
  }],
};
```

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 4. Nginx config

Create `/etc/nginx/sites-available/collabspace`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Serve React frontend
    root /var/www/collabspace/frontend/dist;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io proxy (WebSocket upgrade required)
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Serve uploaded files
    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
    }

    # React SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/collabspace /etc/nginx/sites-enabled/
sudo certbot --nginx -d yourdomain.com  # SSL via Let's Encrypt
sudo nginx -t && sudo systemctl reload nginx
```

### Option B: Docker

```dockerfile
# Dockerfile.backend
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p uploads
EXPOSE 5000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.backend
    ports: ["5000:5000"]
    env_file: ./backend/.env
    volumes: ["uploads:/app/uploads"]
    depends_on: [mongo]
    restart: unless-stopped

  mongo:
    image: mongo:7
    volumes: ["mongo_data:/data/db"]
    restart: unless-stopped

volumes:
  uploads:
  mongo_data:
```

---

## Security Implementation

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs, cost factor 12 |
| JWT auth | HS256, 7-day expiry, verified on every socket connection |
| Rate limiting | 200 req/15min global, 20 req/15min on auth endpoints |
| HTTP headers | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| NoSQL injection | express-mongo-sanitize |
| File safety | Extension blocklist (.exe, .bat, .sh, .msi, .jar, .cmd) |
| CORS | Explicit origin whitelist |
| Input validation | Mongoose validators + controller checks |

**For E2E encryption in production**, integrate WebRTC's built-in DTLS-SRTP (already active) and add a TURN server. For database-level encryption of sensitive fields, use `mongoose-field-encryption` with a separate KMS-managed key.

---

## Memory Leak Prevention

### Frontend

- `useWebRTC` calls `cleanupAllPeers()` on unmount via the `useEffect` return
- `useMedia` calls `stopAllMedia()` on unmount via the `useEffect` return
- `RTCPeerConnection.close()` is called when `connectionState` becomes `disconnected/failed/closed`
- Socket event listeners use named functions, removed with `socket.off(event, handler)` in cleanup
- All `useEffect` closures use a `cancelled` flag to prevent state updates after unmount

### Backend

- `activeRooms` Map is cleaned when `roomPeers.size === 0`
- Room documents auto-expire via MongoDB TTL index (`expiresAt` field)
- Socket `disconnecting` event handles all rooms the socket was in
- `server.close()` on SIGTERM/SIGINT for graceful shutdown

---

## Common Debugging

### "Camera/microphone access denied"
- Check browser permissions for the site
- On Chrome: chrome://settings/content/camera
- HTTPS is required for `getUserMedia` in production (localhost is exempt)

### Black video tiles / no remote video
1. Check browser console for ICE errors
2. Behind symmetric NAT? You need a TURN server. Add to `ICE_SERVERS` in `useWebRTC.js`:
   ```javascript
   { urls: 'turn:your-turn.domain.com:3478', username: 'user', credential: 'pass' }
   ```
   Recommended TURN provider: Metered.ca, Twilio, or self-hosted Coturn

### Socket connects but WebRTC fails
- Both peers must be HTTPS (or both localhost) — mixed content blocks ICE
- Check `pc.iceConnectionState` in browser console
- Use `chrome://webrtc-internals` for full ICE candidate logs

### "Room not found" after creating
- Verify `MONGO_URI` is correct
- Check MongoDB is running: `mongosh` or `mongo`

### Screen share replaces wrong track
- Ensure `replaceTrack()` matches on `sender.track.kind === 'video'`
- The original camera track is restored by calling `replaceTrack(localStream)` after stopping screen share

### Files not persisting across sessions
- Uploads are stored in `backend/uploads/` — mount this as a Docker volume or external storage (S3) in production

---

## TURN Server Setup (Production)

For production deployments with users behind strict NATs or corporate firewalls:

```bash
# Install Coturn
sudo apt-get install coturn

# /etc/turnserver.conf
realm=yourdomain.com
fingerprint
lt-cred-mech
user=collabspace:yourpassword
log-file=/var/log/coturn/turnserver.log
```

Update `ICE_SERVERS` in `frontend/src/hooks/useWebRTC.js` with your TURN credentials.

---

## Environment Variables Reference

### Backend

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | No | Default: 5000 |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Min 32 random chars |
| `JWT_EXPIRES_IN` | No | Default: `7d` |
| `CLIENT_URL` | Yes | Frontend origin for CORS |
| `MAX_FILE_SIZE_MB` | No | Default: 50 |
| `UPLOAD_DIR` | No | Default: `uploads` |
"# CommunicationApp-Syntaxhub" 
