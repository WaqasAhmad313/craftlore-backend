import { Router } from "express";
import { AuthController } from "./controller.ts";
import { authMiddleware } from "../../../middleware/authMiddleware.ts";
import { logActivity } from "../../../middleware/activityLogMiddleware.ts";

const router = Router();

// ── POST /dashboard/auth/login ──────────────────────────────
// Owner login — no authMiddleware (not logged in yet)
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

// ── POST /dashboard/auth/logout ─────────────────────────────
// Requires active session
router.post(
  "/logout",
  authMiddleware,
  logActivity({ module: "auth", action: "logout" }),
  AuthController.logout
);

export default router;