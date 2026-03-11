import { Router } from "express";
import { AccessController } from "./controller.ts";
import { authMiddleware } from "../../../middleware/authMiddleware.ts";
import { requireOwner } from "../../../middleware/permissionMiddleware.ts";
import { logActivity } from "../../../middleware/activityLogMiddleware.ts";

const router = Router();

// All access management routes are owner only
// authMiddleware + requireOwner on every route

// ── POST /dashboard/access/create ──────────────────────────
router.post(
  "/create",
  authMiddleware,
  requireOwner,
  logActivity({
    module: "access",
    action: "create",
    extractMeta: (req) => ({
      entityId: null,
      diff: {
        old: null,
        new: {
          email:      (req.body as { email?: unknown }).email,
          role_id:    (req.body as { role_id?: unknown }).role_id,
          duration_ms:(req.body as { duration_ms?: unknown }).duration_ms,
        },
      },
    }),
  }),
  AccessController.createAccess
);

// ── GET /dashboard/access/list ──────────────────────────────
router.get(
  "/list",
  authMiddleware,
  requireOwner,
  AccessController.listUsers
);

// ── GET /dashboard/access/extension-requests ───────────────
// Must be before /:id routes to avoid param conflict
router.get(
  "/extension-requests",
  authMiddleware,
  requireOwner,
  AccessController.listExtensionRequests
);

// ── PATCH /dashboard/access/extension-requests/:id ─────────
router.patch(
  "/extension-requests/:id",
  authMiddleware,
  requireOwner,
  logActivity({
    module: "access",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        old: null,
        new: { action: (req.body as { action?: unknown }).action },
      },
    }),
  }),
  AccessController.resolveExtensionRequest
);

// ── PATCH /dashboard/access/:id/revoke ─────────────────────
router.patch(
  "/:id/revoke",
  authMiddleware,
  requireOwner,
  logActivity({
    module: "access",
    action: "delete",
    extractMeta: (req) => ({ entityId: req.params["id"] ?? null }),
  }),
  AccessController.revokeAccess
);

// ── PATCH /dashboard/access/:id/toggle ─────────────────────
router.patch(
  "/:id/toggle",
  authMiddleware,
  requireOwner,
  logActivity({
    module: "access",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        old: null,
        new: { is_active: (req.body as { is_active?: unknown }).is_active },
      },
    }),
  }),
  AccessController.toggleActive
);

export default router;