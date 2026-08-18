import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  // 生产环境下的公共路径, 生产环境用 /tanker
  base: process.env.NODE_ENV === 'production' ? '/tanker/' : '/',
  plugins: [vue()],
  server: {
    host: true,
    port: 8081,
    proxy: {
      "/tank-game-api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },

});
