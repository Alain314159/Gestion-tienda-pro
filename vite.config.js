import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'cdn-cache', expiration: { maxEntries: 20, maxAgeSeconds: 60*60*24*365 } }
          }
        ]
      },
      manifest: {
        name: 'Tienda Pro',
        short_name: 'Tienda Pro',
        description: 'Sistema de Punto de Venta y Gestión de Inventario',
        start_url: './',
        display: 'standalone',
        background_color: '#f3f4f6',
        theme_color: '#2196F3',
        orientation: 'portrait-primary',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  build: { target: 'es2022', sourcemap: false }
});
