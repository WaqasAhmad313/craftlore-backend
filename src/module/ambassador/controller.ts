import type { Response } from "express";
import { AmbassadorService, AdminService } from "./service.ts";
import type { AuthenticatedRequest } from "../../middleware/auth.ts";
import type {
  CreateProfileInput,
  CreateStoryServiceInput,
  UpdateStoryServiceInput,
  InteractInput,
  ListParams,
} from "./service.ts";

/* ===== TYPED REQUEST INTERFACES ===== */

interface StoryIdParams {
  storyId: string;
  [key: string]: string;
}

interface IdParams {
  id: string;
  [key: string]: string;
}

interface AuthRequestWithStoryId extends AuthenticatedRequest {
  params: StoryIdParams;
}

interface AuthRequestWithId extends AuthenticatedRequest {
  params: IdParams;
}

/* ===== AMBASSADOR CONTROLLER ===== */

export class AmbassadorController {
  /**
   * GET /api/ambassadors
   * Get list of ambassadors or stories
   */
  static async list(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      console.log("📋 [AMBASSADOR] List request received");

      const view = (req.query.view as string) ?? "profiles";
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const filter = (req.query.filter as string) ?? "all";
      const sort = (req.query.sort as string) ?? "newest";
      const ambassadorId = req.query.ambassador_id as string | undefined;

      // Validate view
      if (view !== "profiles" && view !== "stories") {
        return res.status(400).json({
          success: false,
          message: "Invalid view parameter. Must be 'profiles' or 'stories'",
        });
      }

      // Validate filter
      if (filter !== "all" && filter !== "featured") {
        return res.status(400).json({
          success: false,
          message: "Invalid filter parameter. Must be 'all' or 'featured'",
        });
      }

      // Validate sort
      const validSorts = ["newest", "most_active", "most_liked", "most_shared"];
      if (!validSorts.includes(sort)) {
        return res.status(400).json({
          success: false,
          message: `Invalid sort parameter. Must be one of: ${validSorts.join(", ")}`,
        });
      }

      const params: ListParams = {
        view: view as "profiles" | "stories",
        page,
        limit,
        search,
        filter: filter as "all" | "featured",
        sort: sort as "newest" | "most_active" | "most_liked" | "most_shared",
        ambassador_id: ambassadorId,
      };

      const currentUserId = req.user?.id;
      const result = await AmbassadorService.list(params, currentUserId);

      console.log(
        `✅ [AMBASSADOR] List retrieved: ${result.total} total items`
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ [AMBASSADOR] List error:", error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to get list",
      });
    }
  }

  /**
   * GET /api/ambassadors/:id
   * Get single ambassador or story
   */
  static async getSingle(
    req: AuthRequestWithId,
    res: Response
  ): Promise<Response> {
    try {
      console.log("🔍 [AMBASSADOR] Get single request:", req.params.id);

      const { id } = req.params;
      const currentUserId = req.user?.id;

      const result = await AmbassadorService.getSingle(id, currentUserId);

      console.log(
        `✅ [AMBASSADOR] Retrieved ${result.type}:`,
        result.type === "ambassador"
          ? result.data.profile.display_name
          : result.data.product_name
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ [AMBASSADOR] Get single error:", error);
      return res.status(404).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Ambassador or story not found",
      });
    }
  }

  /**
   * POST /api/ambassadors/profile
   * Create or update ambassador profile
   */
  static async createOrUpdateProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      console.log("👤 [AMBASSADOR] Create/Update profile request");

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      const input = req.body as CreateProfileInput;

      // Validate required fields
      if (!input.display_name || !input.profile_photo) {
        return res.status(400).json({
          success: false,
          message: "display_name and profile_photo are required",
        });
      }

      // Validate display_name length
      if (input.display_name.length < 2 || input.display_name.length > 100) {
        return res.status(400).json({
          success: false,
          message: "display_name must be between 2 and 100 characters",
        });
      }

      // Validate bio length if provided
      if (input.bio && input.bio.length > 500) {
        return res.status(400).json({
          success: false,
          message: "bio must be less than 500 characters",
        });
      }

      const profile = await AmbassadorService.createOrUpdateProfile(
        userId,
        input
      );

      console.log("✅ [AMBASSADOR] Profile created/updated:", profile.id);

      return res.status(201).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error("❌ [AMBASSADOR] Create/Update profile error:", error);
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create/update profile",
      });
    }
  }

  /**
   * POST /api/ambassadors/stories
   * Create new story
   */
  static async createStory(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      console.log("📝 [AMBASSADOR] Create story request");

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      const input = req.body as CreateStoryServiceInput;

      // Validate required fields
      if (
        !input.product_name ||
        !input.story_text ||
        !input.product_photo
      ) {
        return res.status(400).json({
          success: false,
          message:
            "product_name, story_text, and product_photo are required",
        });
      }

      const story = await AmbassadorService.createStory(userId, input);

      console.log("✅ [AMBASSADOR] Story created:", story.id);

      return res.status(201).json({
        success: true,
        data: story,
      });
    } catch (error) {
      console.error("❌ [AMBASSADOR] Create story error:", error);
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create story",
      });
    }
  }

  /**
   * PUT /api/ambassadors/stories/:storyId
   * Edit story (max 1 edit)
   */
  static async editStory(
    req: AuthRequestWithStoryId,
    res: Response
  ): Promise<Response> {
    try {
      console.log("✏️ [AMBASSADOR] Edit story request:", req.params.storyId);

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      const { storyId } = req.params;
      const input = req.body as UpdateStoryServiceInput;

      // Validate at least one field is provided
      if (!input.story_text && !input.product_photo) {
        return res.status(400).json({
          success: false,
          message: "At least one field (story_text or product_photo) is required",
        });
      }

      const story = await AmbassadorService.editStory(userId, storyId, input);

      console.log("✅ [AMBASSADOR] Story edited:", story.id);

      return res.json({
        success: true,
        data: story,
      });
    } catch (error) {
      console.error("❌ [AMBASSADOR] Edit story error:", error);
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to edit story",
      });
    }
  }

  /**
   * GET /api/ambassadors/me
   * Get current user's ambassador data
   */
  static async getMyData(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      console.log("👤 [AMBASSADOR] Get my data request");

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - No user ID",
        });
      }

      const data = await AmbassadorService.getMyData(userId);

      console.log("✅ [AMBASSADOR] My data retrieved:", data.id);

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("❌ [AMBASSADOR] Get my data error:", error);
      return res.status(404).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Ambassador profile not found",
      });
    }
  }

  /**
   * POST /api/ambassadors/stories/:storyId/interact
   * Like or share story
   */
  static async interact(
    req: AuthRequestWithStoryId,
    res: Response
  ): Promise<Response> {
    try {
      console.log("❤️ [AMBASSADOR] Interact request:", req.params.storyId);

      const { storyId } = req.params;
      const input = req.body as InteractInput;

      // Validate action
      if (!input.action || (input.action !== "like" && input.action !== "share")) {
        return res.status(400).json({
          success: false,
          message: "action must be 'like' or 'share'",
        });
      }

      // Validate platform for share
      if (input.action === "share" && !input.platform) {
        return res.status(400).json({
          success: false,
          message: "platform is required for share action",
        });
      }

      const userId = req.user?.id;
      const result = await AmbassadorService.interact(storyId, input, userId);

      console.log("✅ [AMBASSADOR] Interaction completed:", result.action);

      // Generate share URL and text for shares
      if (input.action === "share") {
        const shareUrl = `${process.env.FRONTEND_URL}/ambassadors/${storyId}`;
        const shareText = `Check out this amazing craft story!`;

        return res.json({
          success: true,
          data: {
            ...result,
            share_url: shareUrl,
            share_text: shareText,
          },
        });
      }

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ [AMBASSADOR] Interact error:", error);
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to process interaction",
      });
    }
  }
}

