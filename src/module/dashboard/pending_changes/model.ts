import { db } from "../../../config/db.ts";

// ============================================
// TYPES
// ============================================

export type PendingStatus    = "pending" | "approved" | "rejected";
export type PendingOperation = "create"  | "update"   | "delete";

export interface PendingChangeRow {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string | null;
  module: string;
  operation: PendingOperation;
  entity_id: string | null;
  payload: {
    new: Record<string, unknown> | null;
    _meta: {
      endpoint: string;
      method: string;
    };
  };
  status: PendingStatus;
  reviewed_by: number | null;
  reviewer_email: string | null;
  review_note: string | null;
  created_at: Date;
  reviewed_at: Date | null;
}

export interface MyPendingChangeRow {
  id: number;
  module: string;
  operation: PendingOperation;
  entity_id: string | null;
  payload: {
    new: Record<string, unknown> | null;
    _meta: {
      endpoint: string;
      method: string;
    };
  };
  status: PendingStatus;
  review_note: string | null;
  created_at: Date;
  reviewed_at: Date | null;
}

export interface ListPendingFilters {
  status: PendingStatus | "all";
  module: string | null;
}

// ============================================
// PENDING MODEL
// ============================================

export class PendingModel {
  // ── List — approver / owner view ───────────
  //
  // isOwner = true  → skip module scoping entirely, see all rows
  // isOwner = false → rows scoped to allowedModules via ANY($1)

  static async listPending(
    filters: ListPendingFilters,
    allowedModules: string[],
    isOwner: boolean
  ): Promise<PendingChangeRow[]> {
    const result = await db.query<PendingChangeRow>(
      `
      SELECT
        pc.id,
        pc.user_id,
        u.email                                     AS user_email,
        (u.metadata ->> 'name')                     AS user_name,
        pc.module,
        pc.operation,
        pc.entity_id,
        pc.payload,
        pc.status,
        pc.reviewed_by,
        rv.email                                    AS reviewer_email,
        pc.review_note,
        pc.created_at,
        pc.reviewed_at
      FROM  dashboard.pending_changes pc
      JOIN  dashboard.users u              ON u.id  = pc.user_id
      LEFT JOIN dashboard.users rv         ON rv.id = pc.reviewed_by
      WHERE ($1 OR pc.module = ANY($2))
        AND ($3::text = 'all' OR pc.status = $3)
        AND ($4::text IS NULL  OR pc.module = $4)
      ORDER BY pc.created_at DESC
      `,
      [isOwner, allowedModules, filters.status, filters.module]
    );

    return result.rows;
  }

  // ── List — user's own pending changes ───────

  static async listMyPending(userId: number): Promise<MyPendingChangeRow[]> {
    const result = await db.query<MyPendingChangeRow>(
      `
      SELECT
        id,
        module,
        operation,
        entity_id,
        payload,
        status,
        review_note,
        created_at,
        reviewed_at
      FROM  dashboard.pending_changes
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return result.rows;
  }

  // ── Find single ─────────────────────────────

  static async findById(
    pendingId: number
  ): Promise<PendingChangeRow | null> {
    const result = await db.query<PendingChangeRow>(
      `
      SELECT
        pc.id,
        pc.user_id,
        u.email                                     AS user_email,
        (u.metadata ->> 'name')                     AS user_name,
        pc.module,
        pc.operation,
        pc.entity_id,
        pc.payload,
        pc.status,
        pc.reviewed_by,
        rv.email                                    AS reviewer_email,
        pc.review_note,
        pc.created_at,
        pc.reviewed_at
      FROM  dashboard.pending_changes pc
      JOIN  dashboard.users u              ON u.id  = pc.user_id
      LEFT JOIN dashboard.users rv         ON rv.id = pc.reviewed_by
      WHERE pc.id = $1
      LIMIT 1
      `,
      [pendingId]
    );

    return result.rows[0] ?? null;
  }

  // ── Resolve ─────────────────────────────────

  static async resolve(params: {
    pendingId:  number;
    status:     "approved" | "rejected";
    reviewedBy: number;
    reviewNote: string | null;
  }): Promise<void> {
    await db.query(
      `
      UPDATE dashboard.pending_changes
      SET
        status      = $2,
        reviewed_by = $3,
        review_note = $4,
        reviewed_at = now()
      WHERE id = $1
      `,
      [
        params.pendingId,
        params.status,
        params.reviewedBy,
        params.reviewNote,
      ]
    );
  }
}