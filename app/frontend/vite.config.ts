import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,

    proxy: {
      "/api": { /**'http://localhost:5000' (uncomment this and comment the below 2 lines if u want to run in localhost)*/ 
        target: "http://backend:5000",
        changeOrigin: true,
      },
    },
  },
})


/** This is a description of the foo function. */
