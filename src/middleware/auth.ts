import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AUTH_COOKIE } from "../util/token.ts";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: "user" | "admin";
  };
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
  const token = cookies?.[AUTH_COOKIE.access];

  console.log("🔐 Auth middleware (cookie-only):", {
    hasAccessCookie: !!token,
    cookieName: AUTH_COOKIE.access,
  });

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    if (!payload.sub) {
      res.status(401).json({ message: "Invalid token - missing user ID" });
      return;
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    next();
  } catch (error) {
    console.error("❌ Token verification failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
