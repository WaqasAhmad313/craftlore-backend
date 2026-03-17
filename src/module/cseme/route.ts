// import { Router } from "express";
// import { CsemeController } from "./controller.ts";

// const router = Router();

// /* ===== CRAFTS ===== */

// // Get all crafts
// router.get("/crafts", CsemeController.getAllCrafts);

// // Create a new craft
// router.post("/crafts", CsemeController.createCraft);

// // Get a specific craft by ID
// router.get("/crafts/:craftId", CsemeController.getCraft);

// // Update a craft
// router.patch("/crafts/:craftId", CsemeController.updateCraft);

// // Delete a craft
// router.delete("/crafts/:craftId", CsemeController.deleteCraft);

// /* ===== DATASETS ===== */

// // Get all datasets
// router.get("/datasets", CsemeController.getAllDatasets);

// // Get the currently published dataset
// router.get("/datasets/published", CsemeController.getPublishedDataset);

// // Create a new dataset
// router.post("/datasets", CsemeController.createDataset);

// // Get a specific dataset by ID
// router.get("/datasets/:datasetId", CsemeController.getDataset);

// // Publish a dataset (moves it from draft → published)
// router.patch("/datasets/:datasetId/publish", CsemeController.publishDataset);

// // Delete a dataset (only draft datasets can be deleted)
// router.delete("/datasets/:datasetId", CsemeController.deleteDataset);

// /* ===== ECON DATA (Admin - per dataset) ===== */

// // Get all econ data for a specific dataset
// router.get("/datasets/:datasetId/data", CsemeController.getEconDataByDataset);

// // Add econ data to a dataset
// router.post("/datasets/:datasetId/data", CsemeController.createEconData);

// // Get econ data for a specific craft within a dataset
// router.get(
//   "/datasets/:datasetId/data/craft/:craftId",
//   CsemeController.getEconDataByCraftAndDataset
// );

// // Get a specific econ data record by ID
// router.get("/data/:econId", CsemeController.getEconData);

// // Update a specific econ data record
// router.patch("/data/:econId", CsemeController.updateEconData);

// // Delete a specific econ data record
// router.delete("/data/:econId", CsemeController.deleteEconData);

// /* ===== DASHBOARD (Frontend - reads from published dataset) ===== */

// // Get dashboard summary — used by the main dashboard overview tab
// // Optional query param: ?fy_label=2024-25
// router.get("/dashboard/summary", CsemeController.getDashboardSummary);

// // Get all econ data from published dataset — used by Production, Export,
// // Productivity, Supply Stability tabs
// router.get("/dashboard/econ-data", CsemeController.getPublishedEconData);

// // Get list of available financial years in published dataset
// router.get("/dashboard/fy-labels", CsemeController.getAvailableFyLabels);

// export default router;

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
      payload: { old: null, new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { old: null, new: req.body as Record<string, unknown> },
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["craftId"] ?? null,
      diff: {
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: null,
      },
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
      payload: { old: null, new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { old: null, new: req.body as Record<string, unknown> },
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["datasetId"] ?? null,
      diff: {
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: null,
      },
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
      payload: { old: null, new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "create",
    extractMeta: (req) => ({
      entityId: req.params["datasetId"] ?? null,
      diff: { old: null, new: req.body as Record<string, unknown> },
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
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
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cseme",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["econId"] ?? null,
      diff: {
        old: (req.body as { old?: Record<string, unknown> }).old ?? null,
        new: null,
      },
    }),
  }),
  CsemeController.deleteEconData
);

export default router;