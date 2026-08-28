import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod;

// Called once per test file, before any test runs and before server.js is
// imported. server.js reads MONGO_URI/JWT_SECRET/CLIENT_ORIGIN at module
// load time (connectDB() runs as a top-level await), so these env vars
// MUST be set before that import happens — see the dynamic `await
// import("../server.js")` pattern used in each test file, which is what
// makes that ordering possible.
export const setupTestDB = async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    process.env.JWT_SECRET = "test-only-secret-do-not-use-in-production";
    process.env.JWT_EXPIRES_IN = "30d";
    process.env.CLIENT_ORIGIN = "http://localhost:5173";
    process.env.NODE_ENV = "test"; // also what rateLimitMiddleware's skip() checks for
    process.env.VERCEL = "1"; // prevents server.js's app.listen() branch from binding a real port
};

export const teardownTestDB = async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
};

// Runs between individual tests (not test files) so each test starts from
// an empty database, without paying the cost of spinning up a fresh
// mongodb-memory-server instance every time.
export const clearTestDB = async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};