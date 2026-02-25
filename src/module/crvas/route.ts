import { Router } from "express";
import { CRVASController } from "./controller.ts";

const router = Router();

/* ===========================
   PUBLIC ROUTES
=========================== */

// Overview dashboard — all active categories + latest published assessment
router.get("/dashboard", CRVASController.getDashboard);

// Single category by slug — used by each risk tab (climate, economic, etc.)
router.get("/categories/:slug", CRVASController.getCategoryBySlug);

/* ===========================
   ADMIN ROUTES — CATEGORIES
=========================== */

router.get("/admin/categories", CRVASController.getAllCategories);
router.post("/admin/categories", CRVASController.createCategory);
router.get("/admin/categories/:categoryId", CRVASController.getCategoryById);
router.put("/admin/categories/:categoryId", CRVASController.updateCategory);
router.delete("/admin/categories/:categoryId", CRVASController.deleteCategory);

/* ===========================
   ADMIN ROUTES — INDICATORS
=========================== */

router.post("/admin/categories/:categoryId/indicators", CRVASController.addIndicator);
router.put("/admin/categories/:categoryId/indicators/:indicatorId", CRVASController.updateIndicator);
router.delete("/admin/categories/:categoryId/indicators/:indicatorId", CRVASController.deleteIndicator);

/* ===========================
   ADMIN ROUTES — DATA POINTS
=========================== */

router.post("/admin/categories/:categoryId/indicators/:indicatorId/data", CRVASController.addDataPoint);
router.put("/admin/categories/:categoryId/indicators/:indicatorId/data/:timePeriod", CRVASController.updateDataPoint);
router.delete("/admin/categories/:categoryId/indicators/:indicatorId/data/:timePeriod", CRVASController.deleteDataPoint);

/* ===========================
   ADMIN ROUTES — ASSESSMENTS
=========================== */

router.get("/admin/assessments", CRVASController.getAllAssessments);
router.post("/admin/assessments", CRVASController.createAssessment);
router.get("/admin/assessments/:assessmentId", CRVASController.getAssessmentById);
router.put("/admin/assessments/:assessmentId", CRVASController.updateAssessment);
router.delete("/admin/assessments/:assessmentId", CRVASController.deleteAssessment);

export default router;