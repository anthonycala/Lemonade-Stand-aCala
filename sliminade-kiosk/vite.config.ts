import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages project site: /Lemonade-Stand-aCala/
// Local/dev and other hosts: /
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
