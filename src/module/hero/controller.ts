import type { Request, Response, NextFunction } from "express";
import { HeroService } from "./service.ts";
import type {
  UpsertHeroParams,
  GetAllHeroesParams,
  HeroLevel,
  BadgeIcon,
} from "./types/types.ts";

export class HeroController {
  static async upsertHero(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        id,
        report_id,
        tracking_id,
        craft_protected,
        case_summary,
        hero_level,
        badge_icon,
        location,
      } = req.body;

      const params: UpsertHeroParams = {
        id: id ?? null,
        report_id: report_id ?? null,
        tracking_id: tracking_id ?? null,
        craft_protected: craft_protected ?? null,
        case_summary: case_summary ?? null,
        hero_level: hero_level ?? null,
        badge_icon: badge_icon ?? null,
        location: location ?? null,
      };

      const result = await HeroService.upsertHero(params);

      res.status(id ? 200 : 201).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
  static async getHeroById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Hero ID is required",
        });
        return;
      }

      const hero = await HeroService.getHeroById(id);

      res.status(200).json({
        success: true,
        data: hero,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllHeroes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { is_claimed, hero_level, search, limit, offset } = req.query;

      // Parse query parameters
      const params: GetAllHeroesParams = {
        is_claimed:
          is_claimed === "true" ? true : is_claimed === "false" ? false : null,
        hero_level: hero_level ? (hero_level as HeroLevel) : null,
        search: search ? (search as string) : null,
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      };

      const heroes = await HeroService.getAllHeroes(params);

      res.status(200).json({
        success: true,
        data: heroes,
        count: heroes.length,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteHero(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Hero ID is required",
        });
        return;
      }

      const result = await HeroService.deleteHero(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/hero/claim
   * Claim a hero profile by tracking_id and story
   */
  static async claimHero(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tracking_id, story } = req.body;

      // Validate required fields
      if (!tracking_id) {
        res.status(400).json({
          success: false,
          message: "Tracking ID is required",
        });
        return;
      }

      if (!story) {
        res.status(400).json({
          success: false,
          message: "Story is required",
        });
        return;
      }

      const result = await HeroService.claimHero(tracking_id, story);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/heroes/claimed
   * Get all claimed heroes for public display
   */
  static async getClaimedHeroes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const heroes = await HeroService.getClaimedHeroes();

      res.status(200).json({
        success: true,
        data: heroes,
        count: heroes.length,
      });
    } catch (error) {
      next(error);
    }
  }
}