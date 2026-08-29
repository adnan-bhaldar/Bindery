import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", protect, getSettings);
router.put("/", protect, updateSettings);

export default router;
