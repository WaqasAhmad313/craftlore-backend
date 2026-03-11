import type { Request, Response } from "express";
import { ActivityLogsService } from "./service.ts";

// ============================================
// ACTIVITY LOGS CONTROLLER
// ============================================

export class ActivityLogsController {
  // ── GET /dashboard/logs ─────────────────────

  static async listLogs(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      const allowedModules = Object.keys(user.permissions).filter(
        (mod) => user.permissions[mod]?.["view"] === true
      );

      // Parse query params
      const rawModule   = req.query["module"];
      const rawAction   = req.query["action"];
      const rawUserId   = req.query["user_id"];
      const rawEntityId = req.query["entity_id"];
      const rawDateFrom = req.query["date_from"];
      const rawDateTo   = req.query["date_to"];
      const rawPage     = req.query["page"];
      const rawPageSize = req.query["page_size"];

      const module =
        typeof rawModule === "string" && rawModule.trim() !== ""
          ? rawModule.trim()
          : null;

      const action =
        typeof rawAction === "string" && rawAction.trim() !== ""
          ? rawAction.trim()
          : null;

      const userId =
        typeof rawUserId === "string" && rawUserId.trim() !== ""
          ? parseInt(rawUserId, 10)
          : null;

      const entityId =
        typeof rawEntityId === "string" && rawEntityId.trim() !== ""
          ? rawEntityId.trim()
          : null;

      const dateFrom =
        typeof rawDateFrom === "string" && rawDateFrom.trim() !== ""
          ? rawDateFrom.trim()
          : null;

      const dateTo =
        typeof rawDateTo === "string" && rawDateTo.trim() !== ""
          ? rawDateTo.trim()
          : null;

      const page =
        typeof rawPage === "string" ? parseInt(rawPage, 10) : 1;

      const pageSize =
        typeof rawPageSize === "string" ? parseInt(rawPageSize, 10) : 50;

      const result = await ActivityLogsService.listLogs({
        isOwner:        user.is_owner,
        allowedModules,
        module,
        action,
        userId:         isNaN(userId ?? NaN) ? null : userId,
        entityId,
        dateFrom,
        dateTo,
        page:           isNaN(page)     ? 1  : page,
        pageSize:       isNaN(pageSize) ? 50 : pageSize,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch logs.";
      return res.status(500).json({ message });
    }
  }

  // ── GET /dashboard/logs/entity/:entityId ────

  static async getEntityHistory(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      const entityId = req.params["entityId"];

      if (typeof entityId !== "string" || entityId.trim() === "") {
        return res.status(400).json({ message: "Invalid entity id." });
      }

      const allowedModules = Object.keys(user.permissions).filter(
        (mod) => user.permissions[mod]?.["view"] === true
      );

      const rawModule = req.query["module"];
      const module =
        typeof rawModule === "string" && rawModule.trim() !== ""
          ? rawModule.trim()
          : null;

      const logs = await ActivityLogsService.getEntityHistory(
        entityId.trim(),
        module,
        user.is_owner,
        allowedModules
      );

      return res.status(200).json({ logs });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch entity history.";
      return res.status(500).json({ message });
    }
  }
}