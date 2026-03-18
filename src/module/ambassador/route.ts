// import { Router } from "express";
// import { AmbassadorController, AdminController } from "./controller.ts";
// import { authenticate } from "../../middleware/auth.ts";

// const router = Router();

// // Get current user's ambassador data (profile + stories)

// router.get("/ambassadors/me", authenticate, AmbassadorController.getMyData);

// // Get list of ambassadors or stories
 
// router.get("/ambassadors", AmbassadorController.list);

// // Get single ambassador or story (auto-detects type)

// router.get("/ambassadors/:id", AmbassadorController.getSingle);


// /**
//  * POST /api/ambassadors/profile
//  * Create or update ambassador profile
//  * Body: {
//  *   display_name: string (required, 2-100 chars)
//  *   bio?: string (optional, max 500 chars)
//  *   location?: string (optional)
//  *   profile_photo: string (required, base64 or URL)
//  *   certificate_photo?: string (optional, base64 or URL)
//  * }
//  */
// router.post(
//   "/ambassadors/profile",
//   authenticate,
//   AmbassadorController.createOrUpdateProfile,
// );

// /**
//  * POST /api/ambassadors/stories
//  * Create new story
//  * Body: {
//  *   delivery_id?: string (optional for now)
//  *   product_id: string (required)
//  *   product_name: string (required)
//  *   story_text: string (required, 50-300 chars)
//  *   product_photo: string (required, base64)
//  * }
//  */
// router.post(
//   "/ambassadors/stories",
//   authenticate,
//   AmbassadorController.createStory,
// );

// /**
//  * PUT /api/ambassadors/stories/:storyId
//  * Edit story (max 1 edit allowed)
//  * Body: {
//  *   story_text?: string (optional, 50-300 chars)
//  *   product_photo?: string (optional, base64 or URL)
//  * }
//  */
// router.put(
//   "/ambassadors/stories/:storyId",
//   authenticate,
//   AmbassadorController.editStory,
// );

// /**
//  * POST /api/ambassadors/stories/:storyId/interact
//  * Like or share story
//  * Body: {
//  *   action: "like" | "share" (required)
//  *   platform?: "twitter" | "facebook" | "whatsapp" | "copy" (required for share)
//  * }
//  * Auth: Required for like, Optional for share
//  */
// router.post(
//   "/ambassadors/stories/:storyId/interact",
//   AmbassadorController.interact,
// );

// /* ===== ADMIN ROUTES (2) ===== */
// router.get(
//   "/admin/ambassadors",
//   authenticate,
//   AdminController.getDashboard,
// );

// router.delete(
//   "/admin/ambassadors/:id",
//   authenticate,
//   AdminController.delete,
// );

// export default router;


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