import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ParkCheck — NYC Skatepark Conditions',
        short_name: 'ParkCheck',
        description: 'Real-time skatepark conditions for NYC',
        start_url: '/skatemap/',
        scope: '/skatemap/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#22c55e',
        orientation: 'portrait',
        icons: [
          { src: '/skatemap/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/skatemap/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/skatemap/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
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
