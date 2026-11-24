import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// strictPort: the API only allows requests from CLIENT_URL (http://localhost:5173 by default).
// If port 5173 is busy, Vite stops with an error instead of silently moving to 5174 and getting blocked by CORS.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true }
});
