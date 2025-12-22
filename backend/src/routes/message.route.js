import express from "express"
import { getUsersForSidebar, getMessages, sendMessage, deleteMessage, editMessage, markMessagesAsSeen, addReaction } from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id",protectRoute, getMessages)

router.post("/send/:id", protectRoute, sendMessage)
router.put("/:id", protectRoute, editMessage)
router.put("/mark-seen/:id", protectRoute, markMessagesAsSeen)
router.put("/:id/reaction", protectRoute, addReaction);
router.delete("/:id", protectRoute, deleteMessage)

export default router;