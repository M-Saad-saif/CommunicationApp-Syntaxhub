import React, { useRef, useEffect } from 'react';
import './VideoTile.css';

export default function VideoTile({ stream, username, isLocal, audioEnabled, videoEnabled }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = username ? username.slice(0, 2).toUpperCase() : '??';

  return (
    <div className="video-tile">
      {stream && videoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="video-el"
        />
      ) : (
        <div className="video-avatar">
          <span>{initials}</span>
        </div>
      )}

      <div className="video-label">
        {!audioEnabled && <span className="muted-icon" title="Muted">🔇</span>}
        <span className="video-name">{isLocal ? `${username} (You)` : username}</span>
      </div>
    </div>
  );
}
