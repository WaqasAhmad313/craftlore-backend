import { db } from "../../../config/db.ts";

/**
 * DB tables used:
 * - public.market_rates
 * - public.rate_modifiers
 *
 * NOTE: We store "categories" as special rows in rate_modifiers with:
 *   meta: { "category_only": true }
 * This avoids a 3rd table while still giving the frontend a category list.
 */

export type MreRateType = "wholesale" | "retail" | "export";
export type MreTrendDirection = "up" | "down" | "stable";

export type ModifierType = "percentage" | "multiplier" | "fixed_amount";
export type ModifierRateType = "all" | "retail" | "wholesale" | "export";

export interface MreMarketRateRow {
  id: string; // BIGSERIAL -> comes as string in many pg setups, we also cast some numerics
  craft_type: string;
  region: string;
  rate_type: MreRateType;

  current_rate: number;
  currency: string;

  trend_direction: MreTrendDirection;
  trend_percentage: number;

  effective_from: string; // DATE
  effective_until: string | null; // DATE

  source_name: string | null;
  source_meta: Record<string, unknown>;

  created_at: string;
  updated_at: string;
}

export interface MreCategoryRow {
  id: string;
  category_name: string;
  category_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MreModifierRow {
  id: string;

  // Stored in DB
  category_name: string;
  modifier_name: string;
  description: string | null;

  modifier_type: ModifierType;
  modifier_value: number;

  craft_type: string | null;
  region: string | null;
  rate_type: ModifierRateType;

  specification_key: string | null;
  specification_value: string | null;

  priority: number;
  is_stackable: boolean;
  is_active: boolean;

  effective_from: string; // DATE

  example_calculation: string | null;
  meta: Record<string, unknown>;

  created_at: string;
  updated_at: string;

  /**
   * Extra fields for frontend-compat (not stored columns):
   * - category_id: the "category row id" found in rate_modifiers category-only rows
   * - mre_modifier_categories: object like Supabase join
   */
  category_id?: string | null;
  mre_modifier_categories?: {
    id: string;
    category_name: string;
    description: string | null;
  } | null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  return {};
}

class MreModel {
  // -------------------------
  // Rates
  // -------------------------
  static async listRates(filters: {
    craft_type?: string;
    region?: string;
    rate_type?: string;
  }): Promise<MreMarketRateRow[]> {
    const where: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (filters.craft_type) {
      where.push(`craft_type = $${i++}`);
      values.push(filters.craft_type);
    }
    if (filters.region) {
      where.push(`region = $${i++}`);
      values.push(filters.region);
    }
    if (filters.rate_type) {
      where.push(`rate_type = $${i++}`);
      values.push(filters.rate_type);
    }

    const sql = `
      SELECT
        id::text as id,
        craft_type,
        region,
        rate_type,
        current_rate::float8 as current_rate,
        currency,
        trend_direction,
        trend_percentage::float8 as trend_percentage,
        effective_from::text as effective_from,
        effective_until::text as effective_until,
        source_name,
        source_meta,
        created_at::text as created_at,
        updated_at::text as updated_at
      FROM market_rates
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY craft_type ASC, rate_type ASC, effective_from DESC
    `;

    const result = await db.query<MreMarketRateRow>(sql, values);
    return result.rows.map((r) => ({
      ...r,
      source_meta: asObject((r as any).source_meta),
    }));
  }

