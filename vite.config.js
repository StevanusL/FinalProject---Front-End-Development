import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // json-server ikut mengawasi db.json; jangan reload halaman setiap db.json berubah
    watch: { ignored: ['**/db.json'] },
  },
});
