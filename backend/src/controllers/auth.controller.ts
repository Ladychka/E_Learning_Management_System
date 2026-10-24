import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { hashPassword, comparePassword } from "../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
} from "../utils/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email";
import { logAudit } from "../utils/audit";
import { config } from "../config";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("Email already registered", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: role || "STUDENT",
        status: "PENDING_VERIFICATION",
        profile: {
          create: {},
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    const token = generateSecureToken();
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail(email, token);

    await logAudit({
      userId: user.id,
      action: "REGISTER",
      entity: "User",
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    if (user.status === "SUSPENDED") {
      throw new AppError("Account suspended. Contact support.", 403);
    }
    if (user.status === "INACTIVE") {
      throw new AppError("Account deactivated.", 403);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid email or password", 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshTokenStr = generateRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenStr,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    });

    await logAudit({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenStr,
        expiresIn: config.jwt.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          profile: user.profile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Optionally blacklist token in Redis for true logout
      // For now we rely on token expiry + refresh token revocation
    }

    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revokedAt: new Date() },
      });
    }

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        action: "LOGOUT",
        entity: "User",
        entityId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError("Refresh token required", 400);
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    const accessToken = generateAccessToken({
      userId: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    });

    res.json({
      success: true,
      data: { accessToken, expiresIn: config.jwt.expiresIn },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.query as { token: string };
    if (!token) throw new AppError("Token required", 400);

    const record = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError("Invalid or expired token", 400);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true, status: "ACTIVE", emailVerifiedAt: new Date() },
      }),
      prisma.emailVerification.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await logAudit({
      userId: record.userId,
      action: "VERIFY_EMAIL",
      entity: "User",
      entityId: record.userId,
    });

    res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Return success even if user not found (security)
    if (!user) {
      res.json({
        success: true,
        message: "If an account exists, a reset email has been sent.",
      });
      return;
    }

    const token = generateSecureToken();
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await sendPasswordResetEmail(email, token);

    res.json({
      success: true,
      message: "If an account exists, a reset email has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, password } = req.body;

    const record = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError("Invalid or expired token", 400);
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens for security
      prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await logAudit({
      userId: record.userId,
      action: "RESET_PASSWORD",
      entity: "User",
      entityId: record.userId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Not authenticated", 401);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        status: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        profile: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Not authenticated", 401);

    const { firstName, lastName, bio, phone, address, education, occupation } =
      req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName,
        lastName,
        profile: {
          update: {
            bio,
            phone,
            address,
            education,
            occupation,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        status: true,
        profile: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: "UPDATE_PROFILE",
      entity: "User",
      entityId: req.user.id,
      newValues: { firstName, lastName, bio, phone, address },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Not authenticated", 401);

    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) throw new AppError("User not found", 404);

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw new AppError("Current password is incorrect", 400);

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await logAudit({
      userId: req.user.id,
      action: "CHANGE_PASSWORD",
      entity: "User",
      entityId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Password changed successfully. Please login again." });
  } catch (error) {
    next(error);
  }
};

export const deactivateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Not authenticated", 401);

    const { password } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) throw new AppError("User not found", 404);

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new AppError("Password is incorrect", 400);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { status: "INACTIVE", deactivatedAt: new Date() },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await logAudit({
      userId: req.user.id,
      action: "DEACTIVATE_ACCOUNT",
      entity: "User",
      entityId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Account deactivated successfully" });
  } catch (error) {
    next(error);
  }
};