import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/parks\/index\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'parks-index' }
          },
          {
            urlPattern: /\/data\/parks\/.*\/info\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'parks-info',
              expiration: { maxAgeSeconds: 86400 }
            }
          },
          {
            urlPattern: /\/data\/parks\/.*\/conditions\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'parks-conditions' }
          },
          {
            urlPattern: /\/data\/weather\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'weather' }
          },
          {
            urlPattern: /\/data\/meta\/last-updated\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'meta' }
          }
        ]
      }
    })
  ],
  base: '/skatemap/',
})
