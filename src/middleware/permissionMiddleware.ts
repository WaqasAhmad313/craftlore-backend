import type { Request, Response, NextFunction, RequestHandler } from "express";
// DashboardUser type is declared globally via authMiddleware.ts augmentation

// ============================================
// TYPES
// ============================================

type PermissionAction = "view" | "create" | "update" | "delete";

// ============================================
// PERMISSION MIDDLEWARE FACTORY
// Usage:
//   router.get("/cktre", authMiddleware, requirePermission("cktre", "view"), handler)
//   router.post("/cktre", authMiddleware, requirePermission("cktre", "create"), handler)
// ============================================

export function requirePermission(
  module: string,
  action: PermissionAction
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.dashboardUser;

    // Should never happen if authMiddleware runs first
    // but strict mode requires explicit guard
    if (user === undefined) {
      res.status(401).json({ message: "Unauthorized. No session attached." });
      return;
    }

    // Owner bypasses all permission checks
    if (user.is_owner) {
      next();
      return;
    }

    // Check if role has this module at all
    const modulePerms: Record<string, boolean> | undefined =
      user.permissions[module];

    if (modulePerms === undefined) {
      res.status(403).json({
        message: `Access denied. You do not have access to module: ${module}.`,
      });
      return;
    }

    // Check specific action
    const allowed: boolean = modulePerms[action] === true;

    if (!allowed) {
      res.status(403).json({
        message: `Access denied. You cannot perform '${action}' on module: ${module}.`,
      });
      return;
    }

    next();
  };
}

// ============================================
// OWNER ONLY MIDDLEWARE
// Usage:
//   router.post("/roles", authMiddleware, requireOwner, handler)
// ============================================

export function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = req.dashboardUser;

  if (user === undefined) {
    res.status(401).json({ message: "Unauthorized. No session attached." });
    return;
  }

  if (!user.is_owner) {
    res.status(403).json({ message: "Access denied. Owner only." });
    return;
  }

  next();
}

// ============================================
// APPROVER MIDDLEWARE
// Checks:
//   1. can_approve = true
//   2. User has view access to the module
//      (approval scope is derived from module access)
// Usage:
//   router.patch("/pending/:id/approve", authMiddleware, requireApprover("cktre"), handler)
// ============================================

export function requireApprover(module: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.dashboardUser;

    if (user === undefined) {
      res.status(401).json({ message: "Unauthorized. No session attached." });
      return;
    }

    // Owner can always approve
    if (user.is_owner) {
      next();
      return;
    }

    if (!user.can_approve) {
      res.status(403).json({ message: "Access denied. Approval permission required." });
      return;
    }

    // Wildcard "*" — just check can_approve is true
    // Actual module scope is enforced inside the service layer
    if (module === "*") {
      next();
      return;
    }

    // Specific module — user must have view access to it
    const modulePerms: Record<string, boolean> | undefined =
      user.permissions[module];

    if (modulePerms === undefined || modulePerms["view"] !== true) {
      res.status(403).json({
        message: `Access denied. You cannot approve changes for module: ${module}.`,
      });
      return;
    }

    next();
  };
}