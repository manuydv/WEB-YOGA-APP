import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        checkin: fileURLToPath(new URL("./checkin.html", import.meta.url)),
        trainer: fileURLToPath(new URL("./trainer.html", import.meta.url)),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      workbox: {
        // Without this, the generated service worker's navigateFallback
        // answers EVERY navigation it doesn't have an exact precache
        // match for with the cached index.html — including
        // /checkin/<slug> and /trainer/<slug>, whose slug makes them
        // never match a precached URL exactly. That silently overrides
        // Vercel's rewrite to checkin.html/trainer.html, always landing
        // on the owner app regardless of what either file contains.
        navigateFallbackDenylist: [/^\/checkin\//, /^\/trainer\//],
      },
      manifest: {
        name: "TaraShaktiYoga",
        short_name: "TaraShaktiYoga",
        description: "Member, payment, and financial tracking for studios and shops.",
        theme_color: "#F4EFE2",
        background_color: "#F4EFE2",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
