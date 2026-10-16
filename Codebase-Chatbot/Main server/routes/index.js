import { Router } from "express";
import repoRoutes from "./repoInputRoutes.js";
import authRoutes from "./authRoutes.js";
import promptRoutes from "./promptRoutes.js";
import chatRoutes from "./chatRoutes.js";
// import ragRoutes from "./ragRoutes.js";

const router = Router();

router.use("/repo", repoRoutes);
router.use("/auth", authRoutes);
router.use("/prompt", promptRoutes);
router.use("/chat", chatRoutes);
// router.use("/query", ragRoutes);

export default router;
