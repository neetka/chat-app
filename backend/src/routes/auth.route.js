import express from "express";
import {
  login,
  logout,
  signup,
  updateProfile,
  changePassword,
  deleteAccount,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { checkAuth } from "../controllers/auth.controller.js";
const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);

router.put("/change-password", protectRoute, changePassword);

router.delete("/delete-account", protectRoute, deleteAccount);

router.get("/check", protectRoute, checkAuth);

export default router;
