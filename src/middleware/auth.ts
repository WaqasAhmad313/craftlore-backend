import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../util/token.ts";

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
  const authHeader = req.headers.authorization;

  console.log('🔐 Auth middleware:', {
    hasAuthHeader: !!authHeader,
    authHeader: authHeader?.substring(0, 20) + '...'
  });

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error('❌ No Bearer token');
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    console.error('❌ Token is empty');
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  console.log('🔑 Verifying token...');

  try {
    // ✅ FIX: verifyAccessToken returns { sub: string, role: string }
    const payload = verifyAccessToken(token);
    
    console.log('✅ Token decoded:', {
      sub: payload.sub,           // ← This is the user ID!
      role: payload.role,
      fullPayload: payload
    });

    // ✅ CRITICAL FIX: Use payload.sub (not payload.id)
    if (!payload.sub) {
      console.error('❌ payload.sub is missing!');
      res.status(401).json({ message: "Invalid token - missing user ID" });
      return;
    }

    // ✅ Set req.user with id from 'sub' claim
    req.user = { 
      id: payload.sub,    // ← Use payload.sub (the user ID from JWT)
      role: payload.role 
    };

    console.log('✅ req.user set:', {
      id: req.user.id,
      role: req.user.role
    });

    next();
  } catch (error) {
    console.error('❌ Token verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(401).json({ message: "Invalid or expired token" });
  }
}