  static async createRate(
    payload: Omit<MreMarketRateRow, "id" | "created_at" | "updated_at">,
  ): Promise<MreMarketRateRow> {
    const sql = `
      INSERT INTO market_rates (
        craft_type,
        region,
        rate_type,
        current_rate,
        currency,
        trend_direction,
        trend_percentage,
        effective_from,
        effective_until,
        source_name,
        source_meta
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
      ON CONFLICT (craft_type, region, rate_type, effective_from)
      DO UPDATE SET
        current_rate = EXCLUDED.current_rate,
        currency = EXCLUDED.currency,
        trend_direction = EXCLUDED.trend_direction,
        trend_percentage = EXCLUDED.trend_percentage,
        effective_until = EXCLUDED.effective_until,
        source_name = EXCLUDED.source_name,
        source_meta = EXCLUDED.source_meta,
        updated_at = NOW()
      RETURNING
        id::text as id,
        craft_type,
        region,
        rate_type,
        current_rate::float8 as current_rate,
        currency,
        trend_direction,
        trend_percentage::float8 as trend_percentage,
        effective_from::text as effective_from,
        effective_until::text as effective_until,
        source_name,
        source_meta,
        created_at::text as created_at,
        updated_at::text as updated_at
    `;

    const values = [
      payload.craft_type,
      payload.region,
      payload.rate_type,
      payload.current_rate,
      payload.currency,
      payload.trend_direction,
      payload.trend_percentage,
      payload.effective_from,
      payload.effective_until ?? null,
      payload.source_name ?? null,
      JSON.stringify(payload.source_meta ?? {}),
    ];

    const result = await db.query<MreMarketRateRow>(sql, values);
    const row = result.rows[0]!;
    return { ...row, source_meta: asObject((row as any).source_meta) };
  }

  static async updateRate(
    id: string,
    patch: Partial<Omit<MreMarketRateRow, "id" | "created_at" | "updated_at">>,
  ): Promise<MreMarketRateRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const add = (col: string, val: unknown, castJsonb = false) => {
      sets.push(`${col} = ${castJsonb ? `$${i}::jsonb` : `$${i}`}`);
      values.push(val);
      i++;
    };

    if (patch.craft_type !== undefined) add("craft_type", patch.craft_type);
    if (patch.region !== undefined) add("region", patch.region);
    if (patch.rate_type !== undefined) add("rate_type", patch.rate_type);
    if (patch.current_rate !== undefined)
      add("current_rate", patch.current_rate);
    if (patch.currency !== undefined) add("currency", patch.currency);
    if (patch.trend_direction !== undefined)
      add("trend_direction", patch.trend_direction);
    if (patch.trend_percentage !== undefined)
      add("trend_percentage", patch.trend_percentage);
    if (patch.effective_from !== undefined)
      add("effective_from", patch.effective_from);
    if (patch.effective_until !== undefined)
      add("effective_until", patch.effective_until ?? null);
    if (patch.source_name !== undefined)
      add("source_name", patch.source_name ?? null);
    if (patch.source_meta !== undefined)
      add("source_meta", JSON.stringify(patch.source_meta ?? {}), true);

    if (!sets.length) return this.getRateById(id);

    sets.push(`updated_at = NOW()`);

    const sql = `
      UPDATE market_rates
      SET ${sets.join(", ")}
      WHERE id = $${i}
      RETURNING
        id::text as id,
        craft_type,
        region,
        rate_type,
        current_rate::float8 as current_rate,
        currency,
        trend_direction,
        trend_percentage::float8 as trend_percentage,
        effective_from::text as effective_from,
        effective_until::text as effective_until,
        source_name,
        source_meta,
        created_at::text as created_at,
        updated_at::text as updated_at
    `;
    values.push(id);

    const result = await db.query<MreMarketRateRow>(sql, values);
    const row = result.rows[0];
    if (!row) return null;

    return { ...row, source_meta: asObject((row as any).source_meta) };
  }

