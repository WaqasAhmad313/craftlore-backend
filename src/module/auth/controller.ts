import type { Request, Response } from "express";
import { AuthService, type SignupData, type LoginData } from "./service.ts";
import { logger } from "../../util/logger.ts";
import { setAuthCookies, clearAuthCookies } from "../../util/token.ts";

export class AuthController {
  static async signup(req: Request, res: Response) {
    try {
      const data: SignupData = req.body;
      if (!data.name || !data.email || !data.password) {
        return res
          .status(400)
          .json({ error: "Name, email and password are required" });
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

  static async adminLogin(req: Request, res: Response) {
    try {
      const data: LoginData = req.body;

      if (!data.email || !data.password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const tokens = await AuthService.loginAdmin(data);

      // ✅ cookie-based auth
      setAuthCookies(res, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      // optional: readable user cookie (your googleCallback already does this pattern)
      res.cookie("user", JSON.stringify(tokens.user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return res.status(200).json({ user: tokens.user });
    } catch (error: any) {
      logger.error("AuthController.adminLogin failed", {
        error: error.message,
      });
      return res.status(401).json({ error: "Invalid admin credentials" });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        return res.status(400).json({ error: "userId and code are required" });
      }

      await AuthService.verifyEmail(userId, code);
      return res.status(200).json({ message: "Email verified successfully" });
    } catch (error: any) {
      logger.error("AuthController.verifyEmail failed", {
        error: error.message,
      });
      return res.status(400).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data: LoginData = req.body;
      if (!data.email || !data.password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const tokens = await AuthService.loginWithEmail(data);

      // ✅ cookie-based auth
      setAuthCookies(res, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      res.cookie("user", JSON.stringify(tokens.user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return res.status(200).json({ user: tokens.user });
    } catch (error: any) {
      logger.error("AuthController.login failed", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  static async googleLogin(req: Request, res: Response) {
    try {
      const { googleId, email, name } = req.body;
      if (!googleId || !name) {
        return res
          .status(400)
          .json({ error: "googleId and name are required" });
      }

      const tokens = await AuthService.loginWithGoogle(googleId, name, email);

      // ✅ cookie-based auth
      setAuthCookies(res, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      res.cookie("user", JSON.stringify(tokens.user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return res.status(200).json({ user: tokens.user });
    } catch (error: any) {
      logger.error("AuthController.googleLogin failed", {
        error: error.message,
      });
      return res.status(400).json({ error: error.message });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const cookies = (req as any).cookies as Record<string, string> | undefined;

      // ✅ cookie-first (httpOnly refresh token), body fallback to avoid breaking old clients
      const refreshToken = cookies?.refreshToken ?? req.body?.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
      }

      const tokens = await AuthService.refreshToken(refreshToken);

      setAuthCookies(res, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      return res.status(200).json({ ok: true });
    } catch (error: any) {
      logger.error("AuthController.refreshToken failed", {
        error: error.message,
      });
      return res.status(400).json({ error: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const cookies = (req as any).cookies as Record<string, string> | undefined;

      // ✅ cookie-first, body fallback
      const refreshToken = cookies?.refreshToken ?? req.body?.refreshToken;

      if (!refreshToken) {
        // still clear cookies even if missing, to avoid stuck client state
        clearAuthCookies(res);
        res.clearCookie("user", { path: "/" });
        return res.status(200).json({ message: "Logged out successfully" });
      }

      await AuthService.logout(refreshToken);

      clearAuthCookies(res);
      res.clearCookie("user", { path: "/" });

      return res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
      logger.error("AuthController.logout failed", { error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }

  static async googleAuth(req: Request, res: Response) {
    try {
      const authUrl = AuthService.getGoogleAuthUrl();
      return res.redirect(authUrl);
    } catch (error: any) {
      logger.error("AuthController.googleAuth failed", {
        error: error.message,
      });
      return res
        .status(500)
        .json({ error: "Failed to initiate Google authentication" });
    }
  }

  /* -----------------------------
     Google OAuth - Callback (HTTP-only cookies)
  ----------------------------- */
  static async googleCallback(req: Request, res: Response) {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Authorization code is required" });
      }

      const result = await AuthService.handleGoogleCallback(code);

      // ✅ cookie-based auth (centralized options)
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      res.cookie("user", JSON.stringify(result.user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      const frontendUrl = `${process.env.FRONTEND_URL}/auth/callback`;
      return res.redirect(frontendUrl);
    } catch (error: any) {
      logger.error("AuthController.googleCallback failed", {
        error: error.message,
      });

      const frontendUrl = `${process.env.FRONTEND_URL}/auth/callback?error=${encodeURIComponent(error.message)}`;
      return res.redirect(frontendUrl);
    }
  }
}
