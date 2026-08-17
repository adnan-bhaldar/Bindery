import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import { statusPage } from "./utils/statusPage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

await connectDB();

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "").split(",").map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // required so the httpOnly auth cookie is sent/received
  })
);
app.use(express.json());
app.use(cookieParser());
// Serves files placed in server/public — e.g. favicon.svg, used by the status page
app.use(express.static(path.join(__dirname, "public")));

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