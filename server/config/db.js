import mongoose from "mongoose";

// On Vercel, each cold start can spin up a fresh serverless instance.
// Without caching, calling mongoose.connect() on every invocation quickly
// exhausts Atlas's connection limit. Caching on `global` survives across
// warm invocations of the same container (not guaranteed across cold
// starts, but avoids the vast majority of redundant reconnects).
let cached = global._binderyMongoose;
if (!cached) {
  cached = global._binderyMongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    mongoose.connection.on("connected", () => {
      console.log("Database connected successfully 🚀");
    });
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null; // let the next call retry instead of staying stuck on a failed promise
    console.error(`MongoDB connection error: ${error.message}`);
    // Only hard-exit outside serverless — killing the process on Vercel would
    // just crash every concurrent invocation sharing this container.
    if (!process.env.VERCEL) process.exit(1);
    throw error;
  }
};