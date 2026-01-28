import { db } from "../../../config/db.ts";

export type RateType = "wholesale" | "retail" | "export";
export type TrendDirection = "up" | "down" | "stable";

export interface MreMarketRateRow {
  id: string;
  craft_type: string;
  region: string;
  rate_type: RateType;
  current_rate: number;
  currency: string;
  trend_direction: TrendDirection;
  trend_percentage: number;
  effective_from: string;
  effective_until: string | null;
  source: unknown; // jsonb
  created_at: string;
  updated_at: string;
}

export type ModifierType = "percentage" | "multiplier" | "fixed_amount";

export interface MreModifierRow {
  id: string;
  // category rows and modifier rows are both stored here (no extra table)
  is_category: boolean;
  category_name: string | null;
  category_description: string | null;

  // modifier-specific
  modifier_name: string | null;
  category_id: string | null;
  description: string | null;
  modifier_type: ModifierType | null;
  modifier_value: number | null;

  craft_type: string | null;
  region: string | null;
  rate_type: string | null;

  specification_key: string | null;
  specification_value: string | null;

  priority: number;
  is_stackable: boolean;
  is_active: boolean;

  effective_from: string;
  effective_until: string | null;
  example_calculation: string | null;

  created_at: string;
  updated_at: string;
}

class MreModel {
  /** -------- Rates -------- */
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

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const query = `
      SELECT *
      FROM mre_market_rates
      ${whereSql}
      ORDER BY craft_type ASC, rate_type ASC, created_at DESC
    `;

