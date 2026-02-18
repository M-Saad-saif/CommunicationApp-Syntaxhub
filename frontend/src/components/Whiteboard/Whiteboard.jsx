import React, { useRef, useEffect, useState, useCallback } from 'react';
import './Whiteboard.css';

const COLORS = ['#e2e8f0', '#6c63ff', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];
const SIZES = [2, 4, 8, 14, 22];

export default function Whiteboard({ socket, roomId }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [color, setColor] = useState('#e2e8f0');
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState('pen'); // pen | eraser
  const [history, setHistory] = useState([]);

  // Draw a line segment locally
  const drawSegment = useCallback((canvas, from, to, strokeColor, strokeSize) => {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, []);

  const getPos = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  }, [getPos]);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    const strokeColor = tool === 'eraser' ? '#0f1117' : color;

    drawSegment(canvas, lastPos.current, pos, strokeColor, tool === 'eraser' ? size * 4 : size);

    const event = { from: lastPos.current, to: pos, color: strokeColor, size: tool === 'eraser' ? size * 4 : size };
    socket.emit('whiteboard:draw', { roomId, event });

    lastPos.current = pos;
  }, [color, size, tool, getPos, drawSegment, socket, roomId]);

  const stopDraw = useCallback(() => {
    if (isDrawing.current) {
      isDrawing.current = false;
      // Save snapshot for undo
      const canvas = canvasRef.current;
      setHistory(prev => [...prev.slice(-19), canvas.toDataURL()]);
    }
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('whiteboard:clear', { roomId });
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (history.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const prev = history.slice(0, -1);
    setHistory(prev);
    if (prev.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      const img = new Image();
      img.src = prev[prev.length - 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  };

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onDraw = ({ event }) => {
      const canvas = canvasRef.current;
      if (canvas) drawSegment(canvas, event.from, event.to, event.color, event.size);
    };

    const onClear = () => {
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    };

    const onState = ({ state }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const img = new Image();
      img.src = state;
      img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0);
    };

    const onStateRequest = ({ requestingSocketId }) => {
      const canvas = canvasRef.current;
      if (canvas) {
        socket.emit('whiteboard:send-state', { targetSocketId: requestingSocketId, state: canvas.toDataURL() });
      }
    };

    socket.emit('whiteboard:request-state', { roomId });

    socket.on('whiteboard:draw', onDraw);
    socket.on('whiteboard:clear', onClear);
    socket.on('whiteboard:state', onState);
    socket.on('whiteboard:send-state-request', onStateRequest);

    return () => {
      socket.off('whiteboard:draw', onDraw);
      socket.off('whiteboard:clear', onClear);
      socket.off('whiteboard:state', onState);
      socket.off('whiteboard:send-state-request', onStateRequest);
    };
  }, [socket, roomId, drawSegment]);

  return (
    <div className="whiteboard-container">
      <div className="wb-toolbar">
        <div className="wb-tool-group">
          <button
            className={`wb-tool-btn ${tool === 'pen' ? 'active' : ''}`}
            onClick={() => setTool('pen')}
            title="Pen"
          >✏️</button>
          <button
            className={`wb-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Eraser"
          >🧹</button>
        </div>

        <div className="wb-tool-group">
          {COLORS.map(c => (
            <button
              key={c}
              className={`wb-color-btn ${color === c && tool === 'pen' ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => { setColor(c); setTool('pen'); }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <div className="wb-tool-group">
          {SIZES.map(s => (
            <button
              key={s}
              className={`wb-size-btn ${size === s ? 'active' : ''}`}
              onClick={() => setSize(s)}
              aria-label={`Size ${s}`}
            >
              <span style={{ width: s, height: s, background: 'currentColor', borderRadius: '50%', display: 'block' }} />
            </button>
          ))}
        </div>

        <div className="wb-tool-group">
          <button className="wb-tool-btn" onClick={handleUndo} title="Undo">↩</button>
          <button className="wb-tool-btn wb-clear" onClick={handleClear} title="Clear all">🗑</button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="wb-canvas"
        width={1920}
        height={1080}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
        style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
      />
    </div>
  );
}
