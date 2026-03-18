// import { Router } from "express";
// import EvaluationController from "./controller.ts";

// const router = Router();

// router.post("/", EvaluationController.createEvaluation);
// router.get("/", EvaluationController.getAllEvaluations);
// router.get("/top", EvaluationController.getTopPerformers);
// router.get("/summary/:year", EvaluationController.getYearlySummary);
// router.get("/entity/:entityId", EvaluationController.getEvaluationsByEntity);
// router.get("/entity/:entityId/statistics", EvaluationController.getEntityStatistics);
// router.get("/entity/:entityId/exists", EvaluationController.checkEntityHasEvaluations);
// router.get("/:id", EvaluationController.getEvaluationById);
// router.put("/:id", EvaluationController.updateEvaluation);
// router.delete("/:id", EvaluationController.deleteEvaluation);

// export default router;

import { Router } from "express";
import EvaluationController from "./controller.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched ────────────────────────────────────────────────
router.get("/", EvaluationController.getAllEvaluations);
router.get("/top", EvaluationController.getTopPerformers);
router.get("/summary/:year", EvaluationController.getYearlySummary);
router.get("/entity/:entityId", EvaluationController.getEvaluationsByEntity);
router.get("/entity/:entityId/statistics", EvaluationController.getEntityStatistics);
router.get("/entity/:entityId/exists", EvaluationController.checkEntityHasEvaluations);
router.get("/:id", EvaluationController.getEvaluationById);
router.post("/", EvaluationController.createEvaluation);
router.delete("/:id", EvaluationController.deleteEvaluation);

// ── Dashboard: PUT /:id ──────────────────────────────────────
router.put(
  "/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("cktre", "update"),
  pendingInterceptor({
    module:    "cktre",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "cktre",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  EvaluationController.updateEvaluation
);

export default router;