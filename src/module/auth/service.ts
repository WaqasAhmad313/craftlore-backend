import {
  UserModel,
  RefreshTokenModel,
  EmailVerificationModel,
  type User,
} from "./model.ts";
import { logger } from "../../util/logger.ts";
import { Mailer } from "../../util/mailer.ts";
import { generateAccessToken, generateRefreshToken } from "../../util/token.ts";
import {
  hashPassword,
  comparePassword,
  hashCode,
  compareHash,
} from "../../util/password.ts";
import { env } from "../../config/env.ts";

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  private static CODE_EXPIRY_MINUTES = 10; // code valid for 10 minutes

  /* -------------------------
     Email Signup
  ------------------------- */
  static async signupWithEmail(data: SignupData): Promise<User> {
    // check if user exists
    const existing = await UserModel.findByEmail(data.email);
    if (existing) {
      throw new Error("Email already registered");
    }

    // hash password
    const passwordHash = await hashPassword(data.password);

    // create user with email_verified=false
    const user = await UserModel.create({
      name: data.name,
      email: data.email,
      password_hash: passwordHash,
      email_verified: false,
      role: "user",
    });

    // generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const codeHash = await hashCode(code);
    const expiresAt = new Date(
      Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000
    );

    // save code in DB
    await EmailVerificationModel.create(user.id, codeHash, expiresAt);

    // send email
    try {
      await Mailer.sendEmailVerification(user.email!, code, user.name);
    } catch (err) {
      logger.error("AuthService: Failed to send verification email", {
        userId: user.id,
      });
      throw new Error("Unable to send verification email");
    }

    return user;
  }

  /* -------------------------
     Verify Email Code
  ------------------------- */
  static async verifyEmail(userId: string, code: string): Promise<boolean> {
    const record = await EmailVerificationModel.findLatest(userId);
    if (!record) throw new Error("No verification code found");

    const isValid = await compareHash(code, record.code_hash);
    if (!isValid) throw new Error("Invalid verification code");

    if (record.expires_at.getTime() < Date.now())
      throw new Error("Code expired");

    // mark user as verified
    await UserModel.update(userId, { email_verified: true });

    // remove all verification codes for this user
    await EmailVerificationModel.deleteByUser(userId);

    return true;
  }

  /* -------------------------
     Login with Email
  ------------------------- */
  static async loginWithEmail(
    data: LoginData
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await UserModel.findByEmail(data.email);
    if (!user) throw new Error("User not found");
    if (!user.password_hash) throw new Error("User has no password set");
    if (!user.email_verified) throw new Error("Email not verified");

    const match = await comparePassword(data.password, user.password_hash);
    if (!match) throw new Error("Incorrect password");

    const accessToken = generateAccessToken({ sub: user.id, role: user.role });
    const refreshTokenStr = generateRefreshToken({ sub: user.id });
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await RefreshTokenModel.create(user.id, refreshTokenStr, refreshExpires);

    return { user, accessToken, refreshToken: refreshTokenStr };
  }

  /* -------------------------
     Login / Signup with Google
  ------------------------- */
  static async loginWithGoogle(
    googleId: string,
    name: string,
    email?: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    let user = await UserModel.findByGoogleId(googleId);

    if (!user) {
      // new user
      user = await UserModel.create({
        name,
        email: email ?? null, // <-- ensure it's string | null
        google_id: googleId,
        email_verified: true,
        role: "user",
      });
    }

    const accessToken = generateAccessToken({ sub: user.id, role: user.role });
    const refreshTokenStr = generateRefreshToken({ sub: user.id });
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshTokenModel.create(user.id, refreshTokenStr, refreshExpires);

    return { user, accessToken, refreshToken: refreshTokenStr };
  }

  /* -------------------------
     Refresh Token
  ------------------------- */
  static async refreshToken(
    oldToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenRecord = await RefreshTokenModel.find(oldToken);
    if (!tokenRecord) throw new Error("Invalid refresh token");

    const user = await UserModel.findById(tokenRecord.user_id);
    if (!user) throw new Error("User not found");

    // delete old refresh token
    await RefreshTokenModel.delete(oldToken);

    // create new tokens
    const accessToken = generateAccessToken({ sub: user.id, role: user.role });
    const refreshTokenStr = generateRefreshToken({ sub: user.id });
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshTokenModel.create(user.id, refreshTokenStr, refreshExpires);

    return { accessToken, refreshToken: refreshTokenStr };
  }

  /* -------------------------
     Logout
  ------------------------- */
  static async logout(refreshToken: string): Promise<void> {
    await RefreshTokenModel.delete(refreshToken);
  }
  /* -------------------------
   Google OAuth2 - Get Authorization URL
------------------------- */
  static getGoogleAuthUrl(): string {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

    const options = {
      redirect_uri: `${env.APP_URL}/api/auth/google/callback`,
      client_id: env.GOOGLE_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };

    const qs = new URLSearchParams(options);
    return `${rootUrl}?${qs.toString()}`;
  }

  static async handleGoogleCallback(
    code: string
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.APP_URL}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      logger.error("Google token exchange failed", { error });
      throw new Error("Failed to exchange authorization code");
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      id_token: string;
    };

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      logger.error("Failed to fetch Google user info");
      throw new Error("Failed to get user information from Google");
    }

    const googleUser = (await userInfoResponse.json()) as {
      id: string;
      email: string;
      verified_email: boolean;
      name: string;
      given_name: string;
      family_name: string;
      picture: string;
    };

    // Use existing loginWithGoogle method
    return this.loginWithGoogle(
      googleUser.id,
      googleUser.name,
      googleUser.email
    );
  }
}
