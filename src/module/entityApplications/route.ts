import { Router } from "express";
import CraftEntityController from "./controller.ts";

const router = Router();

router.post("/", CraftEntityController.create);
router.get("/:id", CraftEntityController.getById);
router.get("/", CraftEntityController.getAll);
router.get("/:id/admin", CraftEntityController.getByIdWithEvaluation);
router.put("/:id/status", CraftEntityController.updateStatus);
router.delete("/:id", CraftEntityController.delete);

export default router;