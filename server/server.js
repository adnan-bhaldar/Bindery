import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import { statusPage } from "./utils/statusPage.js";

dotenv.config();

await connectDB();

const app = express();

// Previously this was just `(process.env.CLIENT_ORIGIN || "").split(",")...`,
// which silently became `[""]` if CLIENT_ORIGIN was unset or empty. The cors
// package then only allows a request whose Origin header is the literal
// string "" — which real browsers never send — so every actual
// cross-origin request from the frontend gets rejected with a generic CORS
// error in the browser console, while curl/Postman (no Origin header at
// all) and same-origin requests keep working fine. That mismatch is what
// made this confusing to debug: the server looked healthy, health checks
// passed, but the deployed frontend couldn't log in — with nothing in the
// server logs pointing at CLIENT_ORIGIN as the cause.
const rawClientOrigin = process.env.CLIENT_ORIGIN?.trim();

if (!rawClientOrigin) {
  const message =
    "CLIENT_ORIGIN is not set. CORS will reject every cross-origin request " +
    '(including the deployed frontend) — set it to the frontend\'s origin, ' +
    "e.g. CLIENT_ORIGIN=https://app.example.com (comma-separate multiple origins).";

  // In production this is almost certainly a deploy misconfiguration, not
  // a deliberate choice, so fail startup loudly rather than let the server
  // come up "successfully" into a state where nothing can authenticate.
  // Locally, a warning is enough — CLIENT_ORIGIN is commonly left unset
  // until a dev's .env is fully set up, and refusing to start would be a
  // worse first-run experience than authRoutes just not working yet.
  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }
  console.warn(`⚠️  ${message}`);
}

// filter(Boolean) drops empty entries from stray commas (e.g. a trailing
// "http://a.com," or "http://a.com,,http://b.com"), which would otherwise
// silently add another `""` into the allow-list.
const allowedOrigins = (rawClientOrigin || "").split(",").map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // required so the httpOnly auth cookie is sent/received
  })
);
app.use(express.json());
app.use(cookieParser());
// Serves files placed in server/public — e.g. favicon.svg, used by the status page
app.use(express.static(path.join(import.meta.dirname, "public")));

app.get("/", statusPage);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Vercel wraps this exported app as a serverless function — it never calls
// app.listen() itself. Locally (and on any traditional host like Render),
// process.env.VERCEL isn't set, so this runs exactly as before.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`Bindery server running on port ${PORT}`);
    }
  });
}

export default app;