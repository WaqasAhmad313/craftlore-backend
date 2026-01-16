import type { Request, Response } from "express";
import { AuthService, type SignupData, type LoginData } from "./service.ts";
import { logger } from "../../util/logger.ts";

export class AuthController {
  /* -----------------------------
     Signup with Email
  ----------------------------- */
  static async signup(req: Request, res: Response) {
    try {
      const data: SignupData = req.body;
      if (!data.name || !data.email || !data.password) {
        return res.status(400).json({ error: "Name, email and password are required" });
      }

      const user = await AuthService.signupWithEmail(data);
      return res.status(201).json({
        message: "User created. Verification code sent to email.",
        userId: user.id,
      });
    } catch (error: any) {
      logger.error("AuthController.signup failed", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  /* -----------------------------
     Verify Email Code
  ----------------------------- */
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        return res.status(400).json({ error: "userId and code are required" });
      }

      await AuthService.verifyEmail(userId, code);
      return res.status(200).json({ message: "Email verified successfully" });
    } catch (error: any) {
      logger.error("AuthController.verifyEmail failed", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  /* -----------------------------
     Login with Email
  ----------------------------- */
  static async login(req: Request, res: Response) {
    try {
      const data: LoginData = req.body;
      if (!data.email || !data.password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const tokens = await AuthService.loginWithEmail(data);
      return res.status(200).json(tokens);
    } catch (error: any) {
      logger.error("AuthController.login failed", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  /* -----------------------------
     Google Login
  ----------------------------- */
  static async googleLogin(req: Request, res: Response) {
    try {
      const { googleId, email, name } = req.body;
      if (!googleId || !name) {
        return res.status(400).json({ error: "googleId and name are required" });
      }

      const tokens = await AuthService.loginWithGoogle(googleId, name, email);
      return res.status(200).json(tokens);
    } catch (error: any) {
      logger.error("AuthController.googleLogin failed", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  /* -----------------------------
     Refresh Token
  ----------------------------- */
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });

      const tokens = await AuthService.refreshToken(refreshToken);
      return res.status(200).json(tokens);
    } catch (error: any) {
      logger.error("AuthController.refreshToken failed", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  /* -----------------------------
     Logout
  ----------------------------- */
  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });

      await AuthService.logout(refreshToken);
      return res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
      logger.error("AuthController.logout failed", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  // Add these methods to your AuthController class in controller.ts

/* -----------------------------
   Google OAuth - Initiate
----------------------------- */
static async googleAuth(req: Request, res: Response) {
  try {
    const authUrl = AuthService.getGoogleAuthUrl();
    return res.redirect(authUrl);
  } catch (error: any) {
    logger.error("AuthController.googleAuth failed", { error: error.message });
    return res.status(500).json({ error: "Failed to initiate Google authentication" });
  }
}

/* -----------------------------
   Google OAuth - Callback (Secure with HTTP-only cookies)
----------------------------- */
static async googleCallback(req: Request, res: Response) {
  try {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    const result = await AuthService.handleGoogleCallback(code);

    // Set HTTP-only cookies for tokens
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    // Also set user data in a cookie (this one can be read by frontend)
    res.cookie('user', JSON.stringify(result.user), {
      httpOnly: false, // Frontend needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    // Redirect to frontend success page (no tokens in URL!)
    const frontendUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/callback`;
    
    return res.redirect(frontendUrl);
  } catch (error: any) {
    logger.error("AuthController.googleCallback failed", { error: error.message });
    
    // Redirect to frontend with error
    const frontendUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/callback?error=${encodeURIComponent(error.message)}`;
    return res.redirect(frontendUrl);
  }
}
}
