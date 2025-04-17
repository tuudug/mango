/// <reference lib="webworker" />

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

// Precache all assets defined in the Vite build manifest
// The 'self.__WB_MANIFEST' will be injected by Workbox during the build
precacheAndRoute(self.__WB_MANIFEST || []);

// Example: Cache API calls using StaleWhileRevalidate strategy
// Adjust the pattern as needed for your API routes
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new StaleWhileRevalidate({
    cacheName: "api-cache",
    plugins: [
      // You might want to add expiration or other plugins here
    ],
  })
);

// --- Push Notification Event Listener ---
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push Received.");
  console.log(`[Service Worker] Push had this data: "${event.data?.text()}"`);

  let notificationData = {
    title: "Mango Reminder",
    body: "Something needs your attention!",
  };
  try {
    if (event.data) {
      const parsedData = JSON.parse(event.data.text());
      // Expecting { title: string, body: string, ...other options }
      if (parsedData.title && parsedData.body) {
        notificationData = parsedData;
      } else {
        console.warn(
          "[Service Worker] Push data missing title or body:",
          parsedData
        );
      }
    }
  } catch (e) {
    console.error("[Service Worker] Error parsing push data:", e);
    // Use default data if parsing fails
  }

  const options = {
    body: notificationData.body,
    icon: "/favicon.png", // Path to app icon
    badge: "/favicon.png", // Path to badge icon (often monochrome)
    // Add other options like actions, vibrate, etc. if needed
    // data: { url: '/' } // Example: data to use on notification click
  };

  const notificationPromise = self.registration.showNotification(
    notificationData.title,
    options
  );

  // --- Send message to clients to trigger refetch ---
  const refetchPromise = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clientList) => {
      if (clientList.length > 0) {
        console.log(
          `[Service Worker] Posting 'REFETCH_DATA' message to ${clientList.length} clients.`
        );
        clientList.forEach((client) => {
          client.postMessage({ type: "REFETCH_DATA" });
        });
      } else {
        console.log("[Service Worker] No clients found to post message to.");
      }
    })
    .catch((err) => {
      console.error("[Service Worker] Error matching/posting to clients:", err);
    });
  // --- End send message ---

  // Wait for both notification and message posting attempt
  event.waitUntil(Promise.all([notificationPromise, refetchPromise]));
});

// --- Notification Click Event Listener ---
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification click Received.");

  event.notification.close();

  // Example: Focus or open the app window
  // You might want to navigate to a specific URL based on notification data
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === "/" && "focus" in client) {
            // Adjust URL check if needed
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow("/"); // Open the base URL
        }
      })
  );
});

// Optional: Skip waiting phase to activate the new service worker faster
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
