import { db } from "../../config/db.ts";

export type BlacklistStatus = "ACTIVE" | "REVOKED" | "UNDER_REVIEW";

export interface CreateBlacklistInput {
  craft_id: string;
  blacklist_reason: string;
  reason_code: string;
  blacklisted_by: string;
  blacklist_until?: string | null;
  status?: BlacklistStatus;
}

export interface BlacklistEntry {
  id: string;
  craft_id: string;
  blacklist_reason: string;
  reason_code: string;
  blacklisted_by: string;
  blacklisted_at: string;
  blacklist_until: string | null;
  status: BlacklistStatus;
}

export interface BlacklistEntryWithEntity extends BlacklistEntry {
  entity_name: string | null;
  entity_type: string | null;
  reference_id: string | null;
  contact_email: string | null;
  owner_name: string | null;
}

export interface GetAllBlacklistFilters {
  status?: BlacklistStatus | 'all';
  craft_id?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedBlacklistResponse {
  entries: BlacklistEntryWithEntity[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class BlacklistModel {
  /**
   * Create a new blacklist entry
   */
  static async create(input: CreateBlacklistInput): Promise<BlacklistEntry> {
    const query = `
      INSERT INTO gi_craft_blacklist (
        craft_id,
        blacklist_reason,
        reason_code,
        blacklisted_by,
        blacklist_until,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      input.craft_id,
      input.blacklist_reason,
      input.reason_code,
      input.blacklisted_by,
      input.blacklist_until || null,
      input.status || 'ACTIVE'
    ];

    const result = await db.query<BlacklistEntry>(query, values);

    if (result.rows.length === 0) {
      throw new Error("Failed to create blacklist entry");
    }

    return result.rows[0]!;
  }

  /**
   * Get all blacklist entries with optional filters
   */
  static async getAll(filters?: GetAllBlacklistFilters): Promise<PaginatedBlacklistResponse> {
    const {
      status = 'ACTIVE',
      craft_id,
      page = 1,
      limit = 10
    } = filters || {};

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let paramCount = 1;

    // Status filter
    if (status && status !== 'all') {
      conditions.push(`b.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    // Craft ID filter
    if (craft_id) {
      conditions.push(`b.craft_id = $${paramCount}`);
      values.push(craft_id);
      paramCount++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM gi_craft_blacklist b
      ${whereClause}
    `;

    const countResult = await db.query<{ total: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get blacklist entries with entity info
    const entriesQuery = `
      SELECT 
        b.*,
        e.name as entity_name,
        e.entity_type,
        e.reference_id,
        e.contact->>'email' as contact_email,
        e.identifiers->>'owner_name' as owner_name
      FROM gi_craft_blacklist b
      LEFT JOIN craft_entities e ON b.craft_id = e.id
      ${whereClause}
      ORDER BY b.blacklisted_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);

    const result = await db.query<BlacklistEntryWithEntity>(entriesQuery, values);

    return {
      entries: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get blacklist entry by ID
   */
  static async getById(id: string): Promise<BlacklistEntryWithEntity | null> {
    const query = `
      SELECT 
        b.*,
        e.name as entity_name,
        e.entity_type,
        e.reference_id,
        e.contact->>'email' as contact_email,
        e.identifiers->>'owner_name' as owner_name
      FROM gi_craft_blacklist b
      LEFT JOIN craft_entities e ON b.craft_id = e.id
      WHERE b.id = $1
    `;

    const result = await db.query<BlacklistEntryWithEntity>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get active blacklist entry by craft_id
   */
  static async getByCraftId(craft_id: string): Promise<BlacklistEntryWithEntity | null> {
    const query = `
      SELECT 
        b.*,
        e.name as entity_name,
        e.entity_type,
        e.reference_id,
        e.contact->>'email' as contact_email,
        e.identifiers->>'owner_name' as owner_name
      FROM gi_craft_blacklist b
      LEFT JOIN craft_entities e ON b.craft_id = e.id
      WHERE b.craft_id = $1 AND b.status = 'ACTIVE'
      ORDER BY b.blacklisted_at DESC
      LIMIT 1
    `;

    const result = await db.query<BlacklistEntryWithEntity>(query, [craft_id]);
    return result.rows[0] || null;
  }

  /**
   * Update blacklist entry status
   */
  static async updateStatus(id: string, status: BlacklistStatus): Promise<BlacklistEntry> {
    const query = `
      UPDATE gi_craft_blacklist
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query<BlacklistEntry>(query, [status, id]);

    if (result.rows.length === 0) {
      throw new Error("Blacklist entry not found");
    }

    return result.rows[0]!;
  }

  /**
   * Revoke blacklist (change status to REVOKED)
   */
  static async revoke(craft_id: string): Promise<BlacklistEntry | null> {
    const query = `
      UPDATE gi_craft_blacklist
      SET status = 'REVOKED'
      WHERE craft_id = $1 AND status = 'ACTIVE'
      RETURNING *
    `;

    const result = await db.query<BlacklistEntry>(query, [craft_id]);
    return result.rows[0] || null;
  }

  /**
   * Delete blacklist entry (permanent)
   */
  static async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM gi_craft_blacklist
      WHERE id = $1
      RETURNING id
    `;

    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  }
}

export default BlacklistModel;