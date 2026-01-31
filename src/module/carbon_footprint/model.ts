import { db } from "../../config/db.ts";

/** ---------------- Types ---------------- */

export type CalculatorMode = "estimated" | "detailed";

export type FactorUnit =
  | "kg_per_kg"
  | "kg_per_item"
  | "kg_per_shipment"
  | "kg_per_m2"
  | "percent"
  | "config";

export interface CarbonFactorRow {
  id: number;
  factor_type: string;
  factor_key: string;
  display_name: string;
  unit: FactorUnit;
  value: string | null; // pg numeric comes back as string
  meta: unknown; // stored as JSONB
  is_active: boolean;
  updated_at: string; // timestamp
}

export interface CraftCalculatorRow {
  craft_id: string;
  craft_name: string;
  category: string | null;
  config: unknown; // JSONB
  is_active: boolean;
  updated_at: string;
}

export interface CraftCalculatorListRow {
  craft_id: string;
  craft_name: string;
  category: string | null;
  updated_at: string;
}

export interface CarbonCalculationRow {
  id: number;
  craft_id: string;
  mode: CalculatorMode;
  inputs: unknown;
  result: unknown;
  created_at: string;
}

/** ---------------- Models ---------------- */

export class CraftCalculatorModel {
  static async listActive(): Promise<CraftCalculatorListRow[]> {
    const q = `
      SELECT craft_id, craft_name, category, updated_at
      FROM public.craft_calculators
      WHERE is_active = true
      ORDER BY category NULLS LAST, craft_name ASC
    `;
    const r = await db.query<CraftCalculatorListRow>(q);
    return r.rows;
  }

  static async getById(craftId: string): Promise<CraftCalculatorRow | null> {
    const q = `
      SELECT craft_id, craft_name, category, config, is_active, updated_at
      FROM public.craft_calculators
      WHERE craft_id = $1
      LIMIT 1
    `;
    const r = await db.query<CraftCalculatorRow>(q, [craftId]);
    return r.rows[0] ?? null;
  }

  static async upsert(args: {
    craft_id: string;
    craft_name: string;
    category: string | null;
    config: unknown;
    is_active: boolean;
  }): Promise<CraftCalculatorRow> {
    const q = `
      INSERT INTO public.craft_calculators (craft_id, craft_name, category, config, is_active, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, now())
      ON CONFLICT (craft_id)
      DO UPDATE SET
        craft_name = EXCLUDED.craft_name,
        category   = EXCLUDED.category,
        config     = EXCLUDED.config,
        is_active  = EXCLUDED.is_active,
        updated_at = now()
      RETURNING craft_id, craft_name, category, config, is_active, updated_at
    `;
    const values = [
      args.craft_id,
      args.craft_name,
      args.category,
      JSON.stringify(args.config),
      args.is_active,
    ];
    const r = await db.query<CraftCalculatorRow>(q, values);
    return r.rows[0]!;
  }
}

