import jwt from "jsonwebtoken";

// tokenVersion is embedded so protect() can reject every previously-issued
// token at once by bumping the user's stored version — see User.js.
export const generateToken = (userId, tokenVersion) => {
  return jwt.sign({ id: userId, v: tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

// Sets the JWT as an httpOnly cookie — safer than localStorage against XSS
export const setTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};
