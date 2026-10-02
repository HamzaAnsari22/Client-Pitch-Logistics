import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Served from https://<user>.github.io/Client-Pitch-Logistics/ on GitHub Pages.
export default defineConfig({
  base: '/Client-Pitch-Logistics/',
  plugins: [react(), tailwindcss()],
});
