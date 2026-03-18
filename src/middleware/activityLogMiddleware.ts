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
  extractMeta?: (req: Request) => {
    entityId?: string | null;
    diff?: {
      new: Record<string, unknown> | null;
    } | null;
  };
}

export function logActivity(options: ActivityLogOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const user = req.dashboardUser;
      if (user === undefined) return;

      const meta = (() => {
        try {
          return options.extractMeta !== undefined ? options.extractMeta(req) : {};
        } catch {
          return {};
        }
      })();

      const entityId: string | null = meta.entityId ?? null;
      const diff = meta.diff ?? null;

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
        console.error("[logActivity] failed to write activity log:", error);
      });
    });

    next();
  };
}