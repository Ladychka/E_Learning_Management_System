import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { hashPassword } from "../utils/password";
import { logAudit } from "../utils/audit";

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = "1",
      limit = "10",
      role,
      status,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          updatedAt: true,
          deactivatedAt: true,
          profile: { select: { phone: true, bio: true } },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
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
        updatedAt: true,
        profile: true,
      },
    });

    if (!user) throw new AppError("User not found", 404);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName, role, status } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError("Email already registered", 409);

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        status: status || "ACTIVE",
        profile: { create: {} },
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

    await logAudit({
      userId: req.user?.id,
      action: "CREATE_USER",
      entity: "User",
      entityId: user.id,
      newValues: { email, firstName, lastName, role, status },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, status } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError("User not found", 404);

    const oldValues = {
      firstName: existing.firstName,
      lastName: existing.lastName,
      role: existing.role,
      status: existing.status,
    };

    const user = await prisma.user.update({
      where: { id },
      data: { firstName, lastName, role, status },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "UPDATE_USER",
      entity: "User",
      entityId: id,
      oldValues,
      newValues: { firstName, lastName, role, status },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError("User not found", 404);

    // Prevent self-deletion or admin deletion by non-admin
    if (req.user?.id === id) {
      throw new AppError("Cannot delete your own account via this endpoint. Use deactivate instead.", 400);
    }

    await prisma.user.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_USER",
      entity: "User",
      entityId: id,
      oldValues: { email: existing.email, role: existing.role },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const suspendUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError("User not found", 404);
    if (user.role === "ADMIN" && req.user?.id !== id) {
      throw new AppError("Cannot suspend another admin", 403);
    }

    await prisma.user.update({
      where: { id },
      data: { status: "SUSPENDED" },
    });

    // Revoke tokens
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await logAudit({
      userId: req.user?.id,
      action: "SUSPEND_USER",
      entity: "User",
      entityId: id,
      newValues: { reason, status: "SUSPENDED" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "User suspended successfully" });
  } catch (error) {
    next(error);
  }
};

export const reactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError("User not found", 404);

    await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE", deactivatedAt: null },
    });

    await logAudit({
      userId: req.user?.id,
      action: "REACTIVATE_USER",
      entity: "User",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "User reactivated successfully" });
  } catch (error) {
    next(error);
  }
};