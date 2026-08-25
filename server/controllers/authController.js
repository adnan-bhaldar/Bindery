import User from "../models/User.js";
import Settings from "../models/Settings.js";
import { generateToken, setTokenCookie } from "../utils/generateToken.js";
import { generateBackupCodeSet, generateBackupCode, compareBackupCode, hashBackupCode } from "../utils/backupCodes.js";

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

    res.status(201).json({ id: user._id, email: user.email, username: user.username, createdAt: user.createdAt });
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

    res.status(200).json({ id: user._id, email: user.email, username: user.username, createdAt: user.createdAt });
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
  res.status(200).json({ id: req.user._id, email: req.user.email, username: req.user.username, createdAt: req.user.createdAt });
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

    res.status(200).json({ id: req.user._id, email: req.user.email, username: req.user.username, createdAt: req.user.createdAt });
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

// POST /api/auth/backup-codes — (re)generates all 6 backup codes.
// Requires the current password, same reasoning as changing it or deleting
// the account: this replaces every existing code, so it's a meaningful
// enough action to re-verify identity for. Returns the plaintext codes
// exactly once — they're only ever stored hashed, so this is the only
// chance the user gets to see them.
// GET /api/auth/backup-codes/status — reveals only how many codes exist and
// how many are still unused, plus when they were last generated. No password
// required: unlike the codes themselves, this metadata isn't a credential —
// knowing "you have 4 of 6 left, generated on March 3" doesn't help anyone
// reset your password. This is what lets the UI show useful status without
// prompting for a password just to look, which was the actual bug: every
// "view" was previously implemented as a full regenerate.
export const getBackupCodesStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+backupCodes");
    const total = user.backupCodes?.length ?? 0;
    const unused = user.backupCodes?.filter((c) => !c.used).length ?? 0;

    res.status(200).json({
      total,
      unused,
      generatedAt: user.backupCodesGeneratedAt,
    });
  } catch (error) {
    next(error);
  }
};

export const generateBackupCodes = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required to generate backup codes" });
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    const { plainCodes, records } = await generateBackupCodeSet();
    user.backupCodes = records;
    user.backupCodesGeneratedAt = new Date();
    await user.save();

    res.status(200).json({ backupCodes: plainCodes, generatedAt: user.backupCodesGeneratedAt });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password — public (no session/cookie required by
// design, since the whole point is recovering an account you're locked out
// of). Uses a backup code instead of the current password as proof of
// identity. Rate-limited the same as login/signup — a 6-digit code only has
// 1,000,000 possibilities, so brute-forcing without a limiter would be
// realistic.
export const resetPasswordWithBackupCode = async (req, res, next) => {
  try {
    const { email, backupCode, newPassword } = req.body;

    if (!email || !backupCode || !newPassword) {
      return res.status(400).json({ message: "Email, backup code, and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+backupCodes");
    // Same generic message whether the email doesn't exist or the code is
    // wrong — confirming which one it was would let an attacker enumerate
    // registered emails via this endpoint.
    const invalidMessage = "Invalid email or backup code";

    if (!user || !user.backupCodes || user.backupCodes.length === 0) {
      return res.status(401).json({ message: invalidMessage });
    }

    // Check every UNUSED code's hash for a match — codes aren't looked up
    // by index/position, since the request only ever contains the code
    // itself, not which slot it came from.
    let matchedIndex = -1;
    for (let i = 0; i < user.backupCodes.length; i++) {
      const entry = user.backupCodes[i];
      if (entry.used) continue;
      if (await compareBackupCode(backupCode, entry.codeHash)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      return res.status(401).json({ message: invalidMessage });
    }

    // Replace ONLY the used code's hash with a freshly generated one — the
    // other 5 codes are untouched, exactly as specified: using one code
    // doesn't invalidate the rest, and the used slot gets a new code rather
    // than just being marked permanently spent.
    const newPlainCode = generateBackupCode();
    user.backupCodes[matchedIndex].codeHash = await hashBackupCode(newPlainCode);
    user.backupCodes[matchedIndex].used = false;

    user.password = newPassword; // pre-save hook re-hashes since password is modified
    await user.save();

    res.status(200).json({
      message: "Password reset successfully",
      newBackupCode: newPlainCode,
    });
  } catch (error) {
    next(error);
  }
};