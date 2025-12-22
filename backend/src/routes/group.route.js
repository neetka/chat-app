import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createGroup, getGroups, getGroupMessages, addMember } from "../controllers/group.controller.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getGroups);
router.get("/:id/messages", protectRoute, getGroupMessages);
router.post("/:id/add-member", protectRoute, addMember);

export default router;
