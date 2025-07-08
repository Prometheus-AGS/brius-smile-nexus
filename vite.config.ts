import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true, // Listen on all addresses
    port: 8080,
    strictPort: true,
    cors: {
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      preflightContinue: false,
      optionsSuccessStatus: 204,
      credentials: true,
      allowedHeaders: "*"
    },
    allowedHosts: true, // Allow all hosts
    proxy: {}, // Empty proxy to ensure Vite doesn't interfere with nginx
    hmr: {
      port: 8080, // Use same port as dev server
      host: 'localhost',
    },
  },
  preview: {
    allowedHosts: true, // Allow all hosts
    host: true, // Listen on all addresses
    port: 8080,
    strictPort: true,
    cors: {
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      preflightContinue: false,
      optionsSuccessStatus: 204,
      credentials: true,
      allowedHeaders: "*"
    },
  },
  plugins: [
    react(),
    // Only use componentTagger in development mode
    process.env.NODE_ENV === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
