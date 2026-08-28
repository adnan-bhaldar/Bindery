import rateLimit from "express-rate-limit";

// Rate limiting exists to slow down a real attacker across real requests
// over real time — it has nothing to do with what these limiters are
// meant to test. Without this, a single test file's worth of
// signup/login/password-change requests (sharing one in-memory counter for
// the life of the process, since Jest imports the app once) can exceed 20
// and start failing with 429s that have nothing to do with the behavior
// actually under test. `skip` bypasses only in NODE_ENV=test — production
// and local dev are completely unaffected.
const skipInTest = () => process.env.NODE_ENV === "test";

// Applies to /api/auth/* only — limits brute-force login/signup attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many attempts. Try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});

// Separate counter for /api/auth/reset-password specifically. A 6-digit
// backup code has 1,000,000 possibilities, so this route genuinely needs a
// strict limit to prevent brute-forcing — but sharing authLimiter's single
// per-IP counter meant a normal flurry of signup/login/password-change
// attempts during regular use (or just testing) could exhaust the budget
// and block a legitimate reset attempt that had nothing to do with those
// other requests. Keeping its own counter means testing/using other auth
// routes never affects how many reset attempts are left, and vice versa.
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: "Too many reset attempts. Try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
});