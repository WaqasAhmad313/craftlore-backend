import { db } from "../../../config/db.ts";

/** ---------- Types ---------- */
export type AppraisalStatus = "pending" | "approved" | "rejected";

export interface PamMaterialInput {
  material_type: string;
  material_grade: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  source_region: string;
  certification_available: boolean;
}

export interface PamLaborInput {
  artisan_name: string;
  skill_tier: string;
  hours_spent: number;
  technique_difficulty: string;
  specialized_technique: string;
  years_of_experience: number;
}

export interface PamCraftsmanshipScoring {
  complexity_score: number;
  density_level: string;
  density_value: number;
  density_unit: string;
  finish_quality: string;
  technique_mastery_score: number;
  innovation_factor: number;
}

export interface PamProvenanceData {
  gi_verified: boolean;
  gi_certificate_number: string;
  gi_verification_date: string;
  artisan_certification: string;
  workshop_registration_number: string;
  chain_of_custody_documented: boolean;
  raw_material_traceability: boolean;
}

export interface PamCraftIdentity {
  craft_type: string;
  craft_name: string;
  gi_number?: string | null;
  gi_verified: boolean;
  region: string;
  vendor_name: string;
  vendor_email: string;
  vendor_phone?: string | null;
  product_description?: string | null;
}

export interface CreatePamAppraisalInput {
  craft_identity: PamCraftIdentity;
  materials: PamMaterialInput[];
  labor: PamLaborInput;
  craftsmanship: PamCraftsmanshipScoring;
  provenance: PamProvenanceData;
}

export interface PamAppraisalRow {
  id: string;
  craft_type: string;
  craft_name: string;
  region: string;
  vendor_name: string;
  vendor_email: string;
  gi_verified: boolean;
  appraisal_status: AppraisalStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;

  // JSON payload (full PAM form)
  pam_payload: unknown;
}

/** ---------- Model ---------- */
class PamModel {
  static async create(payload: CreatePamAppraisalInput): Promise<PamAppraisalRow> {
    const query = `
      INSERT INTO pam_appraisals (
        craft_type,
        craft_name,
        region,
        vendor_name,
        vendor_email,
        gi_verified,
        appraisal_status,
        pam_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7::jsonb)
      RETURNING *
    `;

    const values = [
      payload.craft_identity.craft_type,
      payload.craft_identity.craft_name,
      payload.craft_identity.region,
      payload.craft_identity.vendor_name,
      payload.craft_identity.vendor_email,
      payload.craft_identity.gi_verified,
      JSON.stringify(payload),
    ];

    const result = await db.query<PamAppraisalRow>(query, values);
    return result.rows[0]!;
  }

  static async getById(id: string): Promise<PamAppraisalRow | null> {
    const result = await db.query<PamAppraisalRow>(
      `SELECT * FROM pam_appraisals WHERE id = $1 LIMIT 1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  static async list(params: {
    status?: AppraisalStatus;
    limit: number;
    offset: number;
  }): Promise<PamAppraisalRow[]> {
    const where: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (params.status) {
      where.push(`appraisal_status = $${i++}`);
      values.push(params.status);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    values.push(params.limit);
    const limitIdx = i++;
    values.push(params.offset);
    const offsetIdx = i++;

    const query = `
      SELECT *
      FROM pam_appraisals
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${limitIdx}
      OFFSET $${offsetIdx}
    `;

    const result = await db.query<PamAppraisalRow>(query, values);
    return result.rows;
  }

  static async stats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    const query = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE appraisal_status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE appraisal_status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE appraisal_status = 'rejected')::int AS rejected
      FROM pam_appraisals
    `;
    const result = await db.query<{
      pending: number;
      approved: number;
      rejected: number;
      total: number;
    }>(query);

    return result.rows[0]!;
  }

  static async updatePayload(id: string, pamPayload: unknown): Promise<PamAppraisalRow | null> {
    const query = `
      UPDATE pam_appraisals
      SET
        pam_payload = $2::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query<PamAppraisalRow>(query, [id, JSON.stringify(pamPayload)]);
    return result.rows[0] ?? null;
  }

  static async updateStatus(args: {
    id: string;
    status: AppraisalStatus;
    admin_notes?: string | null;
    reviewed_at?: string | null;
  }): Promise<PamAppraisalRow | null> {
    const query = `
      UPDATE pam_appraisals
      SET
        appraisal_status = $2,
        admin_notes = $3,
        reviewed_at = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query<PamAppraisalRow>(query, [
      args.id,
      args.status,
      args.admin_notes ?? null,
      args.reviewed_at ?? null,
    ]);

    return result.rows[0] ?? null;
  }

  static async deleteById(id: string): Promise<boolean> {
    const result = await db.query<{ id: string }>(
      `DELETE FROM pam_appraisals WHERE id = $1 RETURNING id`,
      [id],
    );
    return result.rowCount === 1;
  }
}

export default PamModel;
