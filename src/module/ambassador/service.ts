import { randomUUID } from "crypto";
import {
  AmbassadorModel,
  StoryInteractionModel,
  type Ambassador,
  type AmbassadorProfile,
  type AmbassadorStory,
  type CreateStoryInput,
  type UpdateProfileInput,
  type UpdateStoryInput,
} from "./model.ts";
import {
  uploadImage,
  isCloudinaryUrl,
  type CloudinaryUploadResult,
} from "./cloudinary.ts";

/* ===== TYPE DEFINITIONS ===== */

export interface CreateProfileInput {
  display_name: string;
  bio?: string | null;
  location?: string | null;
  profile_photo: string;
  certificate_photo?: string | null;
}

export interface CreateStoryServiceInput {
  delivery_id?: string | null;
  product_name: string;
  story_text: string;
  product_photo: string;
}

export interface UpdateStoryServiceInput {
  story_text?: string;
  product_photo?: string;
}

export interface InteractInput {
  action: "like" | "share";
  platform?: "twitter" | "facebook" | "whatsapp" | "copy";
}

export interface ListParams {
  view: "profiles" | "stories";
  page: number;
  limit: number;
  search?: string;
  filter?: "all" | "featured";
  sort: "newest" | "most_active" | "most_liked" | "most_shared";
  ambassador_id?: string;
}

/* ===== AMBASSADOR SERVICE ===== */

export class AmbassadorService {
  /**
   * Create or update ambassador profile
   */
  static async createOrUpdateProfile(
    userId: string,
    input: CreateProfileInput
  ): Promise<Ambassador> {
    // Check if profile already exists
    const existing = await AmbassadorModel.getByUserId(userId);

    // Upload new photos if provided (base64)
    let profilePhotoUrl = input.profile_photo;
    let certificatePhotoUrl = input.certificate_photo ?? null;

    // Upload profile photo if it's base64
    if (!isCloudinaryUrl(input.profile_photo)) {
      const result = await uploadImage(input.profile_photo, "profiles");
      profilePhotoUrl = result.secure_url;
    }

    // Upload certificate photo if provided and it's base64
    if (
      input.certificate_photo &&
      !isCloudinaryUrl(input.certificate_photo)
    ) {
      const result = await uploadImage(input.certificate_photo, "certificates");
      certificatePhotoUrl = result.secure_url;
    }

    const profileData: AmbassadorProfile = {
      display_name: input.display_name,
      bio: input.bio ?? null,
      location: input.location ?? null,
      profile_photo_url: profilePhotoUrl,
      certificate_photo_url: certificatePhotoUrl,
    };

    if (existing) {
      // Update existing profile
      return await AmbassadorModel.updateProfile(userId, profileData);
    } else {
      // Create new profile
      return await AmbassadorModel.create({
        user_id: userId,
        profile: profileData,
      });
    }
  }

  /**
   * Create new story
   */
  static async createStory(
    userId: string,
    input: CreateStoryServiceInput
  ): Promise<AmbassadorStory> {
    // Verify user has ambassador profile
    const ambassador = await AmbassadorModel.getByUserId(userId);
    if (!ambassador) {
      throw new Error("You must create an ambassador profile first");
    }

    // Validate story text length
    if (input.story_text.length < 50 || input.story_text.length > 300) {
      throw new Error("Story text must be between 50 and 300 characters");
    }

    // Upload product photo only if it's base64, otherwise use the URL as-is
    let productPhotoUrl = input.product_photo;
    if (!isCloudinaryUrl(input.product_photo)) {
      const photoResult = await uploadImage(input.product_photo, "stories");
      productPhotoUrl = photoResult.secure_url;
    }

    // Create story object
    const story: AmbassadorStory = {
      id: randomUUID(),
      delivery_id: input.delivery_id ?? null,
      product_id: input.delivery_id ?? null, // Use delivery_id as product_id for now
      product_name: input.product_name,
      story_text: input.story_text,
      product_photo_url: productPhotoUrl,
      likes_count: 0,
      shares_count: 0,
      is_featured: false,
      edit_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_edited_at: null,
    };

    // Add story to ambassador
    await AmbassadorModel.addStory(userId, story);

    return story;
  }

