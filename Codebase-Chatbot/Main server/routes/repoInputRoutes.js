import {
  saveRepoInput,
  getRepoInput,
  getAllReposByEmail,
  deleteRepo,
} from "../controllers/repoInputController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { Router } from "express";

const router = Router();
router.post("/save-repo", authMiddleware, saveRepoInput);
router.get("/get-repo/:repo_id", authMiddleware, getRepoInput);
router.get("/get-all-repos/:email", authMiddleware, getAllReposByEmail);
router.delete("/delete-repo/:repo_id", authMiddleware, deleteRepo);
export default router;
