import { db } from "../../../config/db.ts";

// ============================================
// TYPES
// ============================================

export interface DashboardUserRow {
  id: number;
  email: string;
  password_hash: string;
  access_key_hash: string;
  role_id: number | null;
  is_owner: boolean;
  can_approve: boolean;
  is_active: boolean;
  permissions: Record<string, Record<string, boolean>> | null;
  is_high_risk: boolean | null;
}

export interface TrustedDeviceRow {
  id: number;
  user_id: number;
  fingerprint_hash: string;
}

export interface AccessSessionRow {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  is_used: boolean;
  otp_hash: string | null;
  otp_verified: boolean;
  otp_expires_at: Date | null;
  fingerprint_hash: string | null;
}

export interface DeviceRequestRow {
  id: number;
  user_id: number;
  fingerprint_hash: string;
  approval_token: string;
  token_expires_at: Date;
  status: "pending" | "approved" | "rejected" | "expired";
}

export interface InsertSessionParams {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  otpHash: string;
  otpExpiresAt: Date;
  createdBy: number | null;
  isMagicLink: boolean;
}

export interface InsertDeviceRequestParams {
  userId: number;
  fingerprintHash: string;
  metadata: Record<string, unknown>;
  approvalToken: string;
  tokenExpiresAt: Date;
}

// ============================================
// AUTH MODEL
// ============================================

export class AuthModel {
  // ── Users ──────────────────────────────────

  static async findUserByEmail(
    email: string
  ): Promise<DashboardUserRow | null> {
    const result = await db.query<DashboardUserRow>(
      `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.access_key_hash,
        u.role_id,
        u.is_owner,
        u.can_approve,
        u.is_active,
        r.permissions,
        r.is_high_risk
      FROM  dashboard.users u
      LEFT JOIN dashboard.roles r ON r.id = u.role_id
      WHERE u.email = $1
      LIMIT 1
      `,
      [email]
    );

    return result.rows[0] ?? null;
  }

  static async updateLastLogin(userId: number): Promise<void> {
    await db.query(
      `UPDATE dashboard.users SET last_login_at = now() WHERE id = $1`,
      [userId]
    );
  }

  // ── Trusted Devices ─────────────────────────

  static async findTrustedDevice(
    userId: number,
    fingerprintHash: string
  ): Promise<TrustedDeviceRow | null> {
    const result = await db.query<TrustedDeviceRow>(
      `
      SELECT id, user_id, fingerprint_hash
      FROM   dashboard.trusted_devices
      WHERE  user_id          = $1
        AND  fingerprint_hash = $2
        AND  is_active        = true
      LIMIT 1
      `,
      [userId, fingerprintHash]
    );

    return result.rows[0] ?? null;
  }

  static async countTrustedDevices(userId: number): Promise<number> {
    const result = await db.query<{ count: string }>(
      `
      SELECT COUNT(*) AS count
      FROM   dashboard.trusted_devices
      WHERE  user_id   = $1
        AND  is_active = true
      `,
      [userId]
    );

    const row = result.rows[0];
    return row !== undefined ? parseInt(row.count, 10) : 0;
  }

  static async insertTrustedDevice(
    userId: number,
    fingerprintHash: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await db.query(
      `
      INSERT INTO dashboard.trusted_devices
        (user_id, fingerprint_hash, metadata)
      VALUES
        ($1, $2, $3)
      ON CONFLICT (user_id, fingerprint_hash)
        DO UPDATE SET is_active = true, last_seen_at = now()
      `,
      [userId, fingerprintHash, JSON.stringify(metadata)]
    );
  }

  // ── Sessions ────────────────────────────────

  static async insertSession(
    params: InsertSessionParams
  ): Promise<AccessSessionRow> {
    const result = await db.query<AccessSessionRow>(
      `
      INSERT INTO dashboard.access_sessions
        (user_id, token_hash, expires_at, otp_hash, otp_expires_at, created_by, context)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        params.userId,
        params.tokenHash,
        params.expiresAt,
        params.otpHash,
        params.otpExpiresAt,
        params.createdBy,
        JSON.stringify({ magic_link: params.isMagicLink }),
      ]
    );

    const row = result.rows[0];

    if (row === undefined) {
      throw new Error("Failed to create session.");
    }

    return row;
  }

  static async findSessionByToken(
    tokenHash: string
  ): Promise<AccessSessionRow | null> {
    const result = await db.query<AccessSessionRow>(
      `
      SELECT *
      FROM   dashboard.access_sessions
      WHERE  token_hash = $1
      LIMIT  1
      `,
      [tokenHash]
    );

    return result.rows[0] ?? null;
  }

  static async verifyOtpAndLockFingerprint(
    sessionId: number,
    fingerprintHash: string
  ): Promise<void> {
    await db.query(
      `
      UPDATE dashboard.access_sessions
      SET
        otp_verified     = true,
        fingerprint_hash = $2
      WHERE id = $1
      `,
      [sessionId, fingerprintHash]
    );
  }

  static async invalidateSession(sessionId: number): Promise<void> {
    await db.query(
      `UPDATE dashboard.access_sessions SET is_used = true WHERE id = $1`,
      [sessionId]
    );
  }

  // ── Device Requests ─────────────────────────

  static async insertDeviceRequest(
    params: InsertDeviceRequestParams
  ): Promise<void> {
    await db.query(
      `
      INSERT INTO dashboard.device_requests
        (user_id, fingerprint_hash, metadata, approval_token, token_expires_at)
      VALUES
        ($1, $2, $3, $4, $5)
      `,
      [
        params.userId,
        params.fingerprintHash,
        JSON.stringify(params.metadata),
        params.approvalToken,
        params.tokenExpiresAt,
      ]
    );
  }

  static async findDeviceRequestByToken(
    approvalToken: string
  ): Promise<DeviceRequestRow | null> {
    const result = await db.query<DeviceRequestRow>(
      `
      SELECT *
      FROM   dashboard.device_requests
      WHERE  approval_token = $1
      LIMIT  1
      `,
      [approvalToken]
    );

    return result.rows[0] ?? null;
  }

  static async approveDeviceRequest(requestId: number): Promise<void> {
    await db.query(
      `
      UPDATE dashboard.device_requests
      SET    status      = 'approved',
             reviewed_at = now()
      WHERE  id = $1
      `,
      [requestId]
    );
  }

  static async expireStaleDeviceRequests(): Promise<void> {
    await db.query(
      `
      UPDATE dashboard.device_requests
      SET    status = 'expired'
      WHERE  status           = 'pending'
        AND  token_expires_at < now()
      `
    );
  }
}