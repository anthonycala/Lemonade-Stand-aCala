import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages project site: /Lemonade-Stand-aCala/
// Local/dev and other hosts: /
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "assets/lemonade-bucket.jpg",
        "assets/slime-product.jpg",
      ],
      manifest: {
        name: "Nayeli's Sliminade Stand Kiosk",
        short_name: "Sliminade",
        description:
          "Tap to sell lemonade and slime bundles. Track inventory and hard costs.",
        theme_color: "#FF4FA3",
        background_color: "#FFF8E7",
        display: "standalone",
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,jpg,png,ico,webmanifest}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
