import { preact } from '@preact/preset-vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@zxing/browser') || id.includes('@zxing/library')) {
            return 'zxing'
          }
          if (id.includes('bwip-js')) {
            return 'bwip'
          }
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon.png',
        'web-app-manifest-192x192.png',
        'web-app-manifest-512x512.png',
      ],
      manifest: {
        name: 'Tessera',
        short_name: 'Tessera',
        description: 'Dead simple barcode card manager',
        icons: [
          {
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        theme_color: '#0f0f0f',
        background_color: '#0f0f0f',
        display: 'standalone',
      },
      workbox: {
        globPatterns: ['**/*.{css,html,ico,png,svg,webmanifest}', '**/index-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(zxing|bwip)-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'heavy-chunks',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
})
