import { Router } from "express";
import MreController from "./controller.ts";

const router = Router();

// Rates (replaces supabase queries in MREView/MREManagement) :contentReference[oaicite:14]{index=14} :contentReference[oaicite:15]{index=15}
router.get("/rates", MreController.listRates);
router.post("/rates", MreController.createRate);
router.patch("/rates/:id", MreController.updateRate);
router.delete("/rates/:id", MreController.deleteRate);

// Bulk import (replaces client-side loop inserts) :contentReference[oaicite:16]{index=16}
router.post("/rates/bulk-import", MreController.bulkImport);

// Categories + Modifiers (replaces mre_modifier_categories + mre_rate_modifiers) :contentReference[oaicite:17]{index=17}
router.get("/categories", MreController.listCategories);
router.post("/categories", MreController.createCategory);

router.get("/modifiers", MreController.listModifiers);
router.post("/modifiers", MreController.createModifier);
router.patch("/modifiers/:id", MreController.updateModifier);
router.delete("/modifiers/:id", MreController.deleteModifier);
router.post("/modifiers/:id/toggle-active", MreController.toggleModifierActive);

export default router;
