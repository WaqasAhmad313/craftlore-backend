import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "../config/db.ts";

type PendingOperation = "create" | "update" | "delete";

interface PendingInterceptOptions {
  module: string;
  operation: PendingOperation;
  extractPayload: (req: Request) => Promise<{
    entityId: string | null;
    payload: {
      old: Record<string, unknown> | null;
      new: Record<string, unknown> | null;
    };
  }>;
}


export function pendingInterceptor(
  options: PendingInterceptOptions
): RequestHandler {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.dashboardUser;

      if (user === undefined) {
        res.status(401).json({ message: "Unauthorized. No session attached." });
        return;
      }

      // Not high risk — let request through to actual handler
      if (!user.is_high_risk) {
        next();
        return;
      }

      // High risk — intercept and store in pending_changes
      const { entityId, payload } = await options.extractPayload(req);

      await db.query(
        `
        INSERT INTO dashboard.pending_changes
          (user_id, module, operation, entity_id, payload, status)
        VALUES
          ($1, $2, $3, $4, $5, 'pending')
        `,
        [
          user.id,
          options.module,
          options.operation,
          entityId,
          JSON.stringify(payload),
        ]
      );

      // Log the interception
      await db.query(
        `
        INSERT INTO dashboard.activity_logs
          (user_id, module, action, entity_id, diff, meta)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        `,
        [
          user.id,
          options.module,
          `${options.operation}_pending`,
          entityId,
          JSON.stringify({ old: payload.old, new: payload.new }),
          JSON.stringify({
            ip: req.ip ?? null,
            user_agent: req.headers["user-agent"] ?? null,
          }),
        ]
      );

      res.status(202).json({
        message: "Change submitted for review. You will be notified once approved.",
      });
    } catch (error) {
      console.error("[pendingInterceptor] error:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  };
}