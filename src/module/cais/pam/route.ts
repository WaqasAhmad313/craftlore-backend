import { Router } from "express";
import PamController from "./controller.ts";
import { isInternalRequest } from "../../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../../middleware/authMiddleware.ts";
import { requirePermission } from "../../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched ────────────────────────────────────────────────
router.post("/appraisals", PamController.create);
router.get("/appraisals", PamController.list);
router.get("/appraisals/stats", PamController.stats);
router.get("/appraisals/:id", PamController.getDetails);

// ── Dashboard: POST /appraisals/:id/approve ──────────────────
router.post(
  "/appraisals/:id/approve",
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
  PamController.approve
);

// ── Dashboard: POST /appraisals/:id/reject ───────────────────
router.post(
  "/appraisals/:id/reject",
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
  PamController.reject
);

// ── Dashboard: PATCH /appraisals/:id ─────────────────────────
router.patch(
  "/appraisals/:id",
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
  PamController.editPayload
);

// ── Dashboard: DELETE /appraisals/:id ────────────────────────
router.delete(
  "/appraisals/:id",
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
  PamController.delete
);

export default router;