import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  base: "/mor-v4/",

  plugins: [react()],

  server: {
    host: "127.0.0.1",
    port: 5174,

    proxy: {
      "/api": {
        target: "http://127.0.0.1:8010",
        changeOrigin: false,
      },
    },
  },
})
