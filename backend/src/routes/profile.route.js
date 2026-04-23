import express from "express";
import { getPublicProfile } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET /api/profile/:userId  — public profile for any user
router.get("/:userId", protectRoute, getPublicProfile);

export default router;
