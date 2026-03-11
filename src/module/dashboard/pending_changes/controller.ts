import type { Request, Response } from "express";
import { PendingService } from "./service.ts";
import type { PendingStatus } from "./model.ts";

// ============================================
// TYPES
// ============================================

interface ResolveBody {
  review_note: string | null;
}

// ============================================
// PENDING CONTROLLER
// ============================================

export class PendingController {
  // ── GET /dashboard/pending ──────────────────
  // Approver sees pending changes for modules they have access to

  static async listPending(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      // Derive allowed modules from user permissions
      const allowedModules = Object.keys(user.permissions).filter(
        (mod) => user.permissions[mod]?.["view"] === true
      );

      // Optional filters from query
      const rawStatus = req.query["status"];
      const status: PendingStatus | "all" =
        rawStatus === "pending"  ||
        rawStatus === "approved" ||
        rawStatus === "rejected"
          ? rawStatus
          : "all";

      const rawModule = req.query["module"];
      const module    =
        typeof rawModule === "string" && rawModule.trim() !== ""
          ? rawModule.trim()
          : null;

      const changes = await PendingService.listPending({
        status,
        module,
        allowedModules,
      });

      return res.status(200).json({ changes });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch pending changes.";
      return res.status(500).json({ message });
    }
  }

  // ── GET /dashboard/pending/mine ─────────────
  // Current user sees their own submitted changes

  static async listMyPending(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      const changes = await PendingService.listMyPending(user.id);

      return res.status(200).json({ changes });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch your pending changes.";
      return res.status(500).json({ message });
    }
  }

  // ── PATCH /dashboard/pending/:id/approve ────

  static async approve(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      const pendingId = parseInt(req.params["id"] ?? "", 10);

      if (isNaN(pendingId)) {
        return res.status(400).json({ message: "Invalid pending change id." });
      }

      const body       = req.body as ResolveBody;
      const reviewNote =
        typeof body.review_note === "string" ? body.review_note : null;

      await PendingService.approve({
        pendingId,
        reviewedBy: user.id,
        action:     "approved",
        reviewNote,
      });

      return res.status(200).json({ message: "Change approved and applied." });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to approve change.";
      return res.status(400).json({ message });
    }
  }

  // ── PATCH /dashboard/pending/:id/reject ─────

  static async reject(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      const pendingId = parseInt(req.params["id"] ?? "", 10);

      if (isNaN(pendingId)) {
        return res.status(400).json({ message: "Invalid pending change id." });
      }

      const body       = req.body as ResolveBody;
      const reviewNote =
        typeof body.review_note === "string" ? body.review_note : null;

      await PendingService.reject({
        pendingId,
        reviewedBy: user.id,
        action:     "rejected",
        reviewNote,
      });

      return res.status(200).json({ message: "Change rejected." });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to reject change.";
      return res.status(400).json({ message });
    }
  }
}