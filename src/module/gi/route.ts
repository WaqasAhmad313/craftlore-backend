import { Router } from "express";
import { createGIProductController } from "./controller.ts";

const router = Router();

router.post("/", createGIProductController);

export default router;
