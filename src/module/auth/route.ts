import { Router } from "express";
import { AuthController } from "./controller.ts";

const router = Router();

router.post("/admin/login", AuthController.adminLogin);
router.post("/signup", AuthController.signup);
router.post("/verify-email", AuthController.verifyEmail);
router.post("/login", AuthController.login);
router.post("/google-login", AuthController.googleLogin);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", AuthController.logout);
router.get("/google", AuthController.googleAuth);
router.get("/google/callback", AuthController.googleCallback);

export default router;