    const result = await db.query<MreMarketRateRow>(query, values);
    return result.rows;
  }

  static async createRate(payload: Omit<MreMarketRateRow, "id" | "created_at" | "updated_at">): Promise<MreMarketRateRow> {
    const query = `
      INSERT INTO mre_market_rates (
        craft_type, region, rate_type, current_rate, currency,
        trend_direction, trend_percentage,
        effective_from, effective_until,
        source
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
      RETURNING *
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
      JSON.stringify(payload.source ?? {}),
    ];
    const result = await db.query<MreMarketRateRow>(query, values);
    return result.rows[0]!;
  }

  static async updateRate(id: string, patch: Partial<Omit<MreMarketRateRow, "id" | "created_at" | "updated_at">>): Promise<MreMarketRateRow | null> {
    // Keep patch simple: update known columns only.
    const query = `
      UPDATE mre_market_rates
      SET
        craft_type = COALESCE($2, craft_type),
        region = COALESCE($3, region),
        rate_type = COALESCE($4, rate_type),
        current_rate = COALESCE($5, current_rate),
        currency = COALESCE($6, currency),
        trend_direction = COALESCE($7, trend_direction),
        trend_percentage = COALESCE($8, trend_percentage),
        effective_from = COALESCE($9, effective_from),
        effective_until = COALESCE($10, effective_until),
        source = COALESCE($11::jsonb, source),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query<MreMarketRateRow>(query, [
      id,
      patch.craft_type ?? null,
      patch.region ?? null,
      patch.rate_type ?? null,
      patch.current_rate ?? null,
      patch.currency ?? null,
      patch.trend_direction ?? null,
      patch.trend_percentage ?? null,
      patch.effective_from ?? null,
      patch.effective_until ?? null,
      patch.source ? JSON.stringify(patch.source) : null,
    ]);

    return result.rows[0] ?? null;
  }

  static async deleteRate(id: string): Promise<boolean> {
    const result = await db.query(`DELETE FROM mre_market_rates WHERE id = $1`, [id]);
    return result.rowCount === 1;
  }

  /** -------- Categories (stored inside mre_rate_modifiers) -------- */
  static async listCategories(): Promise<MreModifierRow[]> {
    const result = await db.query<MreModifierRow>(
      `SELECT * FROM mre_rate_modifiers WHERE is_category = true ORDER BY category_name ASC`,
    );
    return result.rows;
  }

  static async createCategory(payload: { category_name: string; category_description?: string | null }): Promise<MreModifierRow> {
    const query = `
      INSERT INTO mre_rate_modifiers (
        is_category,
        category_name,
        category_description,
        priority,
        is_stackable,
        is_active,
        effective_from
      )
      VALUES (true, $1, $2, 0, true, true, CURRENT_DATE)
      RETURNING *
    `;
    const result = await db.query<MreModifierRow>(query, [
      payload.category_name,
      payload.category_description ?? null,
    ]);
    return result.rows[0]!;
  }

  /** -------- Modifiers -------- */
  static async listModifiers(): Promise<MreModifierRow[]> {
    const result = await db.query<MreModifierRow>(
      `
      SELECT *
      FROM mre_rate_modifiers
      WHERE is_category = false
      ORDER BY category_id ASC NULLS LAST, priority ASC, created_at ASC
      `,
    );
    return result.rows;
  }

  static async createModifier(payload: Omit<MreModifierRow,
    "id" | "created_at" | "updated_at" | "is_category" | "category_name" | "category_description"
  >): Promise<MreModifierRow> {
    const query = `
      INSERT INTO mre_rate_modifiers (
        is_category,
        modifier_name,
        category_id,
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
        effective_until,
        example_calculation
      )
      VALUES (
        false,
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,
        $11,$12,$13,
        $14,$15,$16
      )
      RETURNING *
    `;

    const result = await db.query<MreModifierRow>(query, [
      payload.modifier_name,
      payload.category_id ?? null,
      payload.description ?? null,
      payload.modifier_type,
      payload.modifier_value,
      payload.craft_type ?? null,
      payload.region ?? null,
      payload.rate_type ?? null,
      payload.specification_key ?? null,
      payload.specification_value ?? null,
      payload.priority,
      payload.is_stackable,
      payload.is_active,
      payload.effective_from,
      payload.effective_until ?? null,
      payload.example_calculation ?? null,
    ]);

    return result.rows[0]!;
  }

  static async updateModifier(id: string, patch: Partial<MreModifierRow>): Promise<MreModifierRow | null> {
    const query = `
      UPDATE mre_rate_modifiers
      SET
        modifier_name = COALESCE($2, modifier_name),
        category_id = COALESCE($3, category_id),
        description = COALESCE($4, description),
        modifier_type = COALESCE($5, modifier_type),
        modifier_value = COALESCE($6, modifier_value),
        craft_type = COALESCE($7, craft_type),
        region = COALESCE($8, region),
        rate_type = COALESCE($9, rate_type),
        specification_key = COALESCE($10, specification_key),
        specification_value = COALESCE($11, specification_value),
        priority = COALESCE($12, priority),
        is_stackable = COALESCE($13, is_stackable),
        is_active = COALESCE($14, is_active),
        effective_from = COALESCE($15, effective_from),
        effective_until = COALESCE($16, effective_until),
        example_calculation = COALESCE($17, example_calculation),
        updated_at = NOW()
      WHERE id = $1 AND is_category = false
      RETURNING *
    `;

    const result = await db.query<MreModifierRow>(query, [
      id,
      patch.modifier_name ?? null,
      patch.category_id ?? null,
      patch.description ?? null,
      patch.modifier_type ?? null,
      patch.modifier_value ?? null,
      patch.craft_type ?? null,
      patch.region ?? null,
      patch.rate_type ?? null,
      patch.specification_key ?? null,
      patch.specification_value ?? null,
      patch.priority ?? null,
      patch.is_stackable ?? null,
      patch.is_active ?? null,
      patch.effective_from ?? null,
      patch.effective_until ?? null,
      patch.example_calculation ?? null,
    ]);

    return result.rows[0] ?? null;
  }

  static async deleteModifier(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM mre_rate_modifiers WHERE id = $1 AND is_category = false`,
      [id],
    );
    return result.rowCount === 1;
  }

  static async toggleModifierActive(id: string): Promise<MreModifierRow | null> {
    const result = await db.query<MreModifierRow>(
      `
      UPDATE mre_rate_modifiers
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1 AND is_category = false
      RETURNING *
      `,
      [id],
    );
    return result.rows[0] ?? null;
  }
}

export default MreModel;
