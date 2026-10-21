/// <reference types="vitest/config" />
import { preact } from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    restoreMocks: true,
    css: { include: [/style\.css/] },
  },
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
      // Ask before switching to a new version instead of reloading the page mid-use (e.g. at checkout).
      registerType: 'prompt',
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
        id: '/',
        start_url: '/',
        scope: '/',
        // Browsers only install apps with an icon whose purpose includes "any".
        icons: [
          {
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
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
        // Includes the chunks loaded on demand (ZXing, bwip-js), so a card can be shown or scanned
        // offline even if it was never opened online. They download in the background, not at startup.
        globPatterns: ['**/*.{css,html,ico,js,png,svg,webmanifest,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
