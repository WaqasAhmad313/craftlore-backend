import * as argon2 from "argon2";
import crypto from "crypto";
import { AccessModel } from "./model.ts";
import { AccessMailer } from "./mailer.ts";
import { AuthService } from "../auth/service.ts";
import type {
  AccessUserWithSessionRow,
  ExtensionRequestRow,
} from "./model.ts";

// ============================================
// TYPES
// ============================================

export interface CreateAccessParams {
  email: string;
  roleId: number;
  canApprove: boolean;
  name: string;
  durationMs: number;
  createdBy: number;
}

export interface AccessUserSummary {
  id: number;
  email: string;
  role_id: number | null;
  role_name: string | null;
  is_active: boolean;
  can_approve: boolean;
  name: string;
  created_at: Date;
  last_login_at: Date | null;
  session: {
    id: number;
    expires_at: Date;
    is_active: boolean;
    time_remaining_ms: number;
  } | null;
}

export interface ResolveExtensionParams {
  requestId: number;
  reviewedBy: number;
  action: "approved" | "rejected";
  extensionMs: number | null;
}

// ============================================
// HELPERS
// ============================================

function generateRandomPassword(): string {
  // Internal placeholder password — user never uses this
  // Access is always via magic link
  return crypto.randomBytes(32).toString("hex");
}

function msToPostgresInterval(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${seconds} seconds`;
}

function formatUserSummary(row: AccessUserWithSessionRow): AccessUserSummary {
  const metadata = row.metadata as { name?: unknown };
  const name =
    typeof metadata.name === "string" ? metadata.name : row.email;

  let session: AccessUserSummary["session"] = null;

  if (
    row.session_id !== null &&
    row.session_expires_at !== null &&
    row.session_is_used === false
  ) {
    const now           = Date.now();
    const expiresAt     = new Date(row.session_expires_at);
    const timeRemaining = expiresAt.getTime() - now;

    session = {
      id:                row.session_id,
      expires_at:        expiresAt,
      is_active:         timeRemaining > 0,
      time_remaining_ms: Math.max(0, timeRemaining),
    };
  }

  return {
    id:            row.id,
    email:         row.email,
    role_id:       row.role_id,
    role_name:     row.role_name,
    is_active:     row.is_active,
    can_approve:   row.can_approve,
    name,
    created_at:    row.created_at,
    last_login_at: row.last_login_at,
    session,
  };
}

// ============================================
// ACCESS SERVICE
// ============================================

export class AccessService {
  // ── Create Access ───────────────────────────

  static async createAccess(params: CreateAccessParams): Promise<void> {
    // Check email not already taken
    const existing = await AccessModel.findUserByEmail(
      params.email.trim().toLowerCase()
    );

    if (existing !== null) {
      throw new Error("A user with this email already exists.");
    }

    const expiresAt = new Date(Date.now() + params.durationMs);

    // Hash a random placeholder password — user logs in via magic link only
    const placeholderPassword = generateRandomPassword();
    const passwordHash        = await argon2.hash(placeholderPassword);

    // Placeholder access key — not used for magic link users
    const placeholderAccessKey = generateRandomPassword();
    const accessKeyHash        = await argon2.hash(placeholderAccessKey);

    // Insert user
    const user = await AccessModel.insertUser({
      email:         params.email.trim().toLowerCase(),
      passwordHash,
      accessKeyHash,
      roleId:        params.roleId,
      canApprove:    params.canApprove,
      metadata:      { name: params.name },
    });

    // Generate magic link session + OTP
    const { token, otp } = await AuthService.createMagicLinkSession({
      userId:    user.id,
      createdBy: params.createdBy,
      expiresAt,
    });

    const magicLinkUrl = `${process.env["DASHBOARD_BASE_URL"] ?? ""}/dashboard/access/verify?token=${token}`;

    // Send email
    await AccessMailer.sendAccessCreated({
      to:           params.email,
      name:         params.name,
      magicLinkUrl,
      otp,
      expiresAt,
    });
  }

  // ── List Users ──────────────────────────────

  static async listUsers(): Promise<AccessUserSummary[]> {
    const rows = await AccessModel.listUsersWithSessions();
    return rows.map(formatUserSummary);
  }

  // ── Revoke Access ───────────────────────────

  static async revokeAccess(userId: number): Promise<void> {
    const user = await AccessModel.findUserById(userId);

    if (user === null) {
      throw new Error("User not found.");
    }

    await AccessModel.revokeActiveSession(userId);
    await AccessModel.toggleUserActive(userId, false);
  }

  // ── Toggle Active ───────────────────────────

  static async toggleUserActive(
    userId: number,
    isActive: boolean
  ): Promise<void> {
    const user = await AccessModel.findUserById(userId);

    if (user === null) {
      throw new Error("User not found.");
    }

    if (!isActive) {
      // Deactivating — also kill any active session
      await AccessModel.revokeActiveSession(userId);
    }

    await AccessModel.toggleUserActive(userId, isActive);
  }

  // ── List Extension Requests ─────────────────

  static async listExtensionRequests(
    status: "pending" | "approved" | "rejected" | "all"
  ): Promise<ExtensionRequestRow[]> {
    return AccessModel.listExtensionRequests(status);
  }

  // ── Resolve Extension Request ───────────────

  static async resolveExtensionRequest(
    params: ResolveExtensionParams
  ): Promise<void> {
    const request = await AccessModel.findExtensionRequest(params.requestId);

    if (request === null) {
      throw new Error("Extension request not found.");
    }

    if (request.status !== "pending") {
      throw new Error("This request has already been reviewed.");
    }

    let extensionInterval: string | null = null;

    if (params.action === "approved") {
      if (params.extensionMs === null || params.extensionMs <= 0) {
        throw new Error("Extension duration is required when approving.");
      }

      extensionInterval = msToPostgresInterval(params.extensionMs);

      // Calculate new expiry
      const currentExpiry = new Date(request.session_expires_at);
      const newExpiry     = new Date(
        currentExpiry.getTime() + params.extensionMs
      );

      await AccessModel.extendSession(request.session_id, newExpiry);
    }

    await AccessModel.resolveExtensionRequest({
      requestId:         params.requestId,
      status:            params.action,
      reviewedBy:        params.reviewedBy,
      extensionDuration: extensionInterval,
    });
  }
}