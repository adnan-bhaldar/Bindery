import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import { statusPage } from "./utils/statusPage.js";

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
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/", statusPage);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Bindery server running on port ${PORT}`);
});
