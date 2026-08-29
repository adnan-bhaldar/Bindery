import { Router } from "express";
import {
    signup,
    login,
    logout,
    getMe,
    updateProfile,
    changePassword,
    deleteAccount,
    getBackupCodesStatus,
    generateBackupCodes,
    resetPasswordWithBackupCode,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authLimiter, resetPasswordLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.patch("/profile", protect, authLimiter, updateProfile);
router.put("/password", protect, authLimiter, changePassword);
router.delete("/account", protect, authLimiter, deleteAccount);
router.get("/backup-codes/status", protect, getBackupCodesStatus);
router.post("/backup-codes", protect, authLimiter, generateBackupCodes);
router.post("/reset-password", resetPasswordLimiter, resetPasswordWithBackupCode);

export default router;