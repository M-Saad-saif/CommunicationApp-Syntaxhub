import React from 'react';
import './CallControls.css';

export default function CallControls({
  audioEnabled, videoEnabled, isScreenSharing,
  onToggleAudio, onToggleVideo, onScreenShare, onLeave,
}) {
  return (
    <div className="call-controls">
      <button
        className={`ctrl-btn ${!audioEnabled ? 'ctrl-off' : ''}`}
        onClick={onToggleAudio}
        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        <span>{audioEnabled ? '🎙' : '🔇'}</span>
        <span className="ctrl-label">{audioEnabled ? 'Mute' : 'Unmute'}</span>
      </button>

      <button
        className={`ctrl-btn ${!videoEnabled ? 'ctrl-off' : ''}`}
        onClick={onToggleVideo}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
        aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        <span>{videoEnabled ? '📹' : '📷'}</span>
        <span className="ctrl-label">{videoEnabled ? 'Camera' : 'No Cam'}</span>
      </button>

      <button
        className={`ctrl-btn ${isScreenSharing ? 'ctrl-active' : ''}`}
        onClick={onScreenShare}
        title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
        aria-label={isScreenSharing ? 'Stop screen share' : 'Share screen'}
      >
        <span>🖥</span>
        <span className="ctrl-label">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
      </button>

      <div className="ctrl-divider" />

      <button
        className="ctrl-btn ctrl-danger"
        onClick={onLeave}
        title="Leave room"
        aria-label="Leave room"
      >
        <span>📴</span>
        <span className="ctrl-label">Leave</span>
      </button>
    </div>
  );
}
