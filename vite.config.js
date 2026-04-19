import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

// Obtener IP local automáticamente para desarrollo en red local
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,      // escucha en 0.0.0.0 — accesible desde celular en la misma WiFi
    port: 5173,
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separar node_modules en chunks individuales
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'recharts';
            if (id.includes('react-router')) return 'react-router';
            if (id.includes('socket.io')) return 'socket';
            if (id.includes('react') || id.includes('react-dom')) return 'react';
            if (id.includes('@dnd-kit')) return 'dnd-kit';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
    reportCompressedSize: true,
    cssCodeSplit: true,
  },
  // Optimizaciones de dependencias
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
