import rateLimit from "express-rate-limit";

// Applies to /api/auth/* only — limits brute-force login/signup attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many attempts. Try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
