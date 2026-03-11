import { Router } from "express";
import { RolesController } from "./controller.ts";
import { authMiddleware } from "../../../middleware/authMiddleware.ts";
import { requireOwner } from "../../../middleware/permissionMiddleware.ts";
import { logActivity } from "../../../middleware/activityLogMiddleware.ts";

const router = Router();

// All roles routes are owner only
// authMiddleware + requireOwner on every route

// ── POST /dashboard/roles ───────────────────────────────────
router.post(
  "/",
  authMiddleware,
  requireOwner,
  logActivity({
    module: "roles",
    action: "role_create",
    extractMeta: (req) => ({
      entityId: null,
      diff: {
        old: null,
        new: {
          name:        (req.body as { name?: unknown }).name,
          is_high_risk:(req.body as { is_high_risk?: unknown }).is_high_risk,
        },
      },
    }),
  }),
  RolesController.createRole
);

// ── GET /dashboard/roles ────────────────────────────────────
router.get(
  "/",
  authMiddleware,
  requireOwner,
  RolesController.listRoles
);

// ── GET /dashboard/roles/:id ────────────────────────────────
router.get(
  "/:id",
  authMiddleware,
  requireOwner,
  RolesController.getRole
);

// ── PATCH /dashboard/roles/:id ──────────────────────────────
// Must be before /:id/toggle to avoid conflict
router.patch(
  "/:id",
  authMiddleware,
  requireOwner,
  logActivity({
    module: "roles",
    action: "role_update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        old: null,
        new: {
          name:        (req.body as { name?: unknown }).name,
          is_high_risk:(req.body as { is_high_risk?: unknown }).is_high_risk,
          permissions: (req.body as { permissions?: unknown }).permissions,
        },
      },
    }),
  }),
  RolesController.updateRole
);

// ── DELETE /dashboard/roles/:id ─────────────────────────────
router.delete(
  "/:id",
  authMiddleware,
  requireOwner,
  logActivity({
    module: "roles",
    action: "role_delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  RolesController.deleteRole
);

// ── PATCH /dashboard/roles/:id/toggle ───────────────────────
router.patch(
  "/:id/toggle",
  authMiddleware,
  requireOwner,
  logActivity({
    module: "roles",
    action: "role_update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        old: null,
        new: {
          is_active: (req.body as { is_active?: unknown }).is_active,
        },
      },
    }),
  }),
  RolesController.toggleActive
);

export default router;