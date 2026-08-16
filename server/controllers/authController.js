import User from "../models/User.js";
import Settings from "../models/Settings.js";
import { generateToken, setTokenCookie } from "../utils/generateToken.js";

// POST /api/auth/signup
export const signup = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = await User.create({ email, password });

    // Create an empty settings doc up front so first sync has somewhere to write
    await Settings.create({ user: user._id, data: {} });

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(201).json({ id: user._id, email: user.email, username: user.username });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(200).json({ id: user._id, email: user.email, username: user.username });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.status(200).json({ message: "Logged out" });
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  res.status(200).json({ id: req.user._id, email: req.user.email, username: req.user.username });
};

// PATCH /api/auth/profile — update username and/or email
export const updateProfile = async (req, res, next) => {
  try {
    const { username, email } = req.body;

    if (email !== undefined) {
      const normalized = String(email).toLowerCase().trim();
      const existing = await User.findOne({ email: normalized });
      if (existing && String(existing._id) !== String(req.user._id)) {
        return res.status(409).json({ message: "Email is already registered" });
      }
      req.user.email = normalized;
    }

    if (username !== undefined) {
      req.user.username = String(username).trim();
    }

    await req.user.save();

    res.status(200).json({ id: req.user._id, email: req.user.email, username: req.user.username });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/password — change password, requires current password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword; // pre-save hook re-hashes since password is modified
    await user.save();

    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/auth/account — permanently deletes the account and its settings.
// Requires the current password as confirmation, same as changing it — this
// is the most destructive action available, so identity gets re-verified
// rather than trusting the session cookie alone.
export const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required to delete your account" });
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    // Delete the linked settings doc first, then the user — if the settings
    // delete succeeded but the user delete somehow failed, an orphaned empty
    // settings doc is harmless; the reverse order could leave settings behind
    // for a user id that no longer exists anywhere else in the system.
    await Settings.deleteOne({ user: user._id });
    await User.deleteOne({ _id: user._id });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({ message: "Account deleted" });
  } catch (error) {
    next(error);
  }
};