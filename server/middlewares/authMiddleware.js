import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // Rejects tokens issued before the user's password last changed —
    // decoded.v is the version this specific token was signed with,
    // user.tokenVersion is the current one. A mismatch means the
    // password changed (or a recovery reset happened) since this token
    // was issued, so it's treated the same as an expired session even
    // though its JWT expiry hasn't been reached yet.
    if (decoded.v !== user.tokenVersion) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
};