export class CarbonFactorModel {
  static async list(args: {
    factor_type?: string;
    is_active?: boolean;
    q?: string; // search in key/name
    limit: number;
    offset: number;
  }): Promise<CarbonFactorRow[]> {
    const where: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (args.factor_type) {
      where.push(`factor_type = $${i++}`);
      values.push(args.factor_type);
    }
    if (typeof args.is_active === "boolean") {
      where.push(`is_active = $${i++}`);
      values.push(args.is_active);
    }
    if (args.q && args.q.trim()) {
      where.push(`(factor_key ILIKE $${i} OR display_name ILIKE $${i})`);
      values.push(`%${args.q.trim()}%`);
      i++;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    values.push(args.limit);
    const limitIdx = i++;
    values.push(args.offset);
    const offsetIdx = i++;

    const q = `
      SELECT id, factor_type, factor_key, display_name, unit, value, meta, is_active, updated_at
      FROM public.carbon_factors
      ${whereSql}
      ORDER BY factor_type ASC, factor_key ASC
      LIMIT $${limitIdx}
      OFFSET $${offsetIdx}
    `;
    const r = await db.query<CarbonFactorRow>(q, values);
    return r.rows;
  }

  static async getByTypeAndKey(type: string, key: string): Promise<CarbonFactorRow | null> {
    const q = `
      SELECT id, factor_type, factor_key, display_name, unit, value, meta, is_active, updated_at
      FROM public.carbon_factors
      WHERE factor_type = $1 AND factor_key = $2
      LIMIT 1
    `;
    const r = await db.query<CarbonFactorRow>(q, [type, key]);
    return r.rows[0] ?? null;
  }

  static async getActiveByTypeAndKeys(
    requests: Array<{ factor_type: string; factor_key: string }>,
  ): Promise<CarbonFactorRow[]> {
    if (requests.length === 0) return [];

    // Build VALUES list: (type, key), (type, key) ...
    const values: unknown[] = [];
    const tuples: string[] = [];
    let i = 1;

    for (const req of requests) {
      tuples.push(`($${i++}, $${i++})`);
      values.push(req.factor_type, req.factor_key);
    }

    const q = `
      WITH req(factor_type, factor_key) AS (
        VALUES ${tuples.join(",")}
      )
      SELECT f.id, f.factor_type, f.factor_key, f.display_name, f.unit, f.value, f.meta, f.is_active, f.updated_at
      FROM req
      JOIN public.carbon_factors f
        ON f.factor_type = req.factor_type
       AND f.factor_key  = req.factor_key
      WHERE f.is_active = true
    `;
    const r = await db.query<CarbonFactorRow>(q, values);
    return r.rows;
  }

  static async upsert(args: {
    factor_type: string;
    factor_key: string;
    display_name: string;
    unit: FactorUnit;
    value: number | null;
    meta: unknown;
    is_active: boolean;
    // admin tracking (stored into meta)
    updated_by?: string;
    change_note?: string;
  }): Promise<CarbonFactorRow> {
    const meta = CarbonFactorModel.mergeAdminMeta(args.meta, args.updated_by, args.change_note);

    const q = `
      INSERT INTO public.carbon_factors (factor_type, factor_key, display_name, unit, value, meta, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, now())
      ON CONFLICT (factor_type, factor_key)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        unit         = EXCLUDED.unit,
        value        = EXCLUDED.value,
        meta         = EXCLUDED.meta,
        is_active    = EXCLUDED.is_active,
        updated_at   = now()
      RETURNING id, factor_type, factor_key, display_name, unit, value, meta, is_active, updated_at
    `;

    const values = [
      args.factor_type,
      args.factor_key,
      args.display_name,
      args.unit,
      args.value,
      JSON.stringify(meta),
      args.is_active,
    ];

    const r = await db.query<CarbonFactorRow>(q, values);
    return r.rows[0]!;
  }

  private static mergeAdminMeta(meta: unknown, updatedBy?: string, changeNote?: string): unknown {
    const base = isPlainObject(meta) ? meta : {};
    const adminMeta: Record<string, unknown> = { ...base };

    if (updatedBy && updatedBy.trim()) adminMeta.last_updated_by = updatedBy.trim();
    if (changeNote && changeNote.trim()) adminMeta.last_change_note = changeNote.trim();
    if (updatedBy || changeNote) adminMeta.last_change_at = new Date().toISOString();

    return adminMeta;
  }
}

export class CarbonCalculationModel {
  static async create(args: {
    craft_id: string;
    mode: CalculatorMode;
    inputs: unknown;
    result: unknown;
  }): Promise<CarbonCalculationRow> {
    const q = `
      INSERT INTO public.carbon_calculations (craft_id, mode, inputs, result, created_at)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, now())
      RETURNING id, craft_id, mode, inputs, result, created_at
    `;
    const values = [args.craft_id, args.mode, JSON.stringify(args.inputs), JSON.stringify(args.result)];
    const r = await db.query<CarbonCalculationRow>(q, values);
    return r.rows[0]!;
  }

  static async listByCraftId(args: {
    craft_id: string;
    limit: number;
    offset: number;
  }): Promise<CarbonCalculationRow[]> {
    const q = `
      SELECT id, craft_id, mode, inputs, result, created_at
      FROM public.carbon_calculations
      WHERE craft_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      OFFSET $3
    `;
    const r = await db.query<CarbonCalculationRow>(q, [args.craft_id, args.limit, args.offset]);
    return r.rows;
  }
}

/** ---------------- Helpers ---------------- */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
