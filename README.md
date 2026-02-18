# 🚀 CommunicationWbApp — Real-Time Collaboration Platform

> A **MERN + Vite** collaboration platform enabling multi-user video conferencing, real-time whiteboarding, file sharing, and secure room-based communication.

CommunicationWbApp is designed with scalability, security, and real-time performance in mind. It uses **WebRTC mesh architecture** for peer-to-peer media exchange and **Socket.io** for signaling and live events.

---

## 📌 Repository

🔗 GitHub: [https://github.com/M-Saad-saif/CommunicationApp-Syntaxhub](https://github.com/M-Saad-saif/CommunicationApp-Syntaxhub)

---

# 🏗 Architecture Overview

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
        │   └── UI/            # Chat system
        ├── context/           # AuthContext (React Context + localStorage)
        ├── hooks/             # useWebRTC, useMedia
        ├── pages/             # Login, Register, Dashboard, Room
        └── styles/            # global.css
```

---

# ⚙️ Tech Stack

### Frontend

* ⚛️ React (Vite)
* 🎥 WebRTC (P2P video/audio)
* 🔌 Socket.io client
* 📦 Axios
* 🎨 Custom CSS

### Backend

* 🟢 Node.js
* 🚂 Express.js
* 🔄 Socket.io
* 🍃 MongoDB + Mongoose
* 🔐 JWT Authentication
* 📁 Multer (file uploads)
* 🛡 Helmet + Rate Limiting + Mongo Sanitize

---

# ✨ Core Features

### 🔐 Authentication

* JWT-based authentication
* Password hashing with bcrypt (cost factor 12)
* Secure HTTP headers with Helmet
* Rate limiting for API protection
* Socket authentication verification

---

### 📹 Multi-User Video Calling

* Mesh-based WebRTC architecture
* Dynamic peer discovery
* Screen sharing using `replaceTrack()`
* ICE candidate exchange
* Auto peer cleanup on disconnect

---

### 🧑‍🤝‍🧑 Room-Based Collaboration

* Create and join rooms
* Real-time user presence updates
* Room auto-expiry with MongoDB TTL index

---

### 🖌 Collaborative Whiteboard

* Canvas-based drawing
* Real-time synchronization via sockets
* Multi-user drawing support

---

### 📁 File Sharing

* Real-time file broadcast
* Extension blocklist protection
* File size limits
* Persistent storage (local or Docker volume)

---

### 💬 Live Chat

* Room-based real-time messaging
* Socket event broadcasting

---

# 🔁 WebRTC Signaling Flow

The platform uses a **Mesh P2P Architecture**.

1. User joins room → `room:join`
2. Server returns existing peers
3. Peer creates `RTCPeerConnection`
4. Offer → Answer exchange
5. ICE candidate forwarding via server
6. Direct P2P media transmission

Screen sharing:

* Uses `replaceTrack()`
* No renegotiation required
* Instant stream switch

---

# 🔒 Security Implementation

| Feature          | Implementation                |
| ---------------- | ----------------------------- |
| Password Hashing | bcryptjs (cost 12)            |
| JWT Auth         | HS256, 7-day expiry           |
| Rate Limiting    | 200 req/15min global          |
| Auth Limit       | 20 req/15min                  |
| Headers          | Helmet.js                     |
| NoSQL Injection  | express-mongo-sanitize        |
| File Safety      | Dangerous extension blocklist |
| CORS             | Explicit whitelist            |
| Input Validation | Mongoose + controller checks  |

WebRTC uses built-in **DTLS-SRTP encryption**.

---

# 🧠 Memory Leak Prevention

### Frontend

* Peer cleanup on unmount
* `RTCPeerConnection.close()` on disconnect
* Socket listeners removed in cleanup
* Media tracks stopped properly

### Backend

* Active rooms Map cleanup
* TTL auto-expiration
* Graceful shutdown handling

---

# 🛠 Local Development Setup

## Prerequisites

* Node.js >= 18
* MongoDB (local or Atlas)
* Git

---

## 1️⃣ Clone Repository

```bash
git clone https://github.com/M-Saad-saif/CommunicationApp-Syntaxhub.git collabspace
cd collabspace
```

---

## 2️⃣ Install Dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

---

## 3️⃣ Configure Environment

Create `backend/.env`:

```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/collabspace
JWT_SECRET=change_this_to_a_random_32_char_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE_MB=50
UPLOAD_DIR=uploads
```

---

## 4️⃣ Run Application

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

Visit:

```
http://localhost:5173
```

---

# 📦 Environment Variables Reference

| Variable         | Required | Description              |
| ---------------- | -------- | ------------------------ |
| NODE_ENV         | Yes      | development / production |
| PORT             | No       | Default 5000             |
| MONGO_URI        | Yes      | MongoDB connection       |
| JWT_SECRET       | Yes      | 32+ random characters    |
| JWT_EXPIRES_IN   | No       | Default 7d               |
| CLIENT_URL       | Yes      | Frontend origin          |
| MAX_FILE_SIZE_MB | No       | Default 50               |
| UPLOAD_DIR       | No       | Default uploads          |

---

# 👨‍💻 Author

**Saad Saif**
Full-Stack Developer | MERN Stack 

GitHub: [https://github.com/M-Saad-saif](https://github.com/M-Saad-saif)

---

# ⭐ Project Highlights

* Industry-grade architecture
* Production-ready security
* Clean separation of concerns
* Real-time peer-to-peer media exchange
* Designed for extensibility (SFU upgrade path)

---

If you found this project useful, consider giving it a ⭐ on GitHub!
