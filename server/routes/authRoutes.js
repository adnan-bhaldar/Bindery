import { Router } from "express";
import {
    signup,
    login,
    logout,
    getMe,
    updateProfile,
    changePassword,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.patch("/profile", protect, updateProfile);
router.put("/password", protect, authLimiter, changePassword);

export default router;