import { db } from "../../config/db.ts";

export type EntityType = "ARTISAN" | "BUSINESS" | "INSTITUTION_NGO";
export type EntityStatus = "pending" | "verified" | "blocked";

export interface CreateCraftEntityInput {
  entity_type: EntityType;
  name: string;
  trading_as?: string | null;
  description?: string | null;
  category?: string | null;

  identifiers?: Record<string, unknown> | null;
  address?: Record<string, unknown> | null;
  contact: Record<string, unknown>;

  craft_specializations?: unknown[] | null;
  export_markets?: unknown[] | null;
  banking_info?: Record<string, unknown> | null;

  number_of_employees?: number | null;
  year_in_business?: number | null;
  annual_turnover?: number | null;

  consent: boolean;
}

export interface CreateCraftEntityResult {
  id: string | null;
  reference_id: string | null;
  status: "SUCCESS" | "ERROR";
  message: string;
}

export interface CraftEntity {
  id: string;
  reference_id: string;
  entity_type: EntityType;
  name: string;
  trading_as: string | null;
  description: string | null;
  category: string | null;
  status: EntityStatus;
  is_active: boolean;

  number_of_employees: number | null;
  year_in_business: number | null;
  annual_turnover: string | null;

  identifiers: Record<string, unknown> | null;
  address: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  craft_specializations: unknown[] | null;
  export_markets: unknown[] | null;
  banking_info: Record<string, unknown> | null;

  consent: boolean;
  created_at: string;
  updated_at: string;
}

class CraftEntityModel {
  static async create(
    payload: CreateCraftEntityInput
  ): Promise<CreateCraftEntityResult> {
    const query = `
      SELECT * FROM create_craft_entity(
        $1, $2, $3, $4, $5,
        $6::jsonb, $7::jsonb, $8::jsonb,
        $9::jsonb, $10::jsonb, $11::jsonb,
        $12, $13, $14, $15
      )
    `;

    const values = [
      payload.entity_type,
      payload.name,
      payload.trading_as ?? null,
      payload.description ?? null,
      payload.category ?? null,
      payload.identifiers ?? null,
      payload.address ?? null,
      payload.contact,
      payload.craft_specializations ?? null,
      payload.export_markets ?? null,
      payload.banking_info ?? null,
      payload.number_of_employees ?? null,
      payload.year_in_business ?? null,
      payload.annual_turnover ?? null,
      payload.consent,
    ];

    try {
      const result = await db.query<CreateCraftEntityResult>(query, values);

      if (result.rows.length === 0) {
        throw new Error("No response returned from create_craft_entity");
      }

      return result.rows[0]!;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Database error: ${error.message}`);
      }
      throw new Error("Unknown database error while creating craft entity");
    }
  }

  static async getById(id: string): Promise<CraftEntity | null> {
    const query = `
      SELECT *
      FROM craft_entities
      WHERE id = $1
      LIMIT 1
    `;

    const result = await db.query<CraftEntity>(query, [id]);
    return result.rows[0] ?? null;
  }

  static async getAll(status?: EntityStatus): Promise<CraftEntity[]> {
    const query = status
      ? `SELECT * FROM craft_entities WHERE status = $1 ORDER BY created_at DESC`
      : `SELECT * FROM craft_entities ORDER BY created_at DESC`;

    const values = status ? [status] : [];
    const result = await db.query<CraftEntity>(query, values);

    return result.rows;
  }

  static async updateStatus(referenceId: string, newStatus: EntityStatus) {
    const query = `
      SELECT * FROM update_craft_entity_status($1, $2)
    `;

    const result = await db.query(query, [referenceId, newStatus]);

    if (result.rows.length === 0) {
      throw new Error("No response returned from update_craft_entity_status");
    }

    return result.rows[0];
  }
}

export default CraftEntityModel;