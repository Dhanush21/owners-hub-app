import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    // Security: Restrict file system access to prevent directory traversal
    fs: {
      // Deny access to files outside of the project root
      deny: ['**/node_modules/**', '**/.git/**', '**/.env*'],
      // Strict mode: only allow access to files within the project
      strict: true,
    },
    // Security: Only allow requests from allowed origins in development
    cors: {
      origin: mode === 'development' ? ['http://localhost:8081', 'http://127.0.0.1:8081'] : true,
      credentials: true,
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize build output
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-toast', '@radix-ui/react-tabs'],
        },
      },
    },
    // Use esbuild for minification (default, faster than terser)
    minify: 'esbuild',
    // Remove console logs and debugger in production
    ...(mode === 'production' && {
      esbuild: {
        drop: ['console', 'debugger'],
      },
    }),
  },
  // Enable CSS code splitting
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
}));
