import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: '', isPrivate: false, passcode: '' });
  const [error, setError] = useState('');
  const [joinId, setJoinId] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms/my');
      setRooms(res.data.rooms);
    } catch {
      setError('Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!roomForm.name.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/rooms', roomForm);
      setRooms(prev => [res.data.room, ...prev]);
      setShowCreateModal(false);
      setRoomForm({ name: '', isPrivate: false, passcode: '' });
      navigate(`/room/${res.data.room.roomId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (roomId) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      await api.delete(`/rooms/${roomId}`);
      setRooms(prev => prev.filter(r => r.roomId !== roomId));
    } catch {
      setError('Failed to delete room.');
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const id = joinId.trim();
    if (id) navigate(`/room/${id}`);
  };

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo">
          <span className="dash-logo-icon">⬡</span>
          <span>CollabSpace</span>
        </div>
        <div className="dash-user">
          <span className="dash-username">@{user?.username}</span>
          <button className="btn-ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-hero">
          <h1>Your Collaboration Hub</h1>
          <p>Create or join rooms for video calls, whiteboarding, and file sharing.</p>
        </div>

        {error && <div className="dash-error" role="alert">{error} <button onClick={() => setError('')}>✕</button></div>}

        <div className="dash-actions">
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create Room
          </button>
          <form className="join-form" onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Enter Room ID to join"
              value={joinId}
              onChange={e => setJoinId(e.target.value)}
            />
            <button type="submit" className="btn-secondary" disabled={!joinId.trim()}>
              Join
            </button>
          </form>
        </div>

        <section className="dash-rooms">
          <h2>Your Rooms</h2>
          {loading ? (
            <div className="rooms-loader"><div className="spinner" /></div>
          ) : rooms.length === 0 ? (
            <div className="rooms-empty">
              <span>🚀</span>
              <p>No rooms yet. Create one to start collaborating!</p>
            </div>
          ) : (
            <div className="rooms-grid">
              {rooms.map(room => (
                <div key={room.roomId} className="room-card">
                  <div className="room-card-header">
                    <div className="room-icon">{room.name.charAt(0).toUpperCase()}</div>
                    {room.isPrivate && <span className="room-badge">Private</span>}
                  </div>
                  <h3 className="room-name">{room.name}</h3>
                  <p className="room-id">ID: {room.roomId.slice(0, 8)}…</p>
                  <p className="room-date">Created {new Date(room.createdAt).toLocaleDateString()}</p>
                  <div className="room-actions">
                    <button className="btn-primary btn-sm" onClick={() => navigate(`/room/${room.roomId}`)}>
                      Enter
                    </button>
                    <button
                      className="btn-icon btn-danger-ghost"
                      onClick={() => handleDelete(room.roomId)}
                      aria-label="Delete room"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Room</h2>
              <button className="btn-ghost" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-group">
                <label>Room Name</label>
                <input
                  type="text"
                  value={roomForm.name}
                  onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Design Review, Sprint Sync…"
                  maxLength={60}
                  required
                  autoFocus
                />
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={roomForm.isPrivate}
                  onChange={e => setRoomForm(f => ({ ...f, isPrivate: e.target.checked }))}
                />
                <span>Private room (require passcode)</span>
              </label>
              {roomForm.isPrivate && (
                <div className="form-group">
                  <label>Passcode</label>
                  <input
                    type="text"
                    value={roomForm.passcode}
                    onChange={e => setRoomForm(f => ({ ...f, passcode: e.target.value }))}
                    placeholder="Room passcode"
                  />
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
