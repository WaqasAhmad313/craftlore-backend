import { Router } from "express";
import { ScraperController } from "./controller.ts";

const router = Router();
const controller = new ScraperController();

router.post("/scrape", (req, res) => controller.scrape(req, res));

export default router;
