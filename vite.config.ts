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
      // registerType: "autoUpdate", // No longer needed with injectManifest
      strategies: "injectManifest", // Use custom SW
      srcDir: "src", // Directory containing the SW source file
      filename: "sw.ts", // Name of the SW source file
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Mango",
        short_name: "Mango",
        description: "The only assistant you need.",
        theme_color: "#1f2937", // Dark theme color
        icons: [
          {
            src: "favicon.png", // Assuming this is ~192x192
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon.png", // Assuming this is ~512x512
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon.png", // Use the larger icon for maskable
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      // Add this configuration
      // workbox: { // Workbox options are configured within sw.ts when using injectManifest
      //   // Ensure API requests are not intercepted by the service worker's navigation fallback.
      //   navigateFallbackDenylist: [/^\/api/],
      // },
      devOptions: {
        enabled: true, // Enable PWA features in dev mode for testing SW
        type: "module", // Needed for SW in dev mode
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
