import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Get the directory name in an ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt", // Changed from "autoUpdate"
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "My Awesome PWA App",
        short_name: "MyPWA",
        description: "My Awesome Progressive Web App!",
        theme_color: "#ffffff",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      // Add this configuration
      workbox: {
        // Ensure API requests are not intercepted by the service worker's navigation fallback.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Add server proxy configuration
  server: {
    proxy: {
      // Proxy requests starting with /api to the backend server on port 3001
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true, // Needed for virtual hosted sites
        // secure: false, // Uncomment if backend is not using HTTPS
        // rewrite: (path) => path.replace(/^\/api/, '') // Uncomment if you want to remove /api prefix when proxying
      },
    },
  },
});
