import { Router } from "express";
import { CRVASController } from "./controller.ts";
import { CRVASService } from "./service.ts";
import type {
  UpdateCategoryInput,
  CreateIndicatorInput,
  UpdateIndicatorInput,
  CreateDataPointInput,
  UpdateAssessmentInput,
  CreateCategoryInput,
  CreateAssessmentInput,
} from "./model.ts";
import { sendSuccess, sendCreated, sendError } from "./response.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched ────────────────────────────────────────────────
router.get("/dashboard", CRVASController.getDashboard);
router.get("/categories/:slug", CRVASController.getCategoryBySlug);
router.get("/admin/categories", CRVASController.getAllCategories);
router.get("/admin/categories/:categoryId", CRVASController.getCategoryById);
router.get("/admin/assessments", CRVASController.getAllAssessments);
router.get("/admin/assessments/:assessmentId", CRVASController.getAssessmentById);

// ── Dashboard: POST /admin/categories ───────────────────────
router.post(
  "/admin/categories",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "create"),
  pendingInterceptor({
    module:    "crvas",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  async (req, res) => {
    try {
      const category = await CRVASService.createCategory(req.body as CreateCategoryInput);
      return sendCreated(res, category, "Category created successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }
);

// ── Dashboard: PUT /admin/categories/:categoryId ─────────────
router.put(
  "/admin/categories/:categoryId",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "update"),
  pendingInterceptor({
    module:    "crvas",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["categoryId"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["categoryId"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  async (req, res) => {
    try {
      const id = Number(req.params["categoryId"]);
      const category = await CRVASService.updateCategory(id, req.body as UpdateCategoryInput);
      return sendSuccess(res, category, "Category updated successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }
);

// ── Dashboard: DELETE /admin/categories/:categoryId ──────────
router.delete(
  "/admin/categories/:categoryId",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "delete"),
  pendingInterceptor({
    module:    "crvas",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["categoryId"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["categoryId"] ?? null,
    }),
  }),
  async (req, res) => {
    try {
      const id = Number(req.params["categoryId"]);
      await CRVASService.deleteCategory(id);
      return sendSuccess(res, null, "Category deleted successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }
);

// ── Dashboard: POST /admin/categories/:categoryId/indicators ─
router.post(
  "/admin/categories/:categoryId/indicators",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "create"),
  pendingInterceptor({
    module:    "crvas",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: req.params["categoryId"] ?? null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "create",
    extractMeta: (req) => ({
      entityId: req.params["categoryId"] ?? null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  async (req, res) => {
    try {
      const id = Number(req.params["categoryId"]);
      const category = await CRVASService.addIndicator(id, req.body as CreateIndicatorInput);
      return sendCreated(res, category, "Indicator added successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }
);

// ── Dashboard: PUT /admin/categories/:categoryId/indicators/:indicatorId
router.put(
  "/admin/categories/:categoryId/indicators/:indicatorId",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "update"),
  pendingInterceptor({
    module:    "crvas",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["indicatorId"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["indicatorId"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  async (req, res) => {
    try {
      const categoryId  = Number(req.params["categoryId"]);
      const indicatorId = req.params["indicatorId"] ?? "";
      const category = await CRVASService.updateIndicator(categoryId, indicatorId, req.body as UpdateIndicatorInput);
      return sendSuccess(res, category, "Indicator updated successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }
);

// ── Dashboard: DELETE /admin/categories/:categoryId/indicators/:indicatorId
router.delete(
  "/admin/categories/:categoryId/indicators/:indicatorId",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "delete"),
  pendingInterceptor({
    module:    "crvas",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["indicatorId"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["indicatorId"] ?? null,
    }),
  }),
  async (req, res) => {
    try {
      const categoryId  = Number(req.params["categoryId"]);
      const indicatorId = req.params["indicatorId"] ?? "";
      const category = await CRVASService.deleteIndicator(categoryId, indicatorId);
      return sendSuccess(res, category, "Indicator deleted successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }
);

// ── Dashboard: POST /admin/categories/:categoryId/indicators/:indicatorId/data
router.post(
  "/admin/categories/:categoryId/indicators/:indicatorId/data",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "create"),
  pendingInterceptor({
    module:    "crvas",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: req.params["indicatorId"] ?? null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "create",
    extractMeta: (req) => ({
      entityId: req.params["indicatorId"] ?? null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  async (req, res) => {
    try {
      const categoryId  = Number(req.params["categoryId"]);
      const indicatorId = req.params["indicatorId"] ?? "";
      const category = await CRVASService.addDataPoint(categoryId, indicatorId, req.body as CreateDataPointInput);
      return sendCreated(res, category, "Data point added successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }
);

// ── Dashboard: PUT /admin/categories/:categoryId/indicators/:indicatorId/data/:timePeriod
router.put(
  "/admin/categories/:categoryId/indicators/:indicatorId/data/:timePeriod",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "update"),
  pendingInterceptor({
    module:    "crvas",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["timePeriod"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["timePeriod"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  async (req, res) => {
    try {
      const categoryId  = Number(req.params["categoryId"]);
      const indicatorId = req.params["indicatorId"] ?? "";
      const timePeriod  = req.params["timePeriod"]  ?? "";
      const category = await CRVASService.updateDataPoint(categoryId, indicatorId, timePeriod, req.body);
      return sendSuccess(res, category, "Data point updated successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }
);

// ── Dashboard: DELETE /admin/categories/:categoryId/indicators/:indicatorId/data/:timePeriod
router.delete(
  "/admin/categories/:categoryId/indicators/:indicatorId/data/:timePeriod",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "delete"),
  pendingInterceptor({
    module:    "crvas",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["timePeriod"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["timePeriod"] ?? null,
    }),
  }),
  async (req, res) => {
    try {
      const categoryId  = Number(req.params["categoryId"]);
      const indicatorId = req.params["indicatorId"] ?? "";
      const timePeriod  = req.params["timePeriod"]  ?? "";
      const category = await CRVASService.deleteDataPoint(categoryId, indicatorId, timePeriod);
      return sendSuccess(res, category, "Data point deleted successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }
);

// ── Dashboard: POST /admin/assessments ──────────────────────
router.post(
  "/admin/assessments",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "create"),
  pendingInterceptor({
    module:    "crvas",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  async (req, res) => {
    try {
      const assessment = await CRVASService.createAssessment(req.body as CreateAssessmentInput);
      return sendCreated(res, assessment, "Assessment created successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }
);

// ── Dashboard: PUT /admin/assessments/:assessmentId ──────────
router.put(
  "/admin/assessments/:assessmentId",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "update"),
  pendingInterceptor({
    module:    "crvas",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["assessmentId"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["assessmentId"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  async (req, res) => {
    try {
      const id = Number(req.params["assessmentId"]);
      const assessment = await CRVASService.updateAssessment(id, req.body as UpdateAssessmentInput);
      return sendSuccess(res, assessment, "Assessment updated successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message);
    }
  }
);

// ── Dashboard: DELETE /admin/assessments/:assessmentId ───────
router.delete(
  "/admin/assessments/:assessmentId",
  isInternalRequest,
  authMiddleware,
  requirePermission("crvas", "delete"),
  pendingInterceptor({
    module:    "crvas",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["assessmentId"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "crvas",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["assessmentId"] ?? null,
    }),
  }),
  async (req, res) => {
    try {
      const id = Number(req.params["assessmentId"]);
      await CRVASService.deleteAssessment(id);
      return sendSuccess(res, null, "Assessment deleted successfully");
    } catch (error: unknown) {
      return sendError(res, (error as Error).message, 404);
    }
  }
);

export default router;