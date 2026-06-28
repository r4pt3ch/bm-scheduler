import mongoose from 'mongoose'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const uri = config.mongoUri

  if (!uri) {
    console.warn('⚠️  MONGODB_URI not set. Please create a .env file from .env.example')
    return
  }

  try {
    await mongoose.connect(uri)
    console.log('✅ MongoDB connected successfully')
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err)
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err)
  })
})
