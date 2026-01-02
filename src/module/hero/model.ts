import { db } from "../../config/db.ts";
import type {
  UpsertHeroParams,
  UpsertHeroResult,
  BaseHero,
  GetHeroByIdParams,
  GetAllHeroesParams,
  DeleteHeroParams,
  DeleteHeroResult,
} from "./types/types.ts";

export class HeroModel {
  static async upsert(params: UpsertHeroParams): Promise<UpsertHeroResult> {
    const sql = `
      SELECT * FROM upsert_hero(
        $1::uuid,
        $2::uuid,
        $3::varchar,
        $4::text,
        $5::text,
        $6::text,
        $7::text,
        $8::text
      )
    `;

    const values: (string | null)[] = [
      params.id ?? null,
      params.report_id ?? null,
      params.tracking_id ?? null,
      params.craft_protected ?? null,
      params.case_summary ?? null,
      params.hero_level ?? null,
      params.badge_icon ?? null,
      params.location ?? null,
    ];

    const result = await db.query(sql, values);

    const row = result.rows[0] as BaseHero | undefined;

    if (!row) {
      throw new Error("upsert_hero returned no result");
    }

    const isCreate = !params.id;
    const message = isCreate
      ? "Hero created successfully"
      : "Hero updated successfully";

    return {
      success: true,
      message,
    };
  }

  static async getById(params: GetHeroByIdParams): Promise<BaseHero> {
    const sql = `
      SELECT * FROM get_hero_by_id($1::uuid)
    `;

    const values: string[] = [params.id];

    const result = await db.query(sql, values);

    const row = result.rows[0] as BaseHero | undefined;

    if (!row) {
      throw new Error("Hero not found");
    }

    return row;
  }

  static async getAll(params: GetAllHeroesParams): Promise<BaseHero[]> {
    const sql = `
      SELECT * FROM get_all_heroes(
        $1::boolean,
        $2::text,
        $3::text,
        $4::int,
        $5::int
      )
    `;

    const values: (boolean | string | number | null)[] = [
      params.is_claimed ?? null,
      params.hero_level ?? null,
      params.search ?? null,
      params.limit ?? 100,
      params.offset ?? 0,
    ];

    const result = await db.query(sql, values);

    return result.rows as BaseHero[];
  }

  static async delete(params: DeleteHeroParams): Promise<DeleteHeroResult> {
    const sql = `
      SELECT * FROM delete_hero($1::uuid)
    `;

    const values: string[] = [params.id];

    const result = await db.query(sql, values);

    const row = result.rows[0] as BaseHero | undefined;

    if (!row) {
      throw new Error("Hero not found");
    }

    return {
      success: true,
      message: "Hero deleted successfully",
    };
  }

    /**
   * Claim a hero by tracking_id and update story
   */
  static async claimHero(trackingId: string, story: string): Promise<void> {
    const sql = `
      UPDATE craft_heroes
      SET 
        story = $1::text,
        is_claimed = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE tracking_id = $2::varchar
        AND is_claimed = false
      RETURNING id
    `;

    const values: string[] = [story, trackingId];

    const result = await db.query(sql, values);

    if (result.rowCount === 0) {
      // Check if tracking_id exists but already claimed
      const checkSql = `
        SELECT is_claimed FROM craft_heroes WHERE tracking_id = $1::varchar
      `;
      const checkResult = await db.query(checkSql, [trackingId]);

      if (checkResult.rows.length === 0) {
        throw new Error("Invalid tracking ID");
      }

      const isClaimed = checkResult.rows[0].is_claimed as boolean;
      if (isClaimed) {
        throw new Error("This hero has already been claimed");
      }

      throw new Error("Failed to claim hero");
    }
  }

  /**
   * Get all claimed heroes with reporter name (JOIN with counterfeit_reports)
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
    const sql = `
      SELECT 
        ch.id,
        cr.reporter_info->>'name' as full_name,
        ch.hero_level,
        ch.badge_icon,
        ch.craft_protected,
        ch.location,
        ch.recognition_date,
        ch.case_summary,
        ch.story
      FROM craft_heroes ch
      INNER JOIN counterfeit_reports cr ON ch.report_id = cr.id
      WHERE ch.is_claimed = true
      ORDER BY ch.recognition_date DESC
    `;

    const result = await db.query(sql);

    return result.rows as Array<{
      id: string;
      full_name: string;
      hero_level: string;
      badge_icon: string;
      craft_protected: string;
      location: string | null;
      recognition_date: string;
      case_summary: string;
      story: string;
    }>;
  }
}