import { Router } from "express";
import { AmbassadorController, AdminController } from "./controller.ts";
import { authenticate } from "../../middleware/auth.ts";
import { requireAdmin } from "../../middleware/requireAdmin.ts";

const router = Router();

// Get current user's ambassador data (profile + stories)

router.get("/ambassadors/me", authenticate, AmbassadorController.getMyData);

// Get list of ambassadors or stories
 
router.get("/ambassadors", AmbassadorController.list);

// Get single ambassador or story (auto-detects type)

router.get("/ambassadors/:id", AmbassadorController.getSingle);


/**
 * POST /api/ambassadors/profile
 * Create or update ambassador profile
 * Body: {
 *   display_name: string (required, 2-100 chars)
 *   bio?: string (optional, max 500 chars)
 *   location?: string (optional)
 *   profile_photo: string (required, base64 or URL)
 *   certificate_photo?: string (optional, base64 or URL)
 * }
 */
router.post(
  "/ambassadors/profile",
  authenticate,
  AmbassadorController.createOrUpdateProfile,
);

/**
 * POST /api/ambassadors/stories
 * Create new story
 * Body: {
 *   delivery_id?: string (optional for now)
 *   product_id: string (required)
 *   product_name: string (required)
 *   story_text: string (required, 50-300 chars)
 *   product_photo: string (required, base64)
 * }
 */
router.post(
  "/ambassadors/stories",
  authenticate,
  AmbassadorController.createStory,
);

/**
 * PUT /api/ambassadors/stories/:storyId
 * Edit story (max 1 edit allowed)
 * Body: {
 *   story_text?: string (optional, 50-300 chars)
 *   product_photo?: string (optional, base64 or URL)
 * }
 */
router.put(
  "/ambassadors/stories/:storyId",
  authenticate,
  AmbassadorController.editStory,
);

/**
 * POST /api/ambassadors/stories/:storyId/interact
 * Like or share story
 * Body: {
 *   action: "like" | "share" (required)
 *   platform?: "twitter" | "facebook" | "whatsapp" | "copy" (required for share)
 * }
 * Auth: Required for like, Optional for share
 */
router.post(
  "/ambassadors/stories/:storyId/interact",
  AmbassadorController.interact,
);

/* ===== ADMIN ROUTES (2) ===== */

/**
 * GET /api/admin/ambassadors
 * Get admin dashboard (stats + ambassador list)
 * Query params:
 *  - page: number (default: 1)
 *  - limit: number (default: 20)
 *  - search: string (optional)
 *  - sort: "newest" | "most_active" (default: newest)
 * Returns: {
 *   stats: { total_ambassadors, total_stories, top_ambassadors, ... }
 *   ambassadors: { items, total, page, limit }
 * }
 */
router.get(
  "/admin/ambassadors",
  authenticate,
  requireAdmin,
  AdminController.getDashboard,
);

/**
 * DELETE /api/admin/ambassadors/:id
 * Delete ambassador profile or story (auto-detects type)
 * - If ID is ambassador_id: deletes entire profile + all stories
 * - If ID is story_id: deletes only that story
 */
router.delete(
  "/admin/ambassadors/:id",
  authenticate,
  requireAdmin,
  AdminController.delete,
);

export default router;
