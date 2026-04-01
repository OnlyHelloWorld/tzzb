import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/investment-pwa/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: '投资账本',
        short_name: '投资账本',
        description: '个人投资组合管理工具',
        start_url: '/',
        display: 'standalone',
        background_color: '#f9f7f3',
        theme_color: '#1a1814',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/push2\.eastmoney\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-eastmoney',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 }
            }
          },
          {
            urlPattern: /^https?:\/\/qt\.gtimg\.cn\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-tencent',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 }
            }
          },
          {
            urlPattern: /^https?:\/\/hq\.sinajs\.cn\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-sina',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 }
            }
          }
        ]
      }
    })
  ],
})
