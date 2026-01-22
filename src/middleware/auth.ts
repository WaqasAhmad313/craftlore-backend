// import type { Request, Response, NextFunction } from "express";
// import { verifyAccessToken } from "../util/token.ts";

// export interface AuthenticatedRequest extends Request {
//   user?: {
//     id: string;
//     role: "user" | "admin";
//   };
// }

// export function authenticate(
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ): void {
//   const authHeader = req.headers.authorization;

//   // 📝 Log incoming request
//   console.log('🔐 [AUTH] Incoming request:', {
//     path: req.path,
//     method: req.method,
//     hasAuthHeader: !!authHeader,
//   });

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     console.error('❌ [AUTH] No Bearer token found');
//     res.status(401).json({ 
//       success: false,
//       message: "Unauthorized - No token provided" 
//     });
//     return;
//   }

//   const token = authHeader.split(" ")[1];

//   if (!token) {
//     console.error('❌ [AUTH] Token is empty after split');
//     res.status(401).json({ 
//       success: false,
//       message: "Unauthorized - Empty token" 
//     });
//     return;
//   }

//   console.log('🔑 [AUTH] Token extracted:', {
//     tokenLength: token.length,
//     tokenPreview: token.substring(0, 30) + '...'
//   });

//   try {
//     // Verify token and get payload
//     const payload = verifyAccessToken(token);
    
//     // 📝 CRITICAL: Log the payload to see what we got
//     console.log('✅ [AUTH] Token verified successfully');
//     console.log('📋 [AUTH] Payload:', {
//       sub: payload.sub,
//       role: payload.role,
//       hasSubField: 'sub' in payload,
//       subType: typeof payload.sub,
//       subValue: payload.sub,
//       subLength: payload.sub?.length
//     });

//     // ✅ CRITICAL CHECK: Ensure payload.sub exists and is not empty
//     if (!payload.sub || payload.sub.trim() === '') {
//       console.error('❌ [AUTH] payload.sub is missing or empty!', {
//         sub: payload.sub,
//         fullPayload: payload
//       });
//       res.status(401).json({ 
//         success: false,
//         message: "Invalid token - missing or empty user ID" 
//       });
//       return;
//     }

//     // Set req.user with the user ID from 'sub' claim
//     req.user = { 
//       id: payload.sub, 
//       role: payload.role 
//     };

//     console.log('✅ [AUTH] req.user set successfully:', {
//       userId: req.user.id,
//       userIdLength: req.user.id.length,
//       role: req.user.role
//     });
//     console.log('---'); // Separator for readability

//     next();
//   } catch (error) {
//     console.error('❌ [AUTH] Token verification failed:', {
//       error: error instanceof Error ? error.message : 'Unknown error',
//       errorName: error?.constructor?.name,
//       errorStack: error instanceof Error ? error.stack : undefined
//     });
//     res.status(401).json({ 
//       success: false,
//       message: "Invalid or expired token" 
//     });
//   }
// }






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