import { savePrompt, getPrompts } from "../controllers/promptController.js";
import { getPromptStatus } from "../controllers/promptStatusController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { Router } from "express";

const router = Router();
router.post("/save-prompt", authMiddleware, savePrompt);
router.get("/get-prompts/:chat_id", authMiddleware, getPrompts);
router.get("/get-prompt-status/:prompt_id", authMiddleware, getPromptStatus);
export default router;

