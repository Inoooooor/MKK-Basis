export default defineNuxtConfig({
  // Задание требует SPA: всё состояние приложения живёт в localStorage,
  // которого нет на сервере. SSR отключён осознанно — иначе каждый экран
  // пришлось бы прятать в <ClientOnly> ради борьбы с hydration mismatch.
  ssr: false,

  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt'],

  css: ['~/assets/styles/main.scss'],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  app: {
    head: {
      title: 'Заметки',
      htmlAttrs: { lang: 'ru' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'light dark' },
      ],
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/styles/_mixins.scss" as *;',
        },
      },
    },
  },
})
