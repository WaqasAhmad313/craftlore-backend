import { Router } from "express";
import { CsemeController } from "./controller.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched ────────────────────────────────────────────────
router.get("/crafts", CsemeController.getAllCrafts);
router.get("/crafts/:craftId", CsemeController.getCraft);
router.get("/datasets", CsemeController.getAllDatasets);
router.get("/datasets/published", CsemeController.getPublishedDataset);
router.get("/datasets/:datasetId", CsemeController.getDataset);
router.get("/datasets/:datasetId/data", CsemeController.getEconDataByDataset);
router.get("/datasets/:datasetId/data/craft/:craftId", CsemeController.getEconDataByCraftAndDataset);
router.get("/data/:econId", CsemeController.getEconData);
router.get("/dashboard/summary", CsemeController.getDashboardSummary);
router.get("/dashboard/econ-data", CsemeController.getPublishedEconData);
router.get("/dashboard/fy-labels", CsemeController.getAvailableFyLabels);

// ── Dashboard: POST /crafts ──────────────────────────────────
router.post(
  "/crafts",
  isInternalRequest,
  authMiddleware,
  requirePermission("cseme", "create"),
  pendingInterceptor({
    module:    "cseme",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  CsemeController.createCraft
);

// ── Dashboard: PATCH /crafts/:craftId ────────────────────────
router.patch(
  "/crafts/:craftId",
  isInternalRequest,
  authMiddleware,
  requirePermission("cseme", "update"),
  pendingInterceptor({
    module:    "cseme",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["craftId"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["craftId"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  CsemeController.updateCraft
);

// ── Dashboard: DELETE /crafts/:craftId ───────────────────────
router.delete(
  "/crafts/:craftId",
  isInternalRequest,
  authMiddleware,
  requirePermission("cseme", "delete"),
  pendingInterceptor({
    module:    "cseme",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["craftId"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["craftId"] ?? null,
    }),
  }),
  CsemeController.deleteCraft
);

// ── Dashboard: POST /datasets ────────────────────────────────
router.post(
  "/datasets",
  isInternalRequest,
  authMiddleware,
  requirePermission("cseme", "create"),
  pendingInterceptor({
    module:    "cseme",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  CsemeController.createDataset
);

// ── Dashboard: PATCH /datasets/:datasetId/publish ────────────
router.patch(
  "/datasets/:datasetId/publish",
  isInternalRequest,
  authMiddleware,
  requirePermission("cseme", "update"),
  pendingInterceptor({
    module:    "cseme",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["datasetId"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["datasetId"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  CsemeController.publishDataset
);

// ── Dashboard: DELETE /datasets/:datasetId ───────────────────
router.delete(
  "/datasets/:datasetId",
  isInternalRequest,
  authMiddleware,
  requirePermission("cseme", "delete"),
  pendingInterceptor({
    module:    "cseme",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["datasetId"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["datasetId"] ?? null,
    }),
  }),
  CsemeController.deleteDataset
);

// ── Dashboard: POST /datasets/:datasetId/data ────────────────
router.post(
  "/datasets/:datasetId/data",
  isInternalRequest,
  authMiddleware,
  requirePermission("cseme", "create"),
  pendingInterceptor({
    module:    "cseme",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: req.params["datasetId"] ?? null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "create",
    extractMeta: (req) => ({
      entityId: req.params["datasetId"] ?? null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  CsemeController.createEconData
);

// ── Dashboard: PATCH /data/:econId ───────────────────────────
router.patch(
  "/data/:econId",
  isInternalRequest,
  authMiddleware,
  requirePermission("cseme", "update"),
  pendingInterceptor({
    module:    "cseme",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["econId"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["econId"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  CsemeController.updateEconData
);

// ── Dashboard: DELETE /data/:econId ──────────────────────────
router.delete(
  "/data/:econId",
  isInternalRequest,
  authMiddleware,
  requirePermission("cseme", "delete"),
  pendingInterceptor({
    module:    "cseme",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["econId"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["econId"] ?? null,
    }),
  }),
  CsemeController.deleteEconData
);

export default router;