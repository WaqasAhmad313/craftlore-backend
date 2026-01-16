import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.ts";

export interface AccessTokenPayload {
  sub: string; // user id
  role: "user" | "admin";
}

// helper to ensure env secrets are not undefined
function getSecret(secret: string | undefined): string {
  if (!secret) throw new Error("JWT secret not defined");
  return secret;
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