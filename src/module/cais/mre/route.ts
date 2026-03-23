import { Router } from "express";
import MreController from "./controller.ts";
import { isInternalRequest } from "../../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../../middleware/authMiddleware.ts";
import { requirePermission } from "../../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched ────────────────────────────────────────────────
router.get("/rates", MreController.listRates);
router.get("/categories", MreController.listCategories);
router.get("/modifiers", MreController.listModifiers);

// ── Dashboard: POST /rates/bulk-import ───────────────────────
// Must be before /rates to avoid conflict
router.post(
  "/rates/bulk-import",
  isInternalRequest,
  authMiddleware,
  requirePermission("cais", "create"),
  pendingInterceptor({
    module:    "cais",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "cais",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  MreController.bulkImport
);

// ── Dashboard: POST /rates ───────────────────────────────────
router.post(
  "/rates",
  isInternalRequest,
  authMiddleware,
  requirePermission("cais", "create"),
  pendingInterceptor({
    module:    "cais",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "cais",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  MreController.createRate
);

// ── Dashboard: PATCH /rates/:id ──────────────────────────────
router.patch(
  "/rates/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("cais", "update"),
  pendingInterceptor({
    module:    "cais",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "cais",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  MreController.updateRate
);

// ── Dashboard: DELETE /rates/:id ─────────────────────────────
router.delete(
  "/rates/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("cais", "delete"),
  pendingInterceptor({
    module:    "cais",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cais",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  MreController.deleteRate
);

// ── Dashboard: POST /categories ──────────────────────────────
router.post(
  "/categories",
  isInternalRequest,
  authMiddleware,
  requirePermission("cais", "create"),
  pendingInterceptor({
    module:    "cais",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "cais",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  MreController.createCategory
);

// ── Dashboard: POST /modifiers ───────────────────────────────
router.post(
  "/modifiers",
  isInternalRequest,
  authMiddleware,
  requirePermission("cais", "create"),
  pendingInterceptor({
    module:    "cais",
    operation: "create",
    extractPayload: async (req) => ({
      entityId: null,
      payload: { new: req.body as Record<string, unknown> },
    }),
  }),
  logActivity({
    module: "cais",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: { new: req.body as Record<string, unknown> },
    }),
  }),
  MreController.createModifier
);

// ── Dashboard: POST /modifiers/:id/toggle-active ─────────────
// Must be before /modifiers/:id to avoid conflict
router.post(
  "/modifiers/:id/toggle-active",
  isInternalRequest,
  authMiddleware,
  requirePermission("cais", "update"),
  pendingInterceptor({
    module:    "cais",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "cais",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  MreController.toggleModifierActive
);

// ── Dashboard: PATCH /modifiers/:id ──────────────────────────
router.patch(
  "/modifiers/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("cais", "update"),
  pendingInterceptor({
    module:    "cais",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "cais",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  MreController.updateModifier
);

// ── Dashboard: DELETE /modifiers/:id ─────────────────────────
router.delete(
  "/modifiers/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("cais", "delete"),
  pendingInterceptor({
    module:    "cais",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cais",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  MreController.deleteModifier
);

export default router;