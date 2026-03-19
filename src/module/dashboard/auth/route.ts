import { Router } from "express";
import { AuthController } from "./controller.ts";
import { authMiddleware } from "../../../middleware/authMiddleware.ts";
import { logActivity } from "../../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── POST /dashboard/auth/verify-credentials ────────────────
// Step 1 — email + password only
// No authMiddleware — not logged in yet
router.post(
  "/verify-credentials",
  AuthController.verifyCredentials
);

// ── POST /dashboard/auth/login ──────────────────────────────
// Step 2 — temp_token + access_key + fingerprint
// Completes login, sets cookie
// No authMiddleware — completing login flow
router.post(
  "/login",
  AuthController.login
);

// ── GET /dashboard/auth/device/approve/:token ───────────────
// Owner clicks email link to approve new device
// No authMiddleware — owner may not have a session yet
router.get(
  "/device/approve/:token",
  AuthController.approveDevice
);

// ── POST /dashboard/auth/magic-link/verify ──────────────────
// Created user verifies OTP from magic link
// No authMiddleware — user has no session yet
router.post(
  "/magic-link/verify",
  AuthController.verifyMagicLink
);

// ── GET /dashboard/auth/me ──────────────────────────────────
// Requires active session — used on app mount to verify session
router.get(
  "/me",
  authMiddleware,
  AuthController.me
);

// ── POST /dashboard/auth/logout ─────────────────────────────
// Requires active session
router.post(
  "/logout",
  authMiddleware,
  logActivity({ module: "auth", action: "logout" }),
  AuthController.logout
);

export default router;