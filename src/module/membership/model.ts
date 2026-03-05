import { db } from "../../config/db.ts";

/* ===== ENUMS & TYPES ===== */

export type MembershipType = "buyer" | "corporate" | "sponsor";
export type MembershipStatus = "pending" | "approved" | "rejected";
export type NetworkCategory = "local" | "international";

/* ===== MEMBERSHIP INTERFACES ===== */

export interface CreateMembershipInput {
  type: MembershipType;
  full_name: string;
  email: string;
  phone: string;
  organization_name?: string | null;
  city: string;
  country: string;
  bio?: string | null;
  website_url?: string | null;
  photo_url?: string | null;
}

export interface UpdateMembershipStatusInput {
  status: MembershipStatus;
  admin_notes?: string | null;
}

export interface Membership {
  id: string;
  type: MembershipType;
  full_name: string;
  email: string;
  phone: string;
  organization_name: string | null;
  city: string;
  country: string;
  bio: string | null;
  website_url: string | null;
  photo_url: string | null;
  status: MembershipStatus;
  admin_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/* ===== NETWORK MEMBER INTERFACES ===== */

export interface CreateNetworkMemberInput {
  membership_id?: string | null;
  network_category: NetworkCategory;
  type: MembershipType;
  full_name: string;
  organization_name?: string | null;
  city: string;
  country: string;
  bio?: string | null;
  website_url?: string | null;
  photo_url?: string | null;
  is_featured?: boolean;
  display_order?: number;
}

export interface UpdateNetworkMemberInput {
  network_category?: NetworkCategory;
  type?: MembershipType;
  full_name?: string;
  organization_name?: string | null;
  city?: string;
  country?: string;
  bio?: string | null;
  website_url?: string | null;
  photo_url?: string | null;
  is_featured?: boolean;
  display_order?: number;
}

export interface NetworkMember {
  id: string;
  membership_id: string | null;
  network_category: NetworkCategory;
  type: MembershipType;
  full_name: string;
  organization_name: string | null;
  city: string;
  country: string;
  bio: string | null;
  website_url: string | null;
  photo_url: string | null;
  is_featured: boolean;
  display_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/* ===== MODEL CLASS ===== */

class MembershipModel {
  /* -------- MEMBERSHIPS -------- */