  static async getRateById(id: string): Promise<MreMarketRateRow | null> {
    const result = await db.query<MreMarketRateRow>(
      `
      SELECT
        id::text as id,
        craft_type,
        region,
        rate_type,
        current_rate::float8 as current_rate,
        currency,
        trend_direction,
        trend_percentage::float8 as trend_percentage,
        effective_from::text as effective_from,
        effective_until::text as effective_until,
        source_name,
        source_meta,
        created_at::text as created_at,
        updated_at::text as updated_at
      FROM market_rates
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );
    const row = result.rows[0] ?? null;
    return row
      ? { ...row, source_meta: asObject((row as any).source_meta) }
      : null;
  }

  static async deleteRate(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM market_rates WHERE id = $1 RETURNING id`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  // -------------------------
  // Categories (stored as special rows in rate_modifiers)
  // meta.category_only = true
  // -------------------------
  static async listCategories(): Promise<MreCategoryRow[]> {
    const result = await db.query<MreCategoryRow>(
      `
      SELECT
        id::text as id,
        category_name,
        description as category_description,
        created_at::text as created_at,
        updated_at::text as updated_at
      FROM rate_modifiers
      WHERE (meta->>'category_only') = 'true'
      ORDER BY category_name ASC
      `,
    );
    return result.rows;
  }

  static async createCategory(payload: {
    category_name: string;
    category_description?: string | null;
  }): Promise<MreCategoryRow> {
    // Prevent duplicates by name (soft check)
    const existing = await db.query<MreCategoryRow>(
      `
      SELECT
        id::text as id,
        category_name,
        description as category_description,
        created_at::text as created_at,
        updated_at::text as updated_at
      FROM rate_modifiers
      WHERE (meta->>'category_only') = 'true'
        AND category_name = $1
      LIMIT 1
      `,
      [payload.category_name],
    );

    if (existing.rows[0]) return existing.rows[0];

    const result = await db.query<MreCategoryRow>(
      `
  INSERT INTO rate_modifiers (
    category_name,
    modifier_name,
    description,
    modifier_type,
    modifier_value,
    rate_type,
    priority,
    is_stackable,
    is_active,
    effective_from,
    example_calculation,
    meta
  )
  VALUES ($1, $2, $3, 'percentage', 0, 'all', 0, true, false, CURRENT_DATE, NULL, $4::jsonb)
  RETURNING
    id::text as id,
    category_name,
    description as category_description,
    created_at::text as created_at,
    updated_at::text as updated_at
  `,
      [
        payload.category_name,
        "__category__", // <-- modifier_name
        payload.category_description ?? null, // <-- description
        JSON.stringify({ category_only: true }), // <-- meta
      ],
    );

    return result.rows[0]!;
  }

  // -------------------------
  // Modifiers
  // -------------------------
  static async listModifiers(): Promise<MreModifierRow[]> {
    const result = await db.query<MreModifierRow>(
      `
      SELECT
        id::text as id,
        category_name,
        modifier_name,
        description,
        modifier_type,
        modifier_value::float8 as modifier_value,
        craft_type,
        region,
        rate_type,
        specification_key,
        specification_value,
        priority,
        is_stackable,
        is_active,
        effective_from::text as effective_from,
        example_calculation,
        meta,
        created_at::text as created_at,
        updated_at::text as updated_at
      FROM rate_modifiers
      WHERE COALESCE((meta->>'category_only')::boolean, false) = false
      ORDER BY category_name ASC, priority ASC, modifier_name ASC
      `,
    );

    return result.rows.map((m) => ({
      ...m,
      meta: asObject((m as any).meta),
    }));
  }

  static async createModifier(
    payload: Omit<
      MreModifierRow,
      "id" | "created_at" | "updated_at" | "mre_modifier_categories"
    >,
  ): Promise<MreModifierRow> {
    const result = await db.query<MreModifierRow>(
      `
      INSERT INTO rate_modifiers (
        category_name,
        modifier_name,
        description,
        modifier_type,
        modifier_value,
        craft_type,
        region,
        rate_type,
        specification_key,
        specification_value,
        priority,
        is_stackable,
        is_active,
        effective_from,
        example_calculation,
        meta
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,
        $11,$12,$13,
        $14,$15,
        $16::jsonb
      )
      RETURNING
        id::text as id,
        category_name,
        modifier_name,
        description,
        modifier_type,
        modifier_value::float8 as modifier_value,
        craft_type,
        region,
        rate_type,
        specification_key,
        specification_value,
        priority,
        is_stackable,
        is_active,
        effective_from::text as effective_from,
        example_calculation,
        meta,
        created_at::text as created_at,
        updated_at::text as updated_at
      `,
      [
        payload.category_name,
        payload.modifier_name,
        payload.description ?? null,
        payload.modifier_type,
        payload.modifier_value,
        payload.craft_type ?? null,
        payload.region ?? null,
        payload.rate_type,
        payload.specification_key ?? null,
        payload.specification_value ?? null,
        payload.priority,
        payload.is_stackable,
        payload.is_active,
        payload.effective_from,
        payload.example_calculation ?? null,
        JSON.stringify(payload.meta ?? {}),
      ],
    );

    const row = result.rows[0]!;
    return { ...row, meta: asObject((row as any).meta) };
  }

  static async updateModifier(
    id: string,
    patch: Partial<
      Omit<
        MreModifierRow,
        "id" | "created_at" | "updated_at" | "mre_modifier_categories"
      >
    >,
  ): Promise<MreModifierRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const add = (col: string, val: unknown, castJsonb = false) => {
      sets.push(`${col} = ${castJsonb ? `$${i}::jsonb` : `$${i}`}`);
      values.push(val);
      i++;
    };

    if (patch.category_name !== undefined)
      add("category_name", patch.category_name);
    if (patch.modifier_name !== undefined)
      add("modifier_name", patch.modifier_name);
    if (patch.description !== undefined)
      add("description", patch.description ?? null);
    if (patch.modifier_type !== undefined)
      add("modifier_type", patch.modifier_type);
    if (patch.modifier_value !== undefined)
      add("modifier_value", patch.modifier_value);
    if (patch.craft_type !== undefined)
      add("craft_type", patch.craft_type ?? null);
    if (patch.region !== undefined) add("region", patch.region ?? null);
    if (patch.rate_type !== undefined) add("rate_type", patch.rate_type);
    if (patch.specification_key !== undefined)
      add("specification_key", patch.specification_key ?? null);
    if (patch.specification_value !== undefined)
      add("specification_value", patch.specification_value ?? null);
    if (patch.priority !== undefined) add("priority", patch.priority);
    if (patch.is_stackable !== undefined)
      add("is_stackable", patch.is_stackable);
    if (patch.is_active !== undefined) add("is_active", patch.is_active);
    if (patch.effective_from !== undefined)
      add("effective_from", patch.effective_from);
    if (patch.example_calculation !== undefined)
      add("example_calculation", patch.example_calculation ?? null);
    if (patch.meta !== undefined)
      add("meta", JSON.stringify(patch.meta ?? {}), true);

    if (!sets.length) return this.getModifierById(id);

    sets.push(`updated_at = NOW()`);

    const sql = `
      UPDATE rate_modifiers
      SET ${sets.join(", ")}
      WHERE id = $${i}
      RETURNING
        id::text as id,
        category_name,
        modifier_name,
        description,
        modifier_type,
        modifier_value::float8 as modifier_value,
        craft_type,
        region,
        rate_type,
        specification_key,
        specification_value,
        priority,
        is_stackable,
        is_active,
        effective_from::text as effective_from,
        example_calculation,
        meta,
        created_at::text as created_at,
        updated_at::text as updated_at
    `;
    values.push(id);

    const result = await db.query<MreModifierRow>(sql, values);
    const row = result.rows[0];
    if (!row) return null;

    return { ...row, meta: asObject((row as any).meta) };
  }

  static async getModifierById(id: string): Promise<MreModifierRow | null> {
    const result = await db.query<MreModifierRow>(
      `
      SELECT
        id::text as id,
        category_name,
        modifier_name,
        description,
        modifier_type,
        modifier_value::float8 as modifier_value,
        craft_type,
        region,
        rate_type,
        specification_key,
        specification_value,
        priority,
        is_stackable,
        is_active,
        effective_from::text as effective_from,
        example_calculation,
        meta,
        created_at::text as created_at,
        updated_at::text as updated_at
      FROM rate_modifiers
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );
    const row = result.rows[0] ?? null;
    return row ? { ...row, meta: asObject((row as any).meta) } : null;
  }

  static async deleteModifier(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM rate_modifiers WHERE id = $1 RETURNING id`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async toggleModifierActive(
    id: string,
  ): Promise<MreModifierRow | null> {
    const result = await db.query<MreModifierRow>(
      `
      UPDATE rate_modifiers
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING
        id::text as id,
        category_name,
        modifier_name,
        description,
        modifier_type,
        modifier_value::float8 as modifier_value,
        craft_type,
        region,
        rate_type,
        specification_key,
        specification_value,
        priority,
        is_stackable,
        is_active,
        effective_from::text as effective_from,
        example_calculation,
        meta,
        created_at::text as created_at,
        updated_at::text as updated_at
      `,
      [id],
    );
    const row = result.rows[0] ?? null;
    return row ? { ...row, meta: asObject((row as any).meta) } : null;
  }
}

export default MreModel;
