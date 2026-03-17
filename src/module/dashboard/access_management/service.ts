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
    const normalizedEmail = params.email.trim().toLowerCase();

    const existing = await AccessModel.findUserByEmailFull(normalizedEmail);

    if (existing !== null) {
      if (existing.is_active) {
        throw new Error("This user already has active dashboard access.");
      }

      // User exists but was deactivated — reactivate with new role + session
      const expiresAt = new Date(Date.now() + params.durationMs);

      await AccessModel.reactivateUser({
        userId:     existing.id,
        roleId:     params.roleId,
        canApprove: params.canApprove,
        metadata:   { name: params.name },
      });

      // Invalidate any old sessions
      await AccessModel.revokeActiveSession(existing.id);

      // Generate fresh magic link session + OTP
      const { token, otp } = await AuthService.createMagicLinkSession({
        userId:    existing.id,
        createdBy: params.createdBy,
        expiresAt,
      });

      const magicLinkUrl = `${process.env["FRONTEND_URL"] ?? ""}/dashboard/access/verify?token=${token}`;

      await AccessMailer.sendAccessCreated({
        to:       normalizedEmail,
        name:     params.name,
        magicLinkUrl,
        otp,
        expiresAt,
      });

      return;
    }

    // Fresh user — create from scratch
    const expiresAt = new Date(Date.now() + params.durationMs);

    const placeholderPassword  = generateRandomPassword();
    const passwordHash         = await argon2.hash(placeholderPassword);
    const placeholderAccessKey = generateRandomPassword();
    const accessKeyHash        = await argon2.hash(placeholderAccessKey);

    const user = await AccessModel.insertUser({
      email:         normalizedEmail,
      passwordHash,
      accessKeyHash,
      roleId:        params.roleId,
      canApprove:    params.canApprove,
      metadata:      { name: params.name },
    });

    const { token, otp } = await AuthService.createMagicLinkSession({
      userId:    user.id,
      createdBy: params.createdBy,
      expiresAt,
    });

    const magicLinkUrl = `${process.env["FRONTEND_URL"] ?? ""}/dashboard/access/verify?token=${token}`;

    await AccessMailer.sendAccessCreated({
      to:       normalizedEmail,
      name:     params.name,
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