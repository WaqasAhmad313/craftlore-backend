import { db } from "../../config/db.ts";

export type EntityType =
  | "ARTISAN"
  | "BUSINESS"
  | "INSTITUTION_NGO"
  | "GOVERNMENT_POLICY_INSTITUTION";

export type EntityStatus =
  | "pending"
  | "verified"
  | "blocked"
  | "rejected"
  | "registered";

export interface CreateCraftEntityInput {
  entity_type: EntityType;
  name: string;
  trading_as?: string | null;
  description?: string | null;
  category?: string | null;
  products?: unknown[] | null;
  identifiers?: Record<string, unknown> | null;
  address?: Record<string, unknown> | null;
  contact: Record<string, unknown>;
  craft_specializations?: unknown[] | null;
  export_markets?: unknown[] | null;
  banking_info?: Record<string, unknown> | null;
  documents?: Record<string, unknown> | null; // Cloudinary URLs for gov documents
  number_of_employees?: number | null;
  year_in_business?: number | null;
  annual_turnover?: string | null;
  consent: boolean;
  status: EntityStatus;
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
  number_of_employees: string | null;
  year_in_business: number | null;
  annual_turnover: string | null;
  identifiers: Record<string, unknown> | null;
  address: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  craft_specializations: unknown[] | null;
  export_markets: unknown[] | null;
  banking_info: Record<string, unknown> | null;
  documents: Record<string, unknown> | null;
  consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CraftEntityWithEvaluation {
  id: string;
  reference_id: string;
  entity_type: EntityType;
  name: string;
  trading_as: string | null;
  description: string | null;
  category: string | null;
  status: EntityStatus;
  is_active: boolean;
  owner_name: string | null;
  gst_number: string | null;
  pan_number: string | null;
  district: string | null;
  full_address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_website: string | null;
  craft_specializations: unknown[] | null;
  documents: Record<string, unknown> | null;
  quality_score: number | null;
  ethics_score: number | null;
  satisfaction_score: number | null;
  authenticity_score: number | null;
  evaluation_notes: string | null;
  created_at: string;
}

export interface CraftEntityTableView {
  id: string;
  reference_id: string;
  entity_type: EntityType;
  name: string;
  trading_as: string | null;
  status: EntityStatus;
  owner_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  trust_score: number;
  year_in_business: number | null;
  craft_specializations: unknown[] | null;
  featured: boolean;
  created_at: string;
}

export interface CraftEntityListing {
  name: string;
  reference_id: string;
  description: string | null;
  category: string | null;
  address: Record<string, unknown> | null;
  craft_specializations: unknown[] | null;
  created_at: string;
}

export interface GetAllEntitiesFilters {
  search?: string;
  entity_type?: EntityType | "all";
  status?: EntityStatus | "all";
  page?: number;
  limit?: number;
}

export interface PaginatedEntitiesResponse {
  entities: CraftEntityTableView[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UpdateStatusResult {
  id: string;
  status: string;
  updated_at: string;
}

class CraftEntityModel {
  static async create(
    payload: CreateCraftEntityInput
  ): Promise<CreateCraftEntityResult> {
    // 18 params — $18 is p_documents (DEFAULT NULL in DB so safe for ARTISAN/BUSINESS/NGO)
    const query = `
      SELECT * FROM create_craft_entity(
        $1, $2, $3, $4, $5,
        $6::jsonb, $7::jsonb, $8::jsonb,
        $9::jsonb, $10::jsonb, $11::jsonb,
        $12::jsonb,
        $13, $14, $15, $16, $17,
        $18::jsonb
      )
    `;

    const values = [
      payload.entity_type,
      payload.name,
      payload.trading_as ?? null,
      payload.description ?? null,
      payload.category ?? null,
      payload.products ? JSON.stringify(payload.products) : null,
      payload.identifiers ? JSON.stringify(payload.identifiers) : null,
      payload.address ? JSON.stringify(payload.address) : null,
      JSON.stringify(payload.contact),
      payload.craft_specializations ? JSON.stringify(payload.craft_specializations) : null,
      payload.export_markets ? JSON.stringify(payload.export_markets) : null,
      payload.banking_info ? JSON.stringify(payload.banking_info) : null,
      payload.number_of_employees ?? null,
      payload.year_in_business ?? null,
      payload.annual_turnover ?? null,
      payload.consent,
      payload.status,
      payload.documents ? JSON.stringify(payload.documents) : null,
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
    const query = `SELECT * FROM craft_entities WHERE id = $1 LIMIT 1`;
    const result = await db.query<CraftEntity>(query, [id]);
    return result.rows[0] ?? null;
  }

  static async getByIdWithEvaluation(
    id: string
  ): Promise<CraftEntityWithEvaluation | null> {
    const query = `
      SELECT 
        ce.id, ce.reference_id, ce.entity_type, ce.name, ce.trading_as,
        ce.description, ce.category, ce.status, ce.is_active,
        ce.identifiers->>'owner_name' as owner_name,
        ce.identifiers->>'gst_number' as gst_number,
        ce.identifiers->>'pan_number' as pan_number,
        ce.address->>'full' as full_address,
        ce.address->>'district' as district,
        ce.contact->>'email' as contact_email,
        ce.contact->>'phone' as contact_phone,
        ce.contact->>'website' as contact_website,
        ce.craft_specializations,
        ce.documents,
        cee.quality_score, cee.ethics_score,
        cee.satisfaction_score, cee.authenticity_score,
        cee.notes as evaluation_notes,
        ce.created_at
      FROM craft_entities ce
      LEFT JOIN craft_entity_evaluations cee ON ce.id = cee.craft_entity_id
      WHERE ce.id = $1
      LIMIT 1
    `;
    const result = await db.query<CraftEntityWithEvaluation>(query, [id]);
    return result.rows[0] ?? null;
  }

  static async getAll(
    filters?: GetAllEntitiesFilters
  ): Promise<PaginatedEntitiesResponse> {
    const { search, entity_type, status, page = 1, limit = 10 } = filters || {};
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (search && search.trim() !== "") {
      conditions.push(`(
        ce.name ILIKE $${paramCount} OR
        ce.identifiers->>'owner_name' ILIKE $${paramCount} OR
        ce.contact->>'email' ILIKE $${paramCount}
      )`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (entity_type && entity_type !== "all") {
      conditions.push(`ce.entity_type = $${paramCount}`);
      values.push(entity_type);
      paramCount++;
    }

    if (status && status !== "all") {
      conditions.push(`ce.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*) as total FROM craft_entities ce ${whereClause}`;
    const countResult = await db.query<{ total: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total || "0");

    const entitiesQuery = `
      SELECT 
        ce.id, ce.reference_id, ce.entity_type, ce.name, ce.trading_as, ce.status,
        ce.identifiers->>'owner_name' as owner_name,
        ce.contact->>'email' as contact_email,
        ce.contact->>'phone' as contact_phone,
        ce.year_in_business,
        ce.craft_specializations,
        true as featured,
        COALESCE(
          (cee.quality_score + cee.ethics_score + cee.satisfaction_score + cee.authenticity_score) / 4.0,
          0
        ) as trust_score,
        ce.created_at
      FROM craft_entities ce
      LEFT JOIN craft_entity_evaluations cee ON ce.id = cee.craft_entity_id
      ${whereClause}
      ORDER BY ce.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);
    const result = await db.query<CraftEntityTableView>(entitiesQuery, values);

    return {
      entities: result.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  static async updateStatus(
    id: string,
    newStatus: EntityStatus
  ): Promise<UpdateStatusResult> {
    const query = `
      UPDATE craft_entities SET status = $2, updated_at = NOW()
      WHERE id = $1 RETURNING id, status, updated_at
    `;
    const result = await db.query<UpdateStatusResult>(query, [id, newStatus]);
    if (result.rows.length === 0) throw new Error("Entity not found or update failed");
    return result.rows[0]!;
  }

  static async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM craft_entities WHERE id = $1 RETURNING id`;
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }
}

export default CraftEntityModel;