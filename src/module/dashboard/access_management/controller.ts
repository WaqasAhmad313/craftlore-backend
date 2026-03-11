import type { Request, Response } from "express";
import { AccessService } from "./service.ts";

// ============================================
// TYPES
// ============================================

interface CreateAccessBody {
  email: string;
  role_id: number;
  can_approve: boolean;
  name: string;
  duration_ms: number;
}

interface ResolveExtensionBody {
  action: "approved" | "rejected";
  extension_ms: number | null;
}

interface ToggleActiveBody {
  is_active: boolean;
}

// ============================================
// ACCESS CONTROLLER
// ============================================

export class AccessController {
  // ── POST /dashboard/access/create ──────────

  static async createAccess(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      const body = req.body as CreateAccessBody;

      const { email, role_id, can_approve, name, duration_ms } = body;

      if (
        typeof email       !== "string"  || email.trim()  === ""  ||
        typeof name        !== "string"  || name.trim()   === ""  ||
        typeof role_id     !== "number"  ||
        typeof can_approve !== "boolean" ||
        typeof duration_ms !== "number"  || duration_ms   <= 0
      ) {
        return res.status(400).json({
          message: "email, name, role_id, can_approve and duration_ms are required.",
        });
      }

      await AccessService.createAccess({
        email,
        roleId:     role_id,
        canApprove: can_approve,
        name:       name.trim(),
        durationMs: duration_ms,
        createdBy:  user.id,
      });

      return res.status(201).json({
        message: "Access created. An email has been sent to the user.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create access.";
      return res.status(400).json({ message });
    }
  }

  // ── GET /dashboard/access/list ──────────────

  static async listUsers(req: Request, res: Response): Promise<Response> {
    try {
      const users = await AccessService.listUsers();
      return res.status(200).json({ users });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch users.";
      return res.status(500).json({ message });
    }
  }

  // ── PATCH /dashboard/access/:id/revoke ──────

  static async revokeAccess(req: Request, res: Response): Promise<Response> {
    try {
      const userId = parseInt(req.params["id"] ?? "", 10);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user id." });
      }

      await AccessService.revokeAccess(userId);

      return res.status(200).json({ message: "Access revoked." });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke access.";
      return res.status(400).json({ message });
    }
  }

  // ── PATCH /dashboard/access/:id/toggle ──────

  static async toggleActive(req: Request, res: Response): Promise<Response> {
    try {
      const userId = parseInt(req.params["id"] ?? "", 10);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user id." });
      }

      const body = req.body as ToggleActiveBody;

      if (typeof body.is_active !== "boolean") {
        return res.status(400).json({ message: "is_active (boolean) is required." });
      }

      await AccessService.toggleUserActive(userId, body.is_active);

      return res.status(200).json({
        message: `User ${body.is_active ? "activated" : "deactivated"}.`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update user.";
      return res.status(400).json({ message });
    }
  }

  // ── GET /dashboard/access/extension-requests

  static async listExtensionRequests(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const rawStatus = req.query["status"];
      const status =
        rawStatus === "pending"  ||
        rawStatus === "approved" ||
        rawStatus === "rejected"
          ? rawStatus
          : "all";

      const requests = await AccessService.listExtensionRequests(status);

      return res.status(200).json({ requests });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch extension requests.";
      return res.status(500).json({ message });
    }
  }

  // ── PATCH /dashboard/access/extension-requests/:id

  static async resolveExtensionRequest(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      const requestId = parseInt(req.params["id"] ?? "", 10);

      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid request id." });
      }

      const body = req.body as ResolveExtensionBody;

      if (
        body.action !== "approved" &&
        body.action !== "rejected"
      ) {
        return res.status(400).json({
          message: "action must be 'approved' or 'rejected'.",
        });
      }

      if (
        body.action === "approved" &&
        (typeof body.extension_ms !== "number" || body.extension_ms <= 0)
      ) {
        return res.status(400).json({
          message: "extension_ms (number) is required when approving.",
        });
      }

      await AccessService.resolveExtensionRequest({
        requestId,
        reviewedBy:  user.id,
        action:      body.action,
        extensionMs: body.extension_ms,
      });

      return res.status(200).json({
        message: `Extension request ${body.action}.`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to resolve extension request.";
      return res.status(400).json({ message });
    }
  }
}