import { Router } from "express";
import BlacklistController from "./controller.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched ────────────────────────────────────────────────
router.get("/blacklist", BlacklistController.getAllBlacklist);
router.get("/blacklist/:id", BlacklistController.getBlacklistById);
router.get("/blacklist/craft/:craft_id", BlacklistController.getBlacklistByCraftId);
router.patch("/blacklist/:id/status", BlacklistController.updateBlacklistStatus);
router.post("/craft-entities/:id/unblock", BlacklistController.unblockEntity);

// ── Dashboard: POST /craft-entities/:id/block ────────────────
router.post(
  "/craft-entities/:id/block",
  isInternalRequest,
  authMiddleware,
  requirePermission("cktre", "update"),
  pendingInterceptor({
    module:    "cktre",
    operation: "update",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  logActivity({
    module: "cktre",
    action: "update",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
      diff: {
        new: (req.body as { new?: Record<string, unknown> }).new ?? null,
      },
    }),
  }),
  BlacklistController.blockEntity
);

// ── Dashboard: DELETE /blacklist/:id ────────────────────────
router.delete(
  "/blacklist/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("cktre", "delete"),
  pendingInterceptor({
    module:    "cktre",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "cktre",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  BlacklistController.deleteBlacklist
);

export default router;