import { defineConfig } from 'vite';

export default defineConfig({
  root: './src',
  server: {
    // Security: Restrict file system access to prevent directory traversal
    fs: {
      deny: ['**/node_modules/**', '**/.git/**', '**/.env*'],
      strict: true,
    },
    cors: {
      origin: ['http://localhost:8081', 'http://127.0.0.1:8081'],
      credentials: true,
    },
  },
  build: {
    outDir: '../dist',
    minify: false,
    emptyOutDir: true,
  },
});
