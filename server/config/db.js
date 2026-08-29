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
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        // Mongoose's default is 30s — since this blocks server startup
        // (server.js awaits connectDB before creating the Express app),
        // a genuinely unreachable database would otherwise delay the
        // whole server coming up by a full 30 seconds instead of failing
        // fast and letting the app start in a visibly "disconnected" state.
        serverSelectionTimeoutMS: 5000,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null; // let the next call retry instead of staying stuck on a failed promise
    console.error(`MongoDB connection error: ${error.message}`);
    // Deliberately does NOT exit or re-throw. server.js awaits this before
    // the Express app is even created — exiting/throwing here would kill
    // the whole process before app.listen() (or the Vercel handler) ever
    // runs, so even the status page and /api/health become unreachable.
    // A DB-dependent route (login, settings, etc.) will fail on its own
    // with a proper error when it actually needs the connection; the
    // server itself should stay up and visibly report "disconnected"
    // rather than not existing at all.
    return null;
  }
};