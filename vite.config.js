import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use a relative base so the app works when served
// from a subpath (avoids asset 404s like "page not found").
export default defineConfig(({ mode }) => ({
  //base: "./",
  //base: "/indie-game-pix/",
  base: mode === "production" ? "/indie-game-pix/" : "/",
  plugins: [react()],
  server: { port: 5173, open: false },
  build: {
    outDir: './dist'
    // rollupOptions: {
    //   output: {
    //     entryFileNames: `assets/[name].js`,
    //     chunkFileNames: `assets/[name].js`,
    //     assetFileNames: `assets/[name].[ext]`
    //   }
    // }
  }
}));
