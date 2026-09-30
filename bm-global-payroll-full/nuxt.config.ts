// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  // Nuxt automatically overrides these at server start from environment
  // variables using the pattern NUXT_<KEY> (camelCase -> SCREAMING_SNAKE_CASE),
  // e.g. runtimeConfig.mongodbUri <- NUXT_MONGODB_URI, jwtSecret <- NUXT_JWT_SECRET.
  // This override happens at server START, not at build time, so it works
  // correctly even on platforms where env vars are only attached after build
  // (e.g. DigitalOcean App Platform component-level env vars).
  //
  // The values below are ONLY fallbacks for local dev convenience — never rely
  // on these for anything beyond localhost. In production, always set
  // NUXT_MONGODB_URI and NUXT_JWT_SECRET as real environment variables.
  runtimeConfig: {
    mongodbUri: 'mongodb://localhost:27017/bm_global_payroll',
    jwtSecret: 'change-this-secret-in-production',
    companyName: 'BM Global Ventures Inc.',
    public: {
      companyName: 'BM Global Ventures Inc.'
    }
  },

  app: {
    head: {
      title: 'BM Global Ventures Inc. — Payroll System',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  nitro: {
    experimental: {
      asyncContext: true
    }
  }
})
