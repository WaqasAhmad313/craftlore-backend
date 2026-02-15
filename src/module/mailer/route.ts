import { Router } from "express";
import { ContactController } from "./controller.ts";

const router = Router();

router.post("/send", ContactController.submit);

export default router;
