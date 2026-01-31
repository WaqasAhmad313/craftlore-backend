import { Router } from "express";
import { CarbonAdminController, CarbonController } from "./controller.ts";

const router = Router();

/** -------- Public -------- */
router.get("/calculators", CarbonController.listCalculators);
router.get("/calculators/:craftId", CarbonController.getCalculator);
router.post("/calculate", CarbonController.calculate);

router.get("/dashboard/summary", CarbonController.dashboardSummary);

/** -------- Admin --------
 * Put your auth middleware here later:
 * router.use("/admin", requireAdmin)
 */
router.get("/admin/factors", CarbonAdminController.listFactors);
router.put("/admin/factors", CarbonAdminController.upsertFactor);

router.put("/admin/calculators/:craftId", CarbonAdminController.updateCalculator);

export default router;
