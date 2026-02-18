import { useEffect, useRef, useCallback, useState } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers for production:
    // { urls: 'turn:your-turn-server.com', username: '...', credential: '...' }
  ],
};

export const useWebRTC = ({ socket, roomId, localStream, username }) => {
  const peersRef = useRef({}); // socketId -> RTCPeerConnection
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> { stream, username }

  const createPeerConnection = useCallback((targetSocketId, targetUsername) => {
    if (peersRef.current[targetSocketId]) {
      return peersRef.current[targetSocketId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('webrtc:ice-candidate', { targetSocketId, candidate });
      }
    };

    // Remote stream arrived
    pc.ontrack = ({ streams }) => {
      if (streams[0]) {
        setRemoteStreams(prev => ({
          ...prev,
          [targetSocketId]: { stream: streams[0], username: targetUsername },
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        cleanupPeer(targetSocketId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };

    peersRef.current[targetSocketId] = pc;
    return pc;
  }, [localStream, socket]);

  const initiateCall = useCallback(async (targetSocketId, targetUsername) => {
    const pc = createPeerConnection(targetSocketId, targetUsername);

    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);

    socket?.emit('webrtc:offer', { targetSocketId, offer, fromSocketId: socket.id, username });
  }, [createPeerConnection, socket, username]);

  const handleOffer = useCallback(async ({ offer, fromSocketId, username: remoteUsername }) => {
    const pc = createPeerConnection(fromSocketId, remoteUsername);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket?.emit('webrtc:answer', { targetSocketId: fromSocketId, answer });
  }, [createPeerConnection, socket]);

  const handleAnswer = useCallback(async ({ answer, fromSocketId }) => {
    const pc = peersRef.current[fromSocketId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const handleIceCandidate = useCallback(async ({ candidate, fromSocketId }) => {
    const pc = peersRef.current[fromSocketId];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('ICE candidate error:', err.message);
      }
    }
  }, []);

  const cleanupPeer = useCallback((socketId) => {
    const pc = peersRef.current[socketId];
    if (pc) {
      pc.close();
      delete peersRef.current[socketId];
    }
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  const replaceTrack = useCallback((newStream) => {
    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) return;

    Object.values(peersRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newVideoTrack).catch(console.error);
      }
    });
  }, []);

  const cleanupAllPeers = useCallback(() => {
    Object.keys(peersRef.current).forEach(cleanupPeer);
    setRemoteStreams({});
  }, [cleanupPeer]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const onExistingPeers = ({ peers }) => {
      peers.forEach(({ socketId, username: peerUsername }) => {
        initiateCall(socketId, peerUsername);
      });
    };

    const onPeerJoined = ({ socketId, username: peerUsername }) => {
      // Joiner initiates; existing peers wait for offer
    };

    socket.on('room:existing-peers', onExistingPeers);
    socket.on('room:peer-joined', onPeerJoined);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('room:peer-left', ({ socketId }) => cleanupPeer(socketId));

    return () => {
      socket.off('room:existing-peers', onExistingPeers);
      socket.off('room:peer-joined', onPeerJoined);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('room:peer-left');
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate, initiateCall, cleanupPeer]);

  return { remoteStreams, initiateCall, replaceTrack, cleanupAllPeers };
};
