import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth";
import { postMessage } from "./yuzu/postMessage";

const router = Router();

router.post("/message", ensureAuthenticated, postMessage);

export default router;
