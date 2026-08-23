import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-14',

  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxt/fonts',
    '@nuxt/image',
    '@vite-pwa/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  fonts: {
    families: [
      { name: 'Cormorant Garamond', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
      { name: 'Manrope', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },

  // Standalone display and a real icon set now — this is exactly what
  // Capacitor reads when wrapping the site into a native shell later,
  // so getting the manifest right now avoids redoing it at that point.
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'SAAJ',
      short_name: 'SAAJ',
      description: 'Adornment, considered.',
      theme_color: '#151714',
      background_color: '#F7F6F2',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Never cache API calls in the service worker — prices, stock,
      // and order status all need to stay live, not served stale from
      // an offline cache.
      navigateFallbackDenylist: [/^\/api\//],
    },
    devOptions: {
      enabled: process.env.NODE_ENV !== 'production',
    },
  },

  runtimeConfig: {
    public: {
      // Same Laravel backend the admin panel talks to — customer
      // routes are namespaced separately there (/api/customer/*),
      // so one backend safely serves both apps.
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api',
    },
  },

  app: {
    head: {
      title: 'SAAJ',
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#151714' },
      ],
    },
  },
})