  /**
   * Edit story (max 1 edit allowed)
   */
  static async editStory(
    userId: string,
    storyId: string,
    input: UpdateStoryServiceInput
  ): Promise<AmbassadorStory> {
    // Get ambassador
    const ambassador = await AmbassadorModel.getByUserId(userId);
    if (!ambassador) {
      throw new Error("Ambassador profile not found");
    }

    // Find story
    const story = ambassador.stories.find((s) => s.id === storyId);
    if (!story) {
      throw new Error("Story not found");
    }

    // Check edit count
    if (story.edit_count >= 1) {
      throw new Error("Story has already been edited once (maximum reached)");
    }

    // Validate story text if provided
    if (input.story_text) {
      if (input.story_text.length < 50 || input.story_text.length > 300) {
        throw new Error("Story text must be between 50 and 300 characters");
      }
    }

    // Upload new photo if provided and it's base64
    let productPhotoUrl = story.product_photo_url;
    if (input.product_photo && !isCloudinaryUrl(input.product_photo)) {
      const result = await uploadImage(input.product_photo, "stories");
      productPhotoUrl = result.secure_url;
    }

    const updates: UpdateStoryInput = {
      story_text: input.story_text,
      product_photo_url: productPhotoUrl,
    };

    // Update story
    const updated = await AmbassadorModel.updateStory(userId, storyId, updates);

    // Find and return updated story
    const updatedStory = updated.stories.find((s) => s.id === storyId);
    if (!updatedStory) {
      throw new Error("Failed to update story");
    }

    return updatedStory;
  }

  /**
   * Get list of ambassadors or stories
   */
  static async list(
    params: ListParams,
    currentUserId?: string
  ): Promise<{
    items: Ambassador[] | Array<AmbassadorStory & { ambassador: AmbassadorProfile; ambassador_id: string; user_liked?: boolean }>;
    total: number;
    page: number;
    limit: number;
  }> {
    if (params.view === "profiles") {
      // Get ambassador profiles
      const result = await AmbassadorModel.getAll({
        page: params.page,
        limit: params.limit,
        search: params.search,
        sort: params.sort === "most_shared" ? "most_liked" : params.sort,
      });

      return {
        items: result.ambassadors,
        total: result.total,
        page: params.page,
        limit: params.limit,
      };
    } else {
      // Get stories
      const result = await AmbassadorModel.getAllStories({
        page: params.page,
        limit: params.limit,
        filter: params.filter ?? "all",
        ambassadorId: params.ambassador_id,
        sort: params.sort === "most_active" ? "newest" : params.sort,
      });

      // If user is authenticated, check which stories they've liked
      if (currentUserId) {
        const likedStoryIds = await StoryInteractionModel.getUserLikes(
          currentUserId
        );
        const storiesWithLikeStatus = result.stories.map((story) => ({
          ...story,
          user_liked: likedStoryIds.includes(story.id),
        }));

        return {
          items: storiesWithLikeStatus,
          total: result.total,
          page: params.page,
          limit: params.limit,
        };
      }

      return {
        items: result.stories,
        total: result.total,
        page: params.page,
        limit: params.limit,
      };
    }
  }

  /**
   * Get single ambassador or story by ID
   */
  static async getSingle(
    id: string,
    currentUserId?: string
  ): Promise<
    | { type: "ambassador"; data: Ambassador }
    | { type: "story"; data: AmbassadorStory & { ambassador: Ambassador; user_liked?: boolean } }
  > {
    // Try to get as ambassador first
    const ambassador = await AmbassadorModel.getById(id);
    if (ambassador) {
      return { type: "ambassador", data: ambassador };
    }

    // Try to get as story
    const story = await AmbassadorModel.getStoryById(id);
    if (story) {
      // Check if user has liked this story
      let userLiked = false;
      if (currentUserId) {
        userLiked = await StoryInteractionModel.hasUserLiked(
          currentUserId,
          id
        );
      }

      return {
        type: "story",
        data: { ...story, user_liked: userLiked },
      };
    }

    throw new Error("Ambassador or story not found");
  }

  /**
   * Get current user's ambassador data
   */
  static async getMyData(userId: string): Promise<Ambassador> {
    const ambassador = await AmbassadorModel.getByUserId(userId);
    if (!ambassador) {
      throw new Error("Ambassador profile not found");
    }
    return ambassador;
  }

