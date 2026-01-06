import { Router } from "express";
import { authorizedUserController } from "./controller.ts";

const router = Router();

router.post("/scrape", authorizedUserController.scrapeAndSave.bind(authorizedUserController));
router.post("/search", authorizedUserController.getByAuthNumber.bind(authorizedUserController));
router.get("/:applicationNumber", authorizedUserController.getByApplicationNumber.bind(authorizedUserController));

export default router;