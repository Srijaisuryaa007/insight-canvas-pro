import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Tauri expects a fixed dev port
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    target: "es2021",
    sourcemap: false,
  },
});
