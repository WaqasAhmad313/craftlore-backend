import { Router } from "express";
import { PendingController } from "./controller.ts";
import { authMiddleware } from "../../../middleware/authMiddleware.ts";
import { requireApprover } from "../../../middleware/permissionMiddleware.ts";
import { logActivity } from "../../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── GET /dashboard/pending/mine ─────────────────────────────
// Any authenticated user — sees only their own changes
// Must be before /:id routes to avoid param conflict
router.get(
  "/mine",
  authMiddleware,
  PendingController.listMyPending
);

// ── GET /dashboard/pending ──────────────────────────────────
// Approvers only — scoped to their module access
// Owner sees everything
router.get(
  "/",
  authMiddleware,
  requireApprover("*"),
  PendingController.listPending
);

// ── PATCH /dashboard/pending/:id/approve ────────────────────
router.patch(
  "/:id/approve",
  authMiddleware,
  requireApprover("*"),
  logActivity({
    module: "pending",
    action: "approve",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  PendingController.approve
);

// ── PATCH /dashboard/pending/:id/reject ─────────────────────
router.patch(
  "/:id/reject",
  authMiddleware,
  requireApprover("*"),
  logActivity({
    module: "pending",
    action: "reject",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  PendingController.reject
);

export default router;