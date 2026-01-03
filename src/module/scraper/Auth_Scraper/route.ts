import { Router } from "express";
import { scraperController } from "./controller.ts";

const router = Router();

router.post("/", scraperController.scrapeApplication.bind(scraperController));
router.get("/health", scraperController.healthCheck.bind(scraperController));

export default router;
