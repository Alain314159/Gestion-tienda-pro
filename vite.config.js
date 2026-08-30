import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Tienda Pro',
        short_name: 'TiendaPro',
        description: 'Punto de venta offline-first',
        theme_color: '#2196F3',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Gestion-tienda-pro/',
        start_url: '/Gestion-tienda-pro/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'unpkg-libs' }
          }
        ]
      },
      devOptions: { enabled: true }
    })
  ],
  base: '/Gestion-tienda-pro/'
});
