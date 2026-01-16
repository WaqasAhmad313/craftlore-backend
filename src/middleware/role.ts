import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.ts";

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ message: "Forbidden" });
    return; 
  }

  next();
};
