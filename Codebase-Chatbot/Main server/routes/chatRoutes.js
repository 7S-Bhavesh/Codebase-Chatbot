import { getChat, getAllChatsByRepo } from "../controllers/chatController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { Router } from "express";

const router = Router();
router.get("/get-chat/:chat_id", authMiddleware, getChat);
router.get("/get-all-chats/:repo_id", authMiddleware, getAllChatsByRepo);
export default router;

