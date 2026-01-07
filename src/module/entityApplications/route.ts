import { Router } from "express";
import CraftEntityController from "./controller.ts";

const router = Router();

router.post("/", CraftEntityController.create);
router.get("/", CraftEntityController.getAll);
router.get("/:id", CraftEntityController.getById);
router.patch("/status", CraftEntityController.updateStatus);

export default router;