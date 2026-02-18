import React from 'react';
import VideoTile from './VideoTile';
import './VideoGrid.css';

export default function VideoGrid({ localStream, remoteStreams, localUser, audioEnabled, videoEnabled, peers }) {
  const remoteEntries = Object.entries(remoteStreams);
  const totalCount = 1 + remoteEntries.length;

  const gridClass = totalCount === 1 ? 'grid-solo'
    : totalCount === 2 ? 'grid-duo'
    : totalCount <= 4 ? 'grid-quad'
    : 'grid-multi';

  return (
    <div className={`video-grid ${gridClass}`}>
      <VideoTile
        stream={localStream}
        username={localUser?.username || 'You'}
        isLocal
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
      />
      {remoteEntries.map(([socketId, { stream, username }]) => (
        <VideoTile
          key={socketId}
          stream={stream}
          username={username}
          audioEnabled={peers[socketId]?.audioEnabled !== false}
          videoEnabled={peers[socketId]?.videoEnabled !== false}
        />
      ))}
    </div>
  );
}
