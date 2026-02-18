import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import './FileShare.css';

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FileShare({ socket, roomId }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [progress, setProgress] = useState(0);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await api.get(`/files/${roomId}`);
      setFiles(res.data.files);
    } catch {
      // Silently fail on initial load
    }
  }, [roomId]);

  useEffect(() => {
    fetchFiles();

    const handleNewFile = (e) => {
      setFiles(prev => [...prev, e.detail.file]);
    };

    window.addEventListener('file:new', handleNewFile);
    return () => window.removeEventListener('file:new', handleNewFile);
  }, [fetchFiles]);

  const uploadFile = async (file) => {
    if (!file) return;

    const maxMB = 50;
    if (file.size > maxMB * 1024 * 1024) {
      setUploadError(`File exceeds ${maxMB}MB limit.`);
      return;
    }

    setUploading(true);
    setUploadError('');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/files/${roomId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      const newFile = res.data.file;
      setFiles(prev => [...prev, newFile]);

      socket?.emit('file:shared', {
        roomId,
        file: newFile,
        username: 'You',
      });
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="file-share">
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>Uploading… {progress}%</span>
          </div>
        ) : (
          <>
            <span className="upload-icon">📤</span>
            <p>Drag & drop files here, or</p>
            <label className="upload-btn">
              Choose File
              <input type="file" hidden onChange={handleFileInput} />
            </label>
            <p className="upload-hint">Max 50MB per file</p>
          </>
        )}
      </div>

      {uploadError && (
        <div className="file-error">⚠️ {uploadError}</div>
      )}

      <div className="file-list">
        <h3>Shared Files ({files.length})</h3>
        {files.length === 0 ? (
          <div className="file-empty">
            <span>📂</span>
            <p>No files shared yet</p>
          </div>
        ) : (
          <div className="files">
            {files.map((file, idx) => (
              <div key={idx} className="file-item">
                <div className="file-icon">{getFileIcon(file.name)}</div>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-meta">{formatBytes(file.size)}</span>
                </div>
                <a
                  href={file.url}
                  download={file.name}
                  className="file-download"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download"
                >
                  ⬇
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼';
  if (['mp4','webm','mov','avi'].includes(ext)) return '🎬';
  if (['mp3','wav','ogg'].includes(ext)) return '🎵';
  if (['pdf'].includes(ext)) return '📄';
  if (['doc','docx'].includes(ext)) return '📝';
  if (['xls','xlsx','csv'].includes(ext)) return '📊';
  if (['zip','rar','tar','gz'].includes(ext)) return '🗜';
  if (['js','ts','jsx','tsx','py','json'].includes(ext)) return '💻';
  return '📁';
}