/* ===== ADMIN CONTROLLER ===== */

export class AdminController {
  /**
   * GET /api/admin/ambassadors
   * Get admin dashboard (stats + list)
   */
  static async getDashboard(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      console.log("📊 [ADMIN] Dashboard request");

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const sort = (req.query.sort as string) ?? "newest";

      // Validate sort
      const validSorts = ["newest", "most_active"];
      if (!validSorts.includes(sort)) {
        return res.status(400).json({
          success: false,
          message: `Invalid sort parameter. Must be one of: ${validSorts.join(", ")}`,
        });
      }

      const data = await AdminService.getDashboard({
        page,
        limit,
        search,
        sort: sort as "newest" | "most_active",
      });

      console.log(
        "✅ [ADMIN] Dashboard retrieved:",
        data.stats.total_ambassadors,
        "ambassadors"
      );

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("❌ [ADMIN] Dashboard error:", error);
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to get dashboard data",
      });
    }
  }

  /**
   * DELETE /api/admin/ambassadors/:id
   * Delete ambassador or story
   */
  static async delete(
    req: AuthRequestWithId,
    res: Response
  ): Promise<Response> {
    try {
      console.log("🗑️ [ADMIN] Delete request:", req.params.id);

      const { id } = req.params;
      const result = await AdminService.delete(id);

      console.log("✅ [ADMIN] Deleted:", result.message);

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("❌ [ADMIN] Delete error:", error);
      return res.status(404).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Ambassador or story not found",
      });
    }
  }
}

export default {
  AmbassadorController,
  AdminController,
};