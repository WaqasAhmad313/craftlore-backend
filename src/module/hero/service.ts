import { HeroModel } from "./model.ts";
import type {
  UpsertHeroParams,
  UpsertHeroResult,
  BaseHero,
  GetAllHeroesParams,
  DeleteHeroResult,
} from "./types/types.ts";

export class HeroService {
  static async upsertHero(params: UpsertHeroParams): Promise<UpsertHeroResult> {
    // Validate required fields for CREATE
    if (!params.id) {
      if (!params.report_id) {
        throw new Error("report_id is required for creating a hero");
      }
      if (!params.tracking_id) {
        throw new Error("tracking_id is required for creating a hero");
      }
      if (!params.craft_protected) {
        throw new Error("craft_protected is required for creating a hero");
      }
      if (!params.case_summary) {
        throw new Error("case_summary is required for creating a hero");
      }
    }

    // Validate required fields for UPDATE
    if (params.id) {
      if (!params.id.trim()) {
        throw new Error("Invalid hero ID for update");
      }
    }

    // Validate hero_level if provided
    if (params.hero_level) {
      const validLevels = ["Hero I", "Hero II", "Hero III", "Hero IV"];
      if (!validLevels.includes(params.hero_level)) {
        throw new Error(
          "Invalid hero_level. Must be one of: Hero I, Hero II, Hero III, Hero IV"
        );
      }
    }

    // Validate badge_icon if provided
    if (params.badge_icon) {
      const validIcons = ["shield", "award", "heart", "flag", "globe", "star"];
      if (!validIcons.includes(params.badge_icon)) {
        throw new Error(
          "Invalid badge_icon. Must be one of: shield, award, heart, flag, globe, star"
        );
      }
    }

    return await HeroModel.upsert(params);
  }

  static async getHeroById(id: string): Promise<BaseHero> {
    if (!id || !id.trim()) {
      throw new Error("Hero ID is required");
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid UUID format for hero ID");
    }

    return await HeroModel.getById({ id });
  }

  static async getAllHeroes(params: GetAllHeroesParams): Promise<BaseHero[]> {
    // Validate pagination parameters
    if (params.limit !== undefined && params.limit !== null) {
      if (params.limit < 1 || params.limit > 1000) {
        throw new Error("limit must be between 1 and 1000");
      }
    }

    if (params.offset !== undefined && params.offset !== null) {
      if (params.offset < 0) {
        throw new Error("offset must be 0 or greater");
      }
    }

    // Validate hero_level if provided
    if (params.hero_level) {
      const validLevels = ["Hero I", "Hero II", "Hero III", "Hero IV"];
      if (!validLevels.includes(params.hero_level)) {
        throw new Error(
          "Invalid hero_level. Must be one of: Hero I, Hero II, Hero III, Hero IV"
        );
      }
    }

    return await HeroModel.getAll(params);
  }

  static async deleteHero(id: string): Promise<DeleteHeroResult> {
    if (!id || !id.trim()) {
      throw new Error("Hero ID is required");
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error("Invalid UUID format for hero ID");
    }

    return await HeroModel.delete({ id });
  }

  /**
   * Claim a hero profile by tracking_id
   */
  static async claimHero(
    trackingId: string,
    story: string
  ): Promise<{ success: boolean; message: string }> {
    // Validate tracking_id
    if (!trackingId || !trackingId.trim()) {
      throw new Error("Tracking ID is required");
    }

    // Validate story
    if (!story || !story.trim()) {
      throw new Error("Story is required");
    }

    const trimmedStory = story.trim();

    // Validate story length (min 50, max 2000 characters)
    if (trimmedStory.length < 50) {
      throw new Error("Story must be at least 50 characters long");
    }

    if (trimmedStory.length > 2000) {
      throw new Error("Story must not exceed 2000 characters");
    }

    // Call model to update database
    await HeroModel.claimHero(trackingId, trimmedStory);

    return {
      success: true,
      message: "Hero claimed successfully!",
    };
  }

  /**
   * Get all claimed heroes for public display
   */
  static async getClaimedHeroes(): Promise<
    Array<{
      id: string;
      full_name: string;
      hero_level: string;
      badge_icon: string;
      craft_protected: string;
      location: string | null;
      recognition_date: string;
      case_summary: string;
      story: string;
    }>
  > {
    return await HeroModel.getClaimedHeroes();
  }
}