import { Router } from "express";
import { AuthController } from "./controller.ts";
import { authenticate } from "../../middleware/auth.ts";
import { requireAdmin } from "../../middleware/requireAdmin.ts";

const router = Router();

// Admin login (public)
router.post("/admin/login", AuthController.adminLogin);

// Signup with email
router.post("/signup", AuthController.signup);

// Verify email code
router.post("/verify-email", AuthController.verifyEmail);

// Login with email
router.post("/login", AuthController.login);

// Google login
router.post("/google-login", AuthController.googleLogin);

// Refresh token
router.post("/refresh-token", AuthController.refreshToken);

// Logout
router.post("/logout", AuthController.logout);

// Initiate Google OAuth - redirects user to Google
router.get("/google", AuthController.googleAuth);

// Google OAuth callback - handles response from Google
router.get("/google/callback", AuthController.googleCallback);

// Admin dashboard (protected)
router.get(
  "/admin/dashboard",
  authenticate,      // check JWT
  requireAdmin,      // check role
  (req, res) => {
    res.status(200).json({ message: "Welcome Admin!"});
  }
);


export default router;
