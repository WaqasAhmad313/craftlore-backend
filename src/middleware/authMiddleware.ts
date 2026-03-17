import type { Request, Response, NextFunction } from "express";
import { db } from "../config/db.ts";

// ============================================
// TYPES
// ============================================

export interface DashboardUser {
  id: number;
  email: string;
  role_id: number | null;
  is_owner: boolean;
  can_approve: boolean;
  is_active: boolean;
  permissions: Record<string, Record<string, boolean>>;
  is_high_risk: boolean;
  session_id: number;
  session_expires_at: Date;
}

// Extend express Request to carry dashboard user
declare global {
  namespace Express {
    interface Request {
      dashboardUser?: DashboardUser;
    }
  }
}

// ============================================
// DB ROW TYPES
// ============================================

interface SessionUserRow {
  session_id: number;
  session_expires_at: Date;
  session_fingerprint: string | null;
  is_used: boolean;
  user_id: number;
  email: string;
  role_id: number | null;
  is_owner: boolean;
  can_approve: boolean;
  is_active: boolean;
  permissions: Record<string, Record<string, boolean>> | null;
  is_high_risk: boolean | null;
}

interface TrustedDeviceRow {
  id: number;
}

// ============================================
// HELPER
// ============================================

function extractToken(req: Request): string | null {
  const cookie: unknown = req.cookies?.dashboard_token;
  if (typeof cookie === "string" && cookie.trim() !== "") return cookie;
  return null;
}

// ============================================
// AUTH MIDDLEWARE
// Validates:
//   1. Cookie token exists
//   2. Session exists in db + not expired + not used
//   3. Fingerprint matches what was captured at login
//   4. User is active
//   5. Attaches dashboardUser to req
// ============================================

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Internal request — skip all auth checks
    if (res.locals["skipAuth"] === true) {
      next();
      return;
    }

    const token = extractToken(req);

    if (token === null) {
      res.status(401).json({ message: "Unauthorized. No session token." });
      return;
    }

    const rawFingerprint: unknown = req.headers["x-device-fingerprint"];

    if (typeof rawFingerprint !== "string" || rawFingerprint.trim() === "") {
      res.status(401).json({ message: "Unauthorized. Missing device fingerprint." });
      return;
    }

    const fingerprint = rawFingerprint;

    // Fetch session + user + role in one query
    const sessionResult = await db.query<SessionUserRow>(
      `
      SELECT
        s.id               AS session_id,
        s.expires_at       AS session_expires_at,
        s.fingerprint_hash AS session_fingerprint,
        s.is_used,
        u.id               AS user_id,
        u.email,
        u.role_id,
        u.is_owner,
        u.can_approve,
        u.is_active,
        r.permissions,
        r.is_high_risk
      FROM  dashboard.access_sessions s
      JOIN  dashboard.users u       ON u.id = s.user_id
      LEFT JOIN dashboard.roles r   ON r.id = u.role_id
      WHERE s.token_hash = $1
      LIMIT 1
      `,
      [token]
    );

    if ((sessionResult.rowCount ?? 0) === 0) {
      res.status(401).json({ message: "Unauthorized. Invalid session." });
      return;
    }

    const row: SessionUserRow | undefined = sessionResult.rows[0];

    if (row === undefined) {
      res.status(401).json({ message: "Unauthorized. Invalid session." });
      return;
    }

    if (row.is_used) {
      res.status(401).json({ message: "Unauthorized. Session has ended." });
      return;
    }

    if (new Date() > new Date(row.session_expires_at)) {
      res.status(401).json({ message: "Unauthorized. Session expired." });
      return;
    }

    if (!row.is_active) {
      res.status(403).json({ message: "Access revoked." });
      return;
    }

    // ── Fingerprint validation ──────────────────────────────

    if (row.is_owner) {
      // Owner: validate against trusted_devices
      const deviceResult = await db.query<TrustedDeviceRow>(
        `
        SELECT id
        FROM   dashboard.trusted_devices
        WHERE  user_id          = $1
          AND  fingerprint_hash = $2
          AND  is_active        = true
        LIMIT 1
        `,
        [row.user_id, fingerprint]
      );

      if ((deviceResult.rowCount ?? 0) === 0) {
        res.status(401).json({ message: "Unauthorized. Unrecognized device." });
        return;
      }

      await db.query(
        `
        UPDATE dashboard.trusted_devices
        SET    last_seen_at = now()
        WHERE  user_id          = $1
          AND  fingerprint_hash = $2
        `,
        [row.user_id, fingerprint]
      );
    } else {
      // Created users: fingerprint locked to session at OTP verification
      if (row.session_fingerprint === null) {
        res.status(401).json({ message: "Unauthorized. Session not fully verified." });
        return;
      }

      if (row.session_fingerprint !== fingerprint) {
        // Mismatch — immediately kill session
        await db.query(
          `UPDATE dashboard.access_sessions SET is_used = true WHERE id = $1`,
          [row.session_id]
        );

        res.status(401).json({
          message: "Unauthorized. Device mismatch. Session has been terminated.",
        });
        return;
      }
    }

    // ── Attach to request ───────────────────────────────────

    req.dashboardUser = {
      id:                 row.user_id,
      email:              row.email,
      role_id:            row.role_id,
      is_owner:           row.is_owner,
      can_approve:        row.can_approve,
      is_active:          row.is_active,
      permissions:        row.permissions ?? {},
      is_high_risk:       row.is_high_risk ?? false,
      session_id:         row.session_id,
      session_expires_at: row.session_expires_at,
    };

    next();
  } catch (error) {
    console.error("[authMiddleware] error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}