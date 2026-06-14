import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/holdem-helper/',
  server: {
    port: 4173,
  },
});
