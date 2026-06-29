export default defineNuxtConfig({
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    mongoUri: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    public: {
      appName: 'ShiftSync'
    }
  },
  nitro: {
    experimental: {
      asyncContext: true
    }
  },
  app: {
    head: {
      title: 'BM Global Ventures Scheduling System',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' }
      ],
      script: [
        { src: 'https://cdn.tailwindcss.com', defer: false }
      ]
    }
  }
})
