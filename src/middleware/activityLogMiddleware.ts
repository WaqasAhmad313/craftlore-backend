import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "../config/db.ts";

// ============================================
// TYPES
// ============================================

type LogAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "login"
  | "logout"
  | "role_create"
  | "role_update"
  | "role_delete";

interface ActivityLogOptions {
  module: string;
  action: LogAction;
  // Caller provides entity id and diff if relevant
  // Both optional — login/logout/view don't need them
  extractMeta?: (req: Request) => {
    entityId?: string | null;
    diff?: {
      old: Record<string, unknown> | null;
      new: Record<string, unknown> | null;
    } | null;
  };
}


export function logActivity(options: ActivityLogOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Hook into response finish — runs after handler sends response
    res.on("finish", () => {
      // Only log successful responses
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const user = req.dashboardUser;

      // No user attached means auth failed — already handled upstream
      if (user === undefined) return;

      const meta =
        options.extractMeta !== undefined ? options.extractMeta(req) : {};

      const entityId: string | null = meta.entityId ?? null;
      const diff: ActivityLogOptions["extractMeta"] extends undefined
        ? null
        : unknown = meta.diff ?? null;

      // Fire and forget — do not await, do not block response
      db.query(
        `
        INSERT INTO dashboard.activity_logs
          (user_id, module, action, entity_id, diff, meta)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        `,
        [
          user.id,
          options.module,
          options.action,
          entityId,
          diff !== null ? JSON.stringify(diff) : null,
          JSON.stringify({
            ip:         req.ip ?? null,
            user_agent: req.headers["user-agent"] ?? null,
          }),
        ]
      ).catch((error: unknown) => {
        // Log error but never crash the app over a log write
        console.error("[logActivity] failed to write activity log:", error);
      });
    });

    next();
  };
}