import type { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.ts";

export interface AccessTokenPayload {
  sub: string; // user id
  role: "user" | "admin";
}

export const AUTH_COOKIE = {
  access: "accessToken",
  refresh: "refreshToken",
} as const;

// helper to ensure env secrets are not undefined
function getSecret(secret: string | undefined): string {
  if (!secret) throw new Error("JWT secret not defined");
  return secret;
}

/**
 * Converts JWT "expiresIn" strings to milliseconds for cookie maxAge.
 * Supports: "15m", "1h", "30d", "60s", "500ms"
 */
export function durationToMs(value: string | number | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;

  const v = value.trim();
  // plain number is seconds in jsonwebtoken, but people rarely do this.
  if (/^\d+$/.test(v)) return Number(v) * 1000;

  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/.exec(v);
  if (!match) return 0;

  const amount = Number(match[1]);
  const unit = match[2] as "ms" | "s" | "m" | "h" | "d";

  const mult: Record<typeof unit, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return Math.floor(amount * mult[unit]);
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: jwtConfig.accessExpiresIn,
  };
  return jwt.sign(payload, getSecret(jwtConfig.accessSecret), options);
}

export function generateRefreshToken(payload: { sub: string }): string {
  const options: jwt.SignOptions = {
    expiresIn: jwtConfig.refreshExpiresIn,
  };
  return jwt.sign(payload, getSecret(jwtConfig.refreshSecret), options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getSecret(jwtConfig.accessSecret)) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, getSecret(jwtConfig.refreshSecret)) as { sub: string };
}

/**
 * Cookie options builders for httpOnly auth cookies.
 * Notes:
 * - sameSite: "lax" is a safer default and avoids a lot of CSRF exposure.
 * - secure must be true in production (HTTPS), otherwise browsers will drop cookies.
 */
export function getAccessCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: durationToMs(jwtConfig.accessExpiresIn),
  };
}

export function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: durationToMs(jwtConfig.refreshExpiresIn),
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
): void {
  res.cookie(AUTH_COOKIE.access, tokens.accessToken, getAccessCookieOptions());
  res.cookie(AUTH_COOKIE.refresh, tokens.refreshToken, getRefreshCookieOptions());
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(AUTH_COOKIE.access, { path: "/" });
  res.clearCookie(AUTH_COOKIE.refresh, { path: "/" });
}
