import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})

//import { defineConfig } from 'vite'
//import react from '@vitejs/plugin-react'
//
//export default defineConfig({
//  plugins: [react()],
//  server: {
//    port: 3000,
//    host: true,                    // ← Add this (allows access from ngrok)
//    allowedHosts: [
//      'kian-inscrutable-contessa.ngrok-free.dev',   // ← Add your exact ngrok domain
//      '.ngrok-free.dev'                             // ← Optional: allows all ngrok subdomains
//    ],
//    proxy: {
//      '/api': {
//        target: 'http://localhost:8000',   // your backend port
//        changeOrigin: true,
//        secure: false
//      }
//    },
//    hmr: {
//      clientPort: 443                    // ← Important for ngrok (HTTPS)
//    }
//  }
//})


//import { defineConfig } from 'vite'
//import react from '@vitejs/plugin-react'
//
//export default defineConfig({
//  plugins: [react()],
//  server: {
//    port: 3000,
//    host: true,                    // Allow external access (ngrok)
//    allowedHosts: true,            // ← Safest for development with ngrok (allows any host)
//
//    proxy: {
//      '/api': {
//        target: 'http://localhost:8000',
//        changeOrigin: true,
//        secure: false,
//      }
//    },
//
//    // Better HMR settings for ngrok / external access
//    hmr: {
//      host: 'localhost',
//      protocol: 'ws',              // Use ws instead of wss
//      port: 3000,                  // Use same port as server
//    }
//  }
//})
