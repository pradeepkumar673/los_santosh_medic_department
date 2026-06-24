import jwt from "jsonwebtoken";
import { Response } from "express";
import { env, isProd } from "../config/env";
import { UserRole } from "../models/User.model";

export interface TokenPayload {
  id: string;
  role: UserRole;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as any,
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as any,
  });
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
};

// Converts "15m" / "7d" style strings to milliseconds for cookie maxAge
const expiryToMs = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // fallback: 15 minutes

  const value = Number(match[1]);
  const unit = match[2];
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * unitMs[unit];
};

const baseCookieOptions = {
  httpOnly: true,
  secure: isProd, // HTTPS only in production
  sameSite: (isProd ? "strict" : "lax") as "strict" | "lax",
  domain: env.COOKIE_DOMAIN || undefined,
  path: "/",
};

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  res.cookie("accessToken", accessToken, {
    ...baseCookieOptions,
    maxAge: expiryToMs(env.JWT_ACCESS_EXPIRES),
  });

  res.cookie("refreshToken", refreshToken, {
    ...baseCookieOptions,
    maxAge: expiryToMs(env.JWT_REFRESH_EXPIRES),
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie("accessToken", baseCookieOptions);
  res.clearCookie("refreshToken", baseCookieOptions);
};
