import type { Response, NextFunction } from "express";
import { verifyAccessToken } from "../util/token.ts";
import type { AuthenticatedRequest } from "./auth.ts";

/**
 * Optional authentication middleware
 * If token is provided, verify and attach user to req
 * If no token, continue without user (req.user will be undefined)
 */
export function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  // No auth header - continue without user
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("🔓 [OPTIONAL AUTH] No token provided - continuing as anonymous");
    next();
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    console.log("🔓 [OPTIONAL AUTH] Empty token - continuing as anonymous");
    next();
    return;
  }

  try {
    // Try to verify token
    const payload = verifyAccessToken(token);

    if (payload.sub) {
      // Valid token - attach user
      req.user = {
        id: payload.sub,
        role: payload.role,
      };
      console.log("✅ [OPTIONAL AUTH] Token verified:", {
        id: req.user.id,
        role: req.user.role,
      });
    }

    next();
  } catch (error) {
    // Invalid token - continue without user (don't block the request)
    console.log("⚠️ [OPTIONAL AUTH] Invalid token - continuing as anonymous:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    next();
  }
}