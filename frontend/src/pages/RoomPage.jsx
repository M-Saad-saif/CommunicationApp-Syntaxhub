import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../api/socket';
import { useMedia } from '../hooks/useMedia';
import { useWebRTC } from '../hooks/useWebRTC';
import VideoGrid from '../components/Call/VideoGrid';
import CallControls from '../components/Call/CallControls';
import Whiteboard from '../components/Whiteboard/Whiteboard';
import FileShare from '../components/FileShare/FileShare';
import Chat from '../components/UI/Chat';
import api from '../api/axios';
import './RoomPage.css';

const TABS = ['video', 'whiteboard', 'files', 'chat'];

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('video');
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [peers, setPeers] = useState({}); // socketId -> { username, audioEnabled, videoEnabled }
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const {
    localStream, screenStream, audioEnabled, videoEnabled, isScreenSharing,
    error: mediaError, startMedia, toggleAudio, toggleVideo,
    startScreenShare, stopScreenShare, stopAllMedia,
  } = useMedia();

  const socketRef = useRef(null);

  const { remoteStreams, replaceTrack, cleanupAllPeers } = useWebRTC({
    socket: socketRef.current,
    roomId,
    localStream,
    username: user?.username,
  });

  // Initialize room and socket
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const roomRes = await api.get(`/rooms/${roomId}`);
        if (!cancelled) setRoom(roomRes.data.room);
      } catch {
        if (!cancelled) setError('Room not found or access denied.');
        return;
      }

      try {
        await startMedia();
      } catch {
        // Media error is shown via mediaError state; allow joining without camera
      }

      const token = localStorage.getItem('token');
      const sock = connectSocket(token);
      socketRef.current = sock;
      if (!cancelled) setSocket(sock);

      sock.on('connect', () => {
        if (cancelled) return;
        setConnected(true);
        sock.emit('room:join', { roomId, username: user?.username });
      });

      sock.on('disconnect', () => !cancelled && setConnected(false));

      sock.on('room:peer-joined', ({ socketId, username }) => {
        if (cancelled) return;
        setPeers(prev => ({ ...prev, [socketId]: { username, audioEnabled: true, videoEnabled: true } }));
      });

      sock.on('room:peer-left', ({ socketId }) => {
        if (cancelled) return;
        setPeers(prev => { const n = { ...prev }; delete n[socketId]; return n; });
      });

      sock.on('room:existing-peers', ({ peers: existingPeers }) => {
        if (cancelled) return;
        const map = {};
        existingPeers.forEach(p => { map[p.socketId] = { username: p.username, audioEnabled: true, videoEnabled: true }; });
        setPeers(map);
      });

      sock.on('media:toggle', ({ fromSocketId, type, enabled }) => {
        if (cancelled) return;
        setPeers(prev => ({
          ...prev,
          [fromSocketId]: { ...(prev[fromSocketId] || {}), [`${type}Enabled`]: enabled },
        }));
      });

      sock.on('chat:message', (msg) => {
        if (cancelled) return;
        setChatMessages(prev => [...prev, msg]);
        setUnreadChat(prev => prev + 1);
      });

      sock.on('file:shared', ({ file, username }) => {
        if (cancelled) return;
        // Trigger FileShare re-fetch via event
        window.dispatchEvent(new CustomEvent('file:new', { detail: { file, username } }));
      });
    };

    init();

    return () => {
      cancelled = true;
      const sock = socketRef.current;
      if (sock) {
        sock.emit('room:leave', { roomId });
        sock.off('connect');
        sock.off('disconnect');
        sock.off('room:peer-joined');
        sock.off('room:peer-left');
        sock.off('room:existing-peers');
        sock.off('media:toggle');
        sock.off('chat:message');
        sock.off('file:shared');
      }
      cleanupAllPeers();
      stopAllMedia();
      disconnectSocket();
    };
  }, [roomId]); // eslint-disable-line

  const handleToggleAudio = () => {
    toggleAudio();
    socketRef.current?.emit('media:toggle', { roomId, type: 'audio', enabled: !audioEnabled });
  };

  const handleToggleVideo = () => {
    toggleVideo();
    socketRef.current?.emit('media:toggle', { roomId, type: 'video', enabled: !videoEnabled });
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      socketRef.current?.emit('webrtc:screen-share', { roomId, isSharing: false });
      if (localStream) replaceTrack(localStream);
    } else {
      try {
        const screen = await startScreenShare();
        socketRef.current?.emit('webrtc:screen-share', { roomId, isSharing: true });
        replaceTrack(screen);
      } catch { /* user cancelled */ }
    }
  };

  const handleLeave = () => {
    navigate('/dashboard');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'chat') setUnreadChat(0);
  };

  const sendChat = (message) => {
    socketRef.current?.emit('chat:message', { roomId, message, username: user?.username });
  };

  if (error) {
    return (
      <div className="room-error-page">
        <div className="room-error-card">
          <span>⚠️</span>
          <h2>{error}</h2>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="room-header-left">
          <span className="dash-logo-icon" style={{ color: 'var(--color-primary)', fontSize: '1.3rem' }}>⬡</span>
          <div>
            <h1 className="room-title">{room?.name || 'Loading…'}</h1>
            <div className={`room-status ${connected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot" />
              {connected ? 'Connected' : 'Connecting…'}
            </div>
          </div>
        </div>

        <nav className="room-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`room-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab === 'video' && '📹'}
              {tab === 'whiteboard' && '🎨'}
              {tab === 'files' && '📁'}
              {tab === 'chat' && (
                <>💬{unreadChat > 0 && activeTab !== 'chat' && <span className="badge">{unreadChat}</span>}</>
              )}
              <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </button>
          ))}
        </nav>

        <div className="room-header-right">
          <span className="peer-count">{Object.keys(remoteStreams).length + 1} participant{Object.keys(remoteStreams).length !== 0 ? 's' : ''}</span>
        </div>
      </header>

      {mediaError && (
        <div className="media-error-banner">⚠️ {mediaError}</div>
      )}

      <main className="room-content">
        <div className={`tab-panel ${activeTab === 'video' ? 'active' : ''}`}>
          <VideoGrid
            localStream={isScreenSharing ? screenStream : localStream}
            remoteStreams={remoteStreams}
            localUser={user}
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            peers={peers}
          />
        </div>

        <div className={`tab-panel ${activeTab === 'whiteboard' ? 'active' : ''}`}>
          {socket && (
            <Whiteboard socket={socket} roomId={roomId} />
          )}
        </div>

        <div className={`tab-panel ${activeTab === 'files' ? 'active' : ''}`}>
          <FileShare socket={socket} roomId={roomId} />
        </div>

        <div className={`tab-panel ${activeTab === 'chat' ? 'active' : ''}`}>
          <Chat messages={chatMessages} onSend={sendChat} currentUser={user} />
        </div>
      </main>

      <CallControls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onScreenShare={handleScreenShare}
        onLeave={handleLeave}
      />
    </div>
  );
}
