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
}
