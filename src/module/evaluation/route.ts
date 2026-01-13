import { Router } from "express";
import EvaluationController from "./controller.ts";

const router = Router();

router.post("/", EvaluationController.createEvaluation);
router.get("/", EvaluationController.getAllEvaluations);
router.get("/top", EvaluationController.getTopPerformers);
router.get("/summary/:year", EvaluationController.getYearlySummary);
router.get("/entity/:entityId", EvaluationController.getEvaluationsByEntity);
router.get("/entity/:entityId/statistics", EvaluationController.getEntityStatistics);
router.get("/entity/:entityId/exists", EvaluationController.checkEntityHasEvaluations);
router.get("/:id", EvaluationController.getEvaluationById);
router.put("/:id", EvaluationController.updateEvaluation);
router.delete("/:id", EvaluationController.deleteEvaluation);

export default router;