import { Router } from "express";
import { AmbassadorController, AdminController } from "./controller.ts";
import { authenticate } from "../../middleware/auth.ts";
import { isInternalRequest } from "../../middleware/internalMiddleware.ts";
import { authMiddleware } from "../../middleware/authMiddleware.ts";
import { requirePermission } from "../../middleware/permissionMiddleware.ts";
import { pendingInterceptor } from "../../middleware/pendingMiddleware.ts";
import { logActivity } from "../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── Untouched ────────────────────────────────────────────────
router.get("/ambassadors/me", authenticate, AmbassadorController.getMyData);
router.get("/ambassadors", AmbassadorController.list);
router.get("/ambassadors/:id", AmbassadorController.getSingle);
router.post("/ambassadors/profile", authenticate, AmbassadorController.createOrUpdateProfile);
router.post("/ambassadors/stories", authenticate, AmbassadorController.createStory);
router.put("/ambassadors/stories/:storyId", authenticate, AmbassadorController.editStory);
router.post("/ambassadors/stories/:storyId/interact", AmbassadorController.interact);
router.get("/admin/ambassadors", AdminController.getDashboard);

// ── Dashboard: DELETE /admin/ambassadors/:id ─────────────────
router.delete(
  "/admin/ambassadors/:id",
  isInternalRequest,
  authMiddleware,
  requirePermission("clie", "delete"),
  pendingInterceptor({
    module:    "clie",
    operation: "delete",
    extractPayload: async (req) => ({
      entityId: req.params["id"] ?? null,
      payload: {
        new: null,
      },
    }),
  }),
  logActivity({
    module: "clie",
    action: "delete",
    extractMeta: (req) => ({
      entityId: req.params["id"] ?? null,
    }),
  }),
  AdminController.delete
);

export default router;