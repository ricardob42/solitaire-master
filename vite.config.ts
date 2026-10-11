import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    svelte(),
    VitePWA({
      // The user decides when a new version is applied: no silent mid-game reloads.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png', 'favicon-32.png', 'robots.txt'],
      workbox: {
        // Latin font subsets only: they cover every supported language.
        globPatterns: ['**/*.{html,js,css}', 'assets/*-latin-{full,wght}-normal-*.woff2'],
        globIgnores: ['**/icon-512.png', '**/icon-maskable-512.png'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      },
      manifest: {
        id: '/',
        name: 'Solitaire Master',
        short_name: 'Solitaire',
        description:
          'Klondike Solitaire with a daily challenge, hints, unlimited undo, statistics and offline play.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0a2b21',
        theme_color: '#0d3b2e',
        categories: ['games', 'entertainment'],
        icons: [
          { src: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          {
            name: 'New game',
            short_name: 'New',
            url: '/?action=new',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Daily challenge',
            short_name: 'Daily',
            url: '/?action=daily',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          }
        ],
        share_target: {
          action: '/',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' }
        }
      }
    })
  ]
});
