import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.ts";

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // authenticate must run before this
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ message: "Admins only" });
    return;
  }

  next();
}