  static async createMembership(
    payload: CreateMembershipInput
  ): Promise<Membership> {
    const query = `
      INSERT INTO content.memberships (
        type,
        full_name,
        email,
        phone,
        organization_name,
        city,
        country,
        bio,
        website_url,
        photo_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      payload.type,
      payload.full_name,
      payload.email,
      payload.phone,
      payload.organization_name ?? null,
      payload.city,
      payload.country,
      payload.bio ?? null,
      payload.website_url ?? null,
      payload.photo_url ?? null,
    ];

    const result = await db.query<Membership>(query, values);
    return result.rows[0]!;
  }

  static async getMembershipById(id: string): Promise<Membership | null> {
    const result = await db.query<Membership>(
      `SELECT * FROM content.memberships WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async getAllMemberships(
    status?: MembershipStatus,
    type?: MembershipType
  ): Promise<Membership[]> {
    const conditions: string[] = [];
    const values: string[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }
    if (type) {
      conditions.push(`type = $${idx++}`);
      values.push(type);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await db.query<Membership>(
      `SELECT * FROM content.memberships ${where} ORDER BY created_at DESC`,
      values
    );
    return result.rows;
  }

  static async updateMembershipStatus(
    id: string,
    payload: UpdateMembershipStatusInput
  ): Promise<Membership | null> {
    const result = await db.query<Membership>(
      `
      UPDATE content.memberships
      SET status      = $1,
          admin_notes = $2
      WHERE id = $3
      RETURNING *
      `,
      [payload.status, payload.admin_notes ?? null, id]
    );
    return result.rows[0] ?? null;
  }

  static async checkDuplicateMembership(
    email: string,
    type: MembershipType
  ): Promise<boolean> {
    const result = await db.query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1 FROM content.memberships
        WHERE email = $1 AND type = $2
      ) AS exists
      `,
      [email, type]
    );
    return result.rows[0]?.exists ?? false;
  }

  /* -------- NETWORK MEMBERS -------- */

  static async createNetworkMember(
    payload: CreateNetworkMemberInput
  ): Promise<NetworkMember> {
    const query = `
      INSERT INTO content.network_members (
        membership_id,
        network_category,
        type,
        full_name,
        organization_name,
        city,
        country,
        bio,
        website_url,
        photo_url,
        is_featured,
        display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      payload.membership_id ?? null,
      payload.network_category,
      payload.type,
      payload.full_name,
      payload.organization_name ?? null,
      payload.city,
      payload.country,
      payload.bio ?? null,
      payload.website_url ?? null,
      payload.photo_url ?? null,
      payload.is_featured ?? false,
      payload.display_order ?? 0,
    ];

    const result = await db.query<NetworkMember>(query, values);
    return result.rows[0]!;
  }

  static async getNetworkMemberById(
    id: string
  ): Promise<NetworkMember | null> {
    const result = await db.query<NetworkMember>(
      `SELECT * FROM content.network_members WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  static async getNetworkMembers(
    category?: NetworkCategory,
    type?: MembershipType
  ): Promise<NetworkMember[]> {
    const conditions: string[] = [];
    const values: string[] = [];
    let idx = 1;

    if (category) {
      conditions.push(`network_category = $${idx++}`);
      values.push(category);
    }
    if (type) {
      conditions.push(`type = $${idx++}`);
      values.push(type);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await db.query<NetworkMember>(
      `
      SELECT * FROM content.network_members
      ${where}
      ORDER BY is_featured DESC, display_order ASC, created_at DESC
      `,
      values
    );
    return result.rows;
  }

  static async updateNetworkMember(
    id: string,
    payload: UpdateNetworkMemberInput
  ): Promise<NetworkMember | null> {
    const fields: string[] = [];
    const values: (string | boolean | number | null)[] = [];
    let idx = 1;

    if (payload.network_category !== undefined) {
      fields.push(`network_category = $${idx++}`);
      values.push(payload.network_category);
    }
    if (payload.type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(payload.type);
    }
    if (payload.full_name !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(payload.full_name);
    }
    if (payload.organization_name !== undefined) {
      fields.push(`organization_name = $${idx++}`);
      values.push(payload.organization_name);
    }
    if (payload.city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(payload.city);
    }
    if (payload.country !== undefined) {
      fields.push(`country = $${idx++}`);
      values.push(payload.country);
    }
    if (payload.bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(payload.bio);
    }
    if (payload.website_url !== undefined) {
      fields.push(`website_url = $${idx++}`);
      values.push(payload.website_url);
    }
    if (payload.photo_url !== undefined) {
      fields.push(`photo_url = $${idx++}`);
      values.push(payload.photo_url);
    }
    if (payload.is_featured !== undefined) {
      fields.push(`is_featured = $${idx++}`);
      values.push(payload.is_featured);
    }
    if (payload.display_order !== undefined) {
      fields.push(`display_order = $${idx++}`);
      values.push(payload.display_order);
    }

    if (fields.length === 0) return this.getNetworkMemberById(id);

    values.push(id);

    const result = await db.query<NetworkMember>(
      `
      UPDATE content.network_members
      SET ${fields.join(", ")}
      WHERE id = $${idx}
      RETURNING *
      `,
      values
    );
    return result.rows[0] ?? null;
  }

  static async deleteNetworkMember(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM content.network_members WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async checkDuplicateNetworkMember(
    membershipId: string,
    category: NetworkCategory
  ): Promise<boolean> {
    const result = await db.query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1 FROM content.network_members
        WHERE membership_id = $1 AND network_category = $2
      ) AS exists
      `,
      [membershipId, category]
    );
    return result.rows[0]?.exists ?? false;
  }
}

export default MembershipModel;