  /**
   * Handle story interaction (like or share)
   */
  static async interact(
    storyId: string,
    input: InteractInput,
    userId: string | undefined
  ): Promise<{
    action: "liked" | "unliked" | "shared";
    likes_count: number;
    shares_count: number;
  }> {
    // Get story to find ambassador_id
    const story = await AmbassadorModel.getStoryById(storyId);
    if (!story) {
      throw new Error("Story not found");
    }

    if (input.action === "like") {
      // LIKES REQUIRE AUTHENTICATION
      if (!userId) {
        throw new Error("Authentication required to like stories");
      }

      // Check if already liked
      const hasLiked = await StoryInteractionModel.hasUserLiked(
        userId,
        storyId
      );

      if (hasLiked) {
        // Unlike
        await StoryInteractionModel.delete(userId, storyId, "like");
        await AmbassadorModel.updateStoryCount(
          story.ambassador.id,
          storyId,
          "likes_count",
          -1
        );
        await AmbassadorModel.recalculateStats(story.ambassador.id);

        return {
          action: "unliked",
          likes_count: story.likes_count - 1,
          shares_count: story.shares_count,
        };
      } else {
        // Like
        await StoryInteractionModel.create({
          ambassador_id: story.ambassador.id,
          story_id: storyId,
          user_id: userId,
          interaction_type: "like",
        });
        await AmbassadorModel.updateStoryCount(
          story.ambassador.id,
          storyId,
          "likes_count",
          1
        );
        await AmbassadorModel.recalculateStats(story.ambassador.id);

        return {
          action: "liked",
          likes_count: story.likes_count + 1,
          shares_count: story.shares_count,
        };
      }
    } else {
      // SHARES ALLOW ANONYMOUS (userId can be null)
      if (!input.platform) {
        throw new Error("Platform is required for sharing");
      }

      // Create share interaction (userId can be null for anonymous)
      try {
        await StoryInteractionModel.create({
          ambassador_id: story.ambassador.id,
          story_id: storyId,
          user_id: userId ?? null, // NULL for anonymous shares
          interaction_type: "share",
          platform: input.platform,
        });
      } catch {
        // For authenticated users: ignore duplicate share errors
        // For anonymous users: this shouldn't happen (no unique constraint)
      }

      // Increment share count
      await AmbassadorModel.updateStoryCount(
        story.ambassador.id,
        storyId,
        "shares_count",
        1
      );
      await AmbassadorModel.recalculateStats(story.ambassador.id);

      return {
        action: "shared",
        likes_count: story.likes_count,
        shares_count: story.shares_count + 1,
      };
    }
  }

  /**
   * Update featured status for all stories (background job)
   */
  static async updateFeaturedStatus(): Promise<void> {
    // This would be called by a cron job
    const query = `
      UPDATE ambassadors
      SET stories = (
        SELECT jsonb_agg(
          jsonb_set(
            story,
            '{is_featured}',
            CASE 
              WHEN ((story->>'likes_count')::int + ((story->>'shares_count')::int * 3)) >= 50
              THEN 'true'::jsonb
              ELSE 'false'::jsonb
            END
          )
        )
        FROM jsonb_array_elements(stories) AS story
      )
    `;

    const { db } = await import("../../config/db.ts");
    await db.query(query);
  }
}

/* ===== ADMIN SERVICE ===== */

export class AdminService {
  /**
   * Get admin dashboard data (stats + list)
   */
  static async getDashboard(params: {
    page: number;
    limit: number;
    search?: string;
    sort: "newest" | "most_active";
  }): Promise<{
    stats: {
      total_ambassadors: number;
      total_stories: number;
      total_likes: number;
      total_shares: number;
      stories_this_month: number;
      ambassadors_this_month: number;
      top_ambassadors: Array<{
        id: string;
        display_name: string;
        total_stories: number;
        total_likes: number;
      }>;
      top_stories: Array<{
        id: string;
        product_name: string;
        likes_count: number;
        shares_count: number;
        ambassador_name: string;
      }>;
    };
    ambassadors: {
      items: Ambassador[];
      total: number;
      page: number;
      limit: number;
    };
  }> {
    // Get stats
    const stats = await AmbassadorModel.getAdminStats();

    // Get ambassadors list
    const result = await AmbassadorModel.getAll({
      page: params.page,
      limit: params.limit,
      search: params.search,
      sort: params.sort,
    });

    return {
      stats,
      ambassadors: {
        items: result.ambassadors,
        total: result.total,
        page: params.page,
        limit: params.limit,
      },
    };
  }

  /**
   * Delete ambassador or story
   */
  static async delete(id: string): Promise<{ message: string }> {
    // Try as ambassador first
    const ambassador = await AmbassadorModel.getById(id);
    if (ambassador) {
      // Delete all interactions for this ambassador
      await StoryInteractionModel.deleteByAmbassadorId(id);
      // Delete ambassador
      await AmbassadorModel.delete(id);
      return { message: "Ambassador profile deleted successfully" };
    }

    // Try as story
    const story = await AmbassadorModel.getStoryById(id);
    if (story) {
      // Delete interactions for this story
      await StoryInteractionModel.deleteByStoryId(id);
      // Delete story
      await AmbassadorModel.deleteStory(story.ambassador.id, id);
      return { message: "Story deleted successfully" };
    }

    throw new Error("Ambassador or story not found");
  }
}

export default {
  AmbassadorService,
  AdminService,
};