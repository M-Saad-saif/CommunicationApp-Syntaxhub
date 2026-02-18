import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';

export default function Chat({ messages, onSend, currentUser }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg) return;
    onSend(msg);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span>💬</span>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === currentUser?._id;
            return (
              <div key={msg.id} className={`chat-msg ${isOwn ? 'own' : ''}`}>
                {!isOwn && <span className="chat-author">{msg.username}</span>}
                <div className="chat-bubble">{msg.message}</div>
                <span className="chat-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          maxLength={1000}
        />
        <button type="submit" className="chat-send" disabled={!input.trim()} aria-label="Send">
          ➤
        </button>
      </form>
    </div>
  );
}
