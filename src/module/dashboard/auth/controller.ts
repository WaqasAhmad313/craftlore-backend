import type { Request, Response } from "express";
import { AuthService } from "./service.ts";
import type { DeviceMetadata } from "./service.ts";

// ============================================
// TYPES
// ============================================

interface VerifyCredentialsBody {
  email: string;
  password: string;
}

interface VerifyAccessKeyBody {
  temp_token: string;
  access_key: string;
}

interface MagicLinkVerifyBody {
  token: string;
  otp: string;
}

// ============================================
// HELPERS
// ============================================

function parseBrowser(ua: string): string {
  if (ua.includes("Edg/"))     return "Edge";
  if (ua.includes("OPR/"))     return "Opera";
  if (ua.includes("Chrome/"))  return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/"))  return "Safari";
  return "Unknown";
}

function parseOs(ua: string): string {
  if (ua.includes("Windows NT")) return "Windows";
  if (ua.includes("Mac OS X"))   return "macOS";
  if (ua.includes("Linux"))      return "Linux";
  if (ua.includes("Android"))    return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Unknown";
}

function cleanIp(ip: string | undefined): string | null {
  if (ip === undefined) return null;
  return ip.replace(/^::ffff:/, "");
}

function extractDeviceMetadata(req: Request): DeviceMetadata {
  const ua = typeof req.headers["user-agent"] === "string"
    ? req.headers["user-agent"]
    : null;

  return {
    browser:    ua !== null ? parseBrowser(ua) : null,
    os:         ua !== null ? parseOs(ua)      : null,
    ip:         cleanIp(req.ip),
    user_agent: ua,
  };
}

function extractFingerprint(req: Request): string | null {
  const raw: unknown = req.headers["x-device-fingerprint"];
  if (typeof raw === "string" && raw.trim() !== "") return raw;
  return null;
}

// ============================================
// AUTH CONTROLLER
// ============================================

export class AuthController {

  // ── POST /dashboard/auth/verify-credentials ─
  // Step 1 — verify email + password only
  // Returns temp_token valid for 5 minutes
  // No cookie set yet

  static async verifyCredentials(req: Request, res: Response): Promise<Response> {
    try {
      const body = req.body as VerifyCredentialsBody;
      const { email, password } = body;

      if (
        typeof email    !== "string" || email.trim()    === "" ||
        typeof password !== "string" || password.trim() === ""
      ) {
        return res
          .status(400)
          .json({ message: "Email and password are required." });
      }

      const result = await AuthService.verifyCredentials({
        email:    email.trim().toLowerCase(),
        password,
      });

      return res.status(200).json({
        message:    "Credentials verified. Please enter your access key.",
        temp_token: result.tempToken,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Verification failed.";
      return res.status(401).json({ message });
    }
  }

  // ── POST /dashboard/auth/login ──────────────
  // Step 2 — verify access key + fingerprint
  // Completes login, sets session cookie

  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const body = req.body as VerifyAccessKeyBody;
      const { temp_token, access_key } = body;

      if (
        typeof temp_token  !== "string" || temp_token.trim()  === "" ||
        typeof access_key  !== "string" || access_key.trim()  === ""
      ) {
        return res
          .status(400)
          .json({ message: "Temp token and access key are required." });
      }

      const fingerprint = extractFingerprint(req);

      if (fingerprint === null) {
        return res
          .status(400)
          .json({ message: "Missing device fingerprint." });
      }

      const result = await AuthService.verifyAccessKey({
        tempToken:       temp_token.trim(),
        accessKey:       access_key.trim(),
        fingerprintHash: fingerprint,
        deviceMetadata:  extractDeviceMetadata(req),
      });

      res.cookie("dashboard_token", result.token, {
        httpOnly: true,
        secure:   process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        expires:  result.expiresAt,
      });

      return res.status(200).json({
        message: "Login successful.",
        user:    result.user,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Login failed.";
      return res.status(401).json({ message });
    }
  }

  // ── GET /dashboard/auth/device/approve/:token

  static async approveDevice(req: Request, res: Response): Promise<Response> {
    try {
      const token = req.params["token"];

      if (typeof token !== "string" || token.trim() === "") {
        return res.status(400).json({ message: "Invalid approval link." });
      }

      await AuthService.approveOwnerDevice(token);

      return res.status(200).json({
        message: "Device approved. You can now log in from this device.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Device approval failed.";
      return res.status(400).json({ message });
    }
  }

  // ── POST /dashboard/auth/magic-link/verify ──

  static async verifyMagicLink(req: Request, res: Response): Promise<Response> {
    try {
      const body = req.body as MagicLinkVerifyBody;
      const { token, otp } = body;

      if (
        typeof token !== "string" || token.trim() === "" ||
        typeof otp   !== "string" || otp.trim()   === ""
      ) {
        return res
          .status(400)
          .json({ message: "Token and OTP are required." });
      }

      const fingerprint = extractFingerprint(req);

      if (fingerprint === null) {
        return res
          .status(400)
          .json({ message: "Missing device fingerprint." });
      }

      const result = await AuthService.verifyMagicLinkOtp({
        tokenHash:       token.trim(),
        otp:             otp.trim(),
        fingerprintHash: fingerprint,
      });

      res.cookie("dashboard_token", result.token, {
        httpOnly: true,
        secure:   process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        expires:  result.expiresAt,
      });

      return res.status(200).json({ message: "Access granted." });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Verification failed.";
      return res.status(401).json({ message });
    }
  }

  // ── GET /dashboard/auth/me ──────────────────

  static async me(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      return res.status(200).json({
        user: {
          id:                 user.id,
          email:              user.email,
          is_owner:           user.is_owner,
          can_approve:        user.can_approve,
          permissions:        user.permissions,
          is_high_risk:       user.is_high_risk,
          session_id:         user.session_id,
          session_expires_at: user.session_expires_at,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch user.";
      return res.status(500).json({ message });
    }
  }

  // ── POST /dashboard/auth/logout ─────────────

  static async logout(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      await AuthService.logout(user.session_id);

      res.clearCookie("dashboard_token", {
        httpOnly: true,
        secure:   process.env["NODE_ENV"] === "production",
        sameSite: "strict",
      });

      return res.status(200).json({ message: "Logged out successfully." });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Logout failed.";
      return res.status(500).json({ message });
    }
  }
}