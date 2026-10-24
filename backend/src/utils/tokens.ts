import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config";

export const generateAccessToken = (payload: {
  userId: string;
  email: string;
  role: string;
}) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"],
  });
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

export const generateSecureToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, config.jwt.secret) as {
    userId: string;
    email: string;
    role: string;
    iat: number;
    exp: number;
  };
};