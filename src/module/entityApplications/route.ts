import { Router } from "express";
import CraftEntityController from "./controller.ts";
import { uploadGovernmentDocuments } from "./multer.ts";

const router = Router();

// Standard JSON routes (ARTISAN, BUSINESS, INSTITUTION_NGO)
router.post("/", CraftEntityController.create);
router.get("/", CraftEntityController.getAll);
router.get("/:id", CraftEntityController.getById);
router.get("/:id/admin", CraftEntityController.getByIdWithEvaluation);
router.put("/:id/status", CraftEntityController.updateStatus);
router.delete("/:id", CraftEntityController.delete);

// Government entity — multipart/form-data with optional document uploads
router.post(
  "/government",
  uploadGovernmentDocuments,
  CraftEntityController.createGovernment
);

export default router;