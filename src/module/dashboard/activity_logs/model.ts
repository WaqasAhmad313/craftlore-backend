import { db } from "../../../config/db.ts";

// ============================================
// TYPES
// ============================================

export interface ActivityLogRow {
  id: number;
  user_id: number | null;
  user_email: string | null;
  user_name: string | null;
  module: string;
  action: string;
  entity_id: string | null;
  diff: {
    old: Record<string, unknown> | null;
    new: Record<string, unknown> | null;
  } | null;
  meta: {
    ip: string | null;
    user_agent: string | null;
    note: string | null;
  };
  created_at: Date;
}

export interface ListLogsFilters {
  module: string | null;
  action: string | null;
  userId: number | null;
  entityId: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  limit: number;
  offset: number;
}

export interface LogsPage {
  logs: ActivityLogRow[];
  total: number;
}

// ============================================
// ACTIVITY LOGS MODEL
// ============================================

export class ActivityLogsModel {
  // ── List with filters + pagination ──────────

  static async listLogs(
    filters: ListLogsFilters,
    allowedModules: string[] | null
  ): Promise<LogsPage> {
    // allowedModules null means owner — sees everything
    // allowedModules array means approver — scoped to their modules

    const result = await db.query<ActivityLogRow & { total_count: string }>(
      `
      SELECT
        al.id,
        al.user_id,
        u.email                   AS user_email,
        (u.metadata ->> 'name')   AS user_name,
        al.module,
        al.action,
        al.entity_id,
        al.diff,
        al.meta,
        al.created_at,
        COUNT(*) OVER()           AS total_count
      FROM  dashboard.activity_logs al
      LEFT JOIN dashboard.users u ON u.id = al.user_id
      WHERE
        ($1::text[]  IS NULL OR al.module    = ANY($1))
        AND ($2::text    IS NULL OR al.module    = $2)
        AND ($3::text    IS NULL OR al.action    = $3)
        AND ($4::int     IS NULL OR al.user_id   = $4)
        AND ($5::text    IS NULL OR al.entity_id = $5)
        AND ($6::timestamptz IS NULL OR al.created_at >= $6)
        AND ($7::timestamptz IS NULL OR al.created_at <= $7)
      ORDER BY al.created_at DESC
      LIMIT  $8
      OFFSET $9
      `,
      [
        allowedModules,
        filters.module,
        filters.action,
        filters.userId,
        filters.entityId,
        filters.dateFrom,
        filters.dateTo,
        filters.limit,
        filters.offset,
      ]
    );

    const total =
      result.rows.length > 0
        ? parseInt((result.rows[0] as { total_count: string }).total_count, 10)
        : 0;

    return { logs: result.rows, total };
  }

  // ── Entity history ───────────────────────────
  // Full log trail for one specific entity

  static async getEntityHistory(
    entityId: string,
    module: string | null
  ): Promise<ActivityLogRow[]> {
    const result = await db.query<ActivityLogRow>(
      `
      SELECT
        al.id,
        al.user_id,
        u.email                   AS user_email,
        (u.metadata ->> 'name')   AS user_name,
        al.module,
        al.action,
        al.entity_id,
        al.diff,
        al.meta,
        al.created_at
      FROM  dashboard.activity_logs al
      LEFT JOIN dashboard.users u ON u.id = al.user_id
      WHERE al.entity_id = $1
        AND ($2::text IS NULL OR al.module = $2)
      ORDER BY al.created_at DESC
      `,
      [entityId, module]
    );

    return result.rows;
  }
}