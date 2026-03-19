import crypto from "crypto";
import * as argon2 from "argon2";
import { AuthModel } from "./model.ts";
import { AuthMailer } from "./mailer.ts";
import type {
  DashboardUserRow,
  AccessSessionRow,
  DeviceRequestRow,
} from "./model.ts";

// ============================================
// TYPES
// ============================================

export interface DeviceMetadata {
  browser: string | null;
  os: string | null;
  ip: string | null;
  user_agent: string | null;
}

export interface VerifyCredentialsResult {
  tempToken: string;
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: {
    id: number;
    email: string;
    is_owner: boolean;
    can_approve: boolean;
    permissions: Record<string, Record<string, boolean>>;
    is_high_risk: boolean;
  };
}

export interface MagicLinkVerifyResult {
  token: string;
  expiresAt: Date;
}

// ============================================
// CONSTANTS
// ============================================

const OWNER_SESSION_DURATION_MS = 1000 * 60 * 60 * 8;  // 8 hours
const STEP1_TOKEN_EXPIRY_MS     = 1000 * 60 * 5;        // 5 minutes
const OTP_EXPIRY_MS             = 1000 * 60 * 10;        // 10 minutes
const DEVICE_TOKEN_EXPIRY_MS    = 1000 * 60 * 60 * 24;  // 24 hours
const MAX_TRUSTED_DEVICES       = 2;

// ============================================
// HELPERS
// ============================================

function generateSecureToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

function generateOtp(): string {
  const otp = crypto.randomInt(0, 1_000_000);
  return otp.toString().padStart(6, "0");
}

// ============================================
// AUTH SERVICE
// ============================================

export class AuthService {

  // -- Step 1: Verify Email + Password --------
  // Returns a short-lived temp token (5 min)
  // No session created yet, no cookie set

  static async verifyCredentials(params: {
    email: string;
    password: string;
  }): Promise<VerifyCredentialsResult> {
    const user = await AuthModel.findUserByEmail(params.email);

    if (user === null || !user.is_owner) {
      throw new Error("Invalid credentials.");
    }

    if (!user.is_active) {
      throw new Error("Account is inactive.");
    }

    const passwordValid = await argon2.verify(
      user.password_hash,
      params.password
    );

    if (!passwordValid) {
      throw new Error("Invalid credentials.");
    }

    // Create short-lived temp token — marks step 1 as passed
    // Stored in access_sessions with context.step1_only = true
    // Expires in 5 minutes
    const tempToken  = generateSecureToken();
    const expiresAt  = new Date(Date.now() + STEP1_TOKEN_EXPIRY_MS);

    // Reuse insertSession with a placeholder OTP
    // step1_only flag stored in context via isMagicLink = false
    // We store user_id so step 2 can find the user
    await AuthModel.insertStep1Token({
      userId:     user.id,
      tokenHash:  tempToken,
      expiresAt,
    });

    return { tempToken };
  }

  // -- Step 2: Verify Access Key + Fingerprint -
  // Completes login, creates real session, sets cookie

  static async verifyAccessKey(params: {
    tempToken: string;
    accessKey: string;
    fingerprintHash: string;
    deviceMetadata: DeviceMetadata;
  }): Promise<LoginResult> {
    // Find the step1 token
    const step1Session = await AuthModel.findStep1Token(params.tempToken);

    if (step1Session === null) {
      throw new Error("Invalid or expired verification. Please start again.");
    }

    if (new Date() > new Date(step1Session.expires_at)) {
      throw new Error("Verification expired. Please start again.");
    }

    // Get the user
    const user = await AuthModel.findUserById(step1Session.user_id);

    if (user === null || !user.is_owner || !user.is_active) {
      throw new Error("Invalid credentials.");
    }

    // Verify access key
    const accessKeyValid = await argon2.verify(
      user.access_key_hash,
      params.accessKey
    );

    if (!accessKeyValid) {
      throw new Error("Invalid access key.");
    }

    // Invalidate the step1 token — it is single use
    await AuthModel.invalidateSession(step1Session.id);

    // -- Fingerprint / trusted device check ---
    const trustedDevice = await AuthModel.findTrustedDevice(
      user.id,
      params.fingerprintHash
    );

    if (trustedDevice === null) {
      const deviceCount = await AuthModel.countTrustedDevices(user.id);

      if (deviceCount === 0) {
        // First login ever -- capture fingerprint automatically
        await AuthModel.insertTrustedDevice(
          user.id,
          params.fingerprintHash,
          params.deviceMetadata as unknown as Record<string, unknown>
        );
      } else {
        // Established account, unknown device -- send approval email
        await AuthService.handleUnknownOwnerDevice(user, params);
        throw new Error(
          "Unrecognized device. An approval request has been sent to your email."
        );
      }
    }

    // Create real session
    const token     = generateSecureToken();
    const expiresAt = new Date(Date.now() + OWNER_SESSION_DURATION_MS);
    const otp       = generateOtp();
    const otpHash   = await argon2.hash(otp);
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

    await AuthModel.insertSession({
      userId:       user.id,
      tokenHash:    token,
      expiresAt,
      otpHash,
      otpExpiresAt: otpExpiry,
      createdBy:    null,
      isMagicLink:  false,
    });

    await AuthModel.updateLastLogin(user.id);

    return {
      token,
      expiresAt,
      user: AuthService.formatUser(user),
    };
  }

  // -- Handle Unknown Owner Device ------------

  private static async handleUnknownOwnerDevice(
    user: DashboardUserRow,
    params: {
      fingerprintHash: string;
      deviceMetadata: DeviceMetadata;
    }
  ): Promise<void> {
    const approvalToken  = generateSecureToken();
    const tokenExpiresAt = new Date(Date.now() + DEVICE_TOKEN_EXPIRY_MS);

    await AuthModel.insertDeviceRequest({
      userId:          user.id,
      fingerprintHash: params.fingerprintHash,
      metadata:        params.deviceMetadata as unknown as Record<string, unknown>,
      approvalToken,
      tokenExpiresAt,
    });

    await AuthMailer.sendDeviceApprovalRequest({
      to:             user.email,
      approvalToken,
      deviceMetadata: params.deviceMetadata,
    });
  }

  // -- Approve Owner Device -------------------

  static async approveOwnerDevice(approvalToken: string): Promise<void> {
    await AuthModel.expireStaleDeviceRequests();

    const request = await AuthModel.findDeviceRequestByToken(approvalToken);

    if (request === null) {
      throw new Error("Invalid or expired approval link.");
    }

    if (request.status !== "pending") {
      throw new Error(
        request.status === "expired"
          ? "This approval link has expired."
          : "This device has already been processed."
      );
    }

    if (new Date() > new Date(request.token_expires_at)) {
      throw new Error("This approval link has expired.");
    }

    const deviceCount = await AuthModel.countTrustedDevices(request.user_id);

    if (deviceCount >= MAX_TRUSTED_DEVICES) {
      throw new Error(
        `Maximum of ${MAX_TRUSTED_DEVICES} trusted devices allowed. Please remove one first.`
      );
    }

    await AuthModel.approveDeviceRequest(request.id);

    await AuthModel.insertTrustedDevice(
      request.user_id,
      request.fingerprint_hash,
      {}
    );
  }

  // -- Magic Link OTP Verify ------------------

  static async verifyMagicLinkOtp(params: {
    tokenHash: string;
    otp: string;
    fingerprintHash: string;
  }): Promise<MagicLinkVerifyResult> {
    const session = await AuthModel.findSessionByToken(params.tokenHash);

    if (session === null) {
      throw new Error("Invalid or expired link.");
    }

    if (session.is_used) {
      throw new Error("This session has already ended.");
    }

    if (new Date() > new Date(session.expires_at)) {
      throw new Error("This link has expired.");
    }

    if (session.otp_verified) {
      throw new Error("OTP already verified.");
    }

    if (
      session.otp_expires_at === null ||
      new Date() > new Date(session.otp_expires_at)
    ) {
      throw new Error("OTP has expired. Please request a new access link.");
    }

    if (session.otp_hash === null) {
      throw new Error("Invalid session state.");
    }

    const otpValid = await argon2.verify(session.otp_hash, params.otp);

    if (!otpValid) {
      throw new Error("Invalid OTP.");
    }

    await AuthModel.verifyOtpAndLockFingerprint(
      session.id,
      params.fingerprintHash
    );

    return {
      token:     params.tokenHash,
      expiresAt: session.expires_at,
    };
  }

  // -- Logout ---------------------------------

  static async logout(sessionId: number): Promise<void> {
    await AuthModel.invalidateSession(sessionId);
  }

  // -- Format User ----------------------------

  private static formatUser(user: DashboardUserRow): LoginResult["user"] {
    return {
      id:           user.id,
      email:        user.email,
      is_owner:     user.is_owner,
      can_approve:  user.can_approve,
      permissions:  user.permissions ?? {},
      is_high_risk: user.is_high_risk ?? false,
    };
  }

  // -- Create Magic Link Session --------------

  static async createMagicLinkSession(params: {
    userId: number;
    createdBy: number;
    expiresAt: Date;
  }): Promise<{ token: string; otp: string }> {
    const token     = generateSecureToken();
    const otp       = generateOtp();
    const otpHash   = await argon2.hash(otp);
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

    await AuthModel.insertSession({
      userId:       params.userId,
      tokenHash:    token,
      expiresAt:    params.expiresAt,
      otpHash,
      otpExpiresAt: otpExpiry,
      createdBy:    params.createdBy,
      isMagicLink:  true,
    });

    return { token, otp };
  }
}