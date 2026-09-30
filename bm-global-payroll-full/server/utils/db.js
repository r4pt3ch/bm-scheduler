import mongoose from 'mongoose'

let cached = global._mongooseConn

if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null }
}

/**
 * Returns a cached Mongoose connection, creating one if it doesn't exist yet.
 * Reused across Nitro requests so we don't open a new connection per request.
 */
export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    // useRuntimeConfig() reflects NUXT_-prefixed env vars present at server
    // start, with a localhost default baked in as a fallback (see
    // nuxt.config.ts). Since that default is always present, we can't just
    // check truthiness — we explicitly prefer a real env var (in either
    // naming convention) over the baked-in default.
    const config = useRuntimeConfig()
    const localhostDefault = 'mongodb://localhost:27017/bm_global_payroll'
    const envUri = process.env.NUXT_MONGODB_URI || process.env.MONGODB_URI
    const uri = envUri || config.mongodbUri || localhostDefault

    if (uri.startsWith('mongodb://localhost')) {
      // Resolved to the localhost fallback — almost certainly not intended
      // in a deployed environment. Log a loud warning so this is easy to spot
      // in platform logs instead of surfacing only as a cryptic ECONNREFUSED.
      console.warn(
        '[bm-payroll] WARNING: MONGODB_URI resolved to a localhost default. ' +
        'If this is a deployed environment, your MongoDB Atlas connection string ' +
        'was not picked up — check that NUXT_MONGODB_URI (or MONGODB_URI) is set ' +
        'as an environment variable on this component, and redeploy after setting it.'
      )
    }

    cached.promise = mongoose.connect(uri, {
      bufferCommands: false
    }).then((m) => m)
  }

  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    throw err
  }

  return cached.conn
}
