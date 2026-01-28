import { Router } from "express";
import PamController from "./controller.ts";

const router = Router();

// Public PAM submission (replaces supabase inserts in PAMSubmissionForm) :contentReference[oaicite:8]{index=8}
router.post("/appraisals", PamController.create);

// Admin/dashboard list + stats (replaces supabase queries in CAISAdminDashboard) :contentReference[oaicite:9]{index=9}
router.get("/appraisals", PamController.list);
router.get("/appraisals/stats", PamController.stats);

// Details (includes valuation)
router.get("/appraisals/:id", PamController.getDetails);

// Approve / reject (replaces supabase update status) :contentReference[oaicite:10]{index=10}
router.post("/appraisals/:id/approve", PamController.approve);
router.post("/appraisals/:id/reject", PamController.reject);

// Edit + delete (your requested extras)
router.patch("/appraisals/:id", PamController.editPayload);
router.delete("/appraisals/:id", PamController.delete);

export default router;
