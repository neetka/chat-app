import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  fetchBundle,
  registerDevice,
  revokeDevice,
  topUpPreKeys,
} from "../controllers/key.controller.js";

const router = express.Router();

router.post("/devices", protectRoute, registerDevice);
router.post("/prekeys", protectRoute, topUpPreKeys);
router.post("/devices/:deviceId/revoke", protectRoute, revokeDevice);
router.get("/bundle/:userId", protectRoute, fetchBundle);

export default router;

