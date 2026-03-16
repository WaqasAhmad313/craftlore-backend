import type { Request, Response } from "express";
import { AuthService } from "./service.ts";
import type { DeviceMetadata } from "./service.ts";

// ============================================
// TYPES
// ============================================

interface LoginBody {
  email: string;
  password: string;
  access_key: string;
}

interface MagicLinkVerifyBody {
  token: string;
  otp: string;
}

// ============================================
// HELPERS
// ============================================

function extractDeviceMetadata(req: Request): DeviceMetadata {
  return {
    browser:    null,
    os:         null,
    ip:         req.ip ?? null,
    user_agent: typeof req.headers["user-agent"] === "string"
      ? req.headers["user-agent"]
      : null,
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
  // ── POST /dashboard/auth/login ──────────────

  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const body = req.body as LoginBody;

      const { email, password, access_key } = body;

      if (
        typeof email      !== "string" || email.trim()      === "" ||
        typeof password   !== "string" || password.trim()   === "" ||
        typeof access_key !== "string" || access_key.trim() === ""
      ) {
        return res
          .status(400)
          .json({ message: "Email, password and access key are required." });
      }

      const fingerprint = extractFingerprint(req);

      if (fingerprint === null) {
        return res
          .status(400)
          .json({ message: "Missing device fingerprint." });
      }

      const result = await AuthService.ownerLogin({
        email:           email.trim().toLowerCase(),
        password,
        accessKey:       access_key,
        fingerprintHash: fingerprint,
        deviceMetadata:  extractDeviceMetadata(req),
      });

      // Set httpOnly cookie
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

      // Set httpOnly cookie with remaining session duration
      res.cookie("dashboard_token", result.token, {
        httpOnly: true,
        secure:   process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        expires:  result.expiresAt,
      });

      return res.status(200).json({
        message: "Access granted.",
      });
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