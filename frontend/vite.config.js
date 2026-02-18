import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://communicationapp-syntaxhub.onrender.com',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://communicationapp-syntaxhub.onrender.com',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://communicationapp-syntaxhub.onrender.com',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
