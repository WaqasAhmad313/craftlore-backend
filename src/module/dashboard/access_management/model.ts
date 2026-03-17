import { db } from "../../../config/db.ts";

// ============================================
// TYPES
// ============================================

export interface AccessUserRow {
  id: number;
  email: string;
  role_id: number | null;
  role_name: string | null;
  is_active: boolean;
  can_approve: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  last_login_at: Date | null;
}

export interface AccessUserWithSessionRow extends AccessUserRow {
  session_id: number | null;
  session_expires_at: Date | null;
  session_is_used: boolean | null;
}

export interface ExtensionRequestRow {
  id: number;
  user_id: number;
  user_email: string;
  session_id: number;
  session_expires_at: Date;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: Date;
  reviewed_by: number | null;
  reviewed_at: Date | null;
}

export interface InsertUserParams {
  email: string;
  passwordHash: string;
  accessKeyHash: string;
  roleId: number;
  canApprove: boolean;
  metadata: Record<string, unknown>;
}

// ============================================
// ACCESS MODEL
// ============================================

export class AccessModel {
  // ── Users ──────────────────────────────────

  static async insertUser(params: InsertUserParams): Promise<{ id: number }> {
    const result = await db.query<{ id: number }>(
      `
      INSERT INTO dashboard.users
        (email, password_hash, access_key_hash, role_id, can_approve, metadata)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        params.email,
        params.passwordHash,
        params.accessKeyHash,
        params.roleId,
        params.canApprove,
        JSON.stringify(params.metadata),
      ]
    );

    const row = result.rows[0];

    if (row === undefined) {
      throw new Error("Failed to create user.");
    }

    return row;
  }

  static async findUserById(userId: number): Promise<AccessUserRow | null> {
    const result = await db.query<AccessUserRow>(
      `
      SELECT
        u.id,
        u.email,
        u.role_id,
        r.name        AS role_name,
        u.is_active,
        u.can_approve,
        u.metadata,
        u.created_at,
        u.last_login_at
      FROM  dashboard.users u
      LEFT JOIN dashboard.roles r ON r.id = u.role_id
      WHERE u.id       = $1
        AND u.is_owner = false
      LIMIT 1
      `,
      [userId]
    );

    return result.rows[0] ?? null;
  }

  static async findUserByEmail(email: string): Promise<{ id: number } | null> {
    const result = await db.query<{ id: number }>(
      `
      SELECT id
      FROM   dashboard.users
      WHERE  email = $1
      LIMIT  1
      `,
      [email]
    );

    return result.rows[0] ?? null;
  }

  static async findUserByEmailFull(
    email: string
  ): Promise<{ id: number; is_active: boolean } | null> {
    const result = await db.query<{ id: number; is_active: boolean }>(
      `
      SELECT id, is_active
      FROM   dashboard.users
      WHERE  email    = $1
        AND  is_owner = false
      LIMIT  1
      `,
      [email]
    );

    return result.rows[0] ?? null;
  }

  static async reactivateUser(params: {
    userId: number;
    roleId: number;
    canApprove: boolean;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await db.query(
      `
      UPDATE dashboard.users
      SET
        role_id     = $2,
        can_approve = $3,
        metadata    = $4,
        is_active   = true,
        updated_at  = now()
      WHERE id = $1
      `,
      [
        params.userId,
        params.roleId,
        params.canApprove,
        JSON.stringify(params.metadata),
      ]
    );
  }

  static async listUsersWithSessions(): Promise<AccessUserWithSessionRow[]> {
    const result = await db.query<AccessUserWithSessionRow>(
      `
      SELECT
        u.id,
        u.email,
        u.role_id,
        r.name          AS role_name,
        u.is_active,
        u.can_approve,
        u.metadata,
        u.created_at,
        u.last_login_at,
        s.id            AS session_id,
        s.expires_at    AS session_expires_at,
        s.is_used       AS session_is_used
      FROM  dashboard.users u
      LEFT JOIN dashboard.roles r ON r.id = u.role_id
      LEFT JOIN LATERAL (
        SELECT id, expires_at, is_used
        FROM   dashboard.access_sessions
        WHERE  user_id = u.id
        ORDER  BY created_at DESC
        LIMIT  1
      ) s ON true
      WHERE u.is_owner = false
      ORDER BY u.created_at DESC
      `
    );

    return result.rows;
  }

  static async toggleUserActive(
    userId: number,
    isActive: boolean
  ): Promise<void> {
    await db.query(
      `
      UPDATE dashboard.users
      SET    is_active  = $2,
             updated_at = now()
      WHERE  id = $1
      `,
      [userId, isActive]
    );
  }

  // ── Sessions ────────────────────────────────

  static async revokeActiveSession(userId: number): Promise<void> {
    await db.query(
      `
      UPDATE dashboard.access_sessions
      SET    is_used = true
      WHERE  user_id  = $1
        AND  is_used  = false
        AND  expires_at > now()
      `,
      [userId]
    );
  }

  static async extendSession(
    sessionId: number,
    newExpiresAt: Date
  ): Promise<void> {
    await db.query(
      `
      UPDATE dashboard.access_sessions
      SET    expires_at = $2
      WHERE  id = $1
      `,
      [sessionId, newExpiresAt]
    );
  }

  // ── Extension Requests ──────────────────────

  static async listExtensionRequests(
    status: "pending" | "approved" | "rejected" | "all"
  ): Promise<ExtensionRequestRow[]> {
    const result = await db.query<ExtensionRequestRow>(
      `
      SELECT
        er.id,
        er.user_id,
        u.email          AS user_email,
        er.session_id,
        s.expires_at     AS session_expires_at,
        er.reason,
        er.status,
        er.requested_at,
        er.reviewed_by,
        er.reviewed_at
      FROM  dashboard.access_extension_requests er
      JOIN  dashboard.users u              ON u.id  = er.user_id
      JOIN  dashboard.access_sessions s    ON s.id  = er.session_id
      WHERE ($1 = 'all' OR er.status = $1)
      ORDER BY er.requested_at DESC
      `,
      [status]
    );

    return result.rows;
  }

  static async findExtensionRequest(
    requestId: number
  ): Promise<ExtensionRequestRow | null> {
    const result = await db.query<ExtensionRequestRow>(
      `
      SELECT
        er.id,
        er.user_id,
        u.email          AS user_email,
        er.session_id,
        s.expires_at     AS session_expires_at,
        er.reason,
        er.status,
        er.requested_at,
        er.reviewed_by,
        er.reviewed_at
      FROM  dashboard.access_extension_requests er
      JOIN  dashboard.users u              ON u.id = er.user_id
      JOIN  dashboard.access_sessions s    ON s.id = er.session_id
      WHERE er.id = $1
      LIMIT 1
      `,
      [requestId]
    );

    return result.rows[0] ?? null;
  }

  static async resolveExtensionRequest(params: {
    requestId: number;
    status: "approved" | "rejected";
    reviewedBy: number;
    extensionDuration: string | null;
  }): Promise<void> {
    await db.query(
      `
      UPDATE dashboard.access_extension_requests
      SET
        status             = $2,
        reviewed_by        = $3,
        reviewed_at        = now(),
        extension_duration = $4
      WHERE id = $1
      `,
      [
        params.requestId,
        params.status,
        params.reviewedBy,
        params.extensionDuration,
      ]
    );
  }
}