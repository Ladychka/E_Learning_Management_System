import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { parentId, includeInactive } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (parentId) where.parentId = parentId;
    if (includeInactive !== "true") where.isActive = true;

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, slug: true } },
        _count: { select: { courses: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        courses: {
          where: { status: "PUBLISHED" },
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            price: true,
            isFree: true,
            instructor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!category) throw new AppError("Category not found", 404);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, slug, description, icon, parentId, sortOrder } = req.body;

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) throw new AppError("Category name or slug already exists", 409);

    const category = await prisma.category.create({
      data: { name, slug, description, icon, parentId, sortOrder },
    });

    await logAudit({
      userId: req.user?.id,
      action: "CREATE_CATEGORY",
      entity: "Category",
      entityId: category.id,
      newValues: { name, slug, parentId },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, parentId, sortOrder, isActive } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError("Category not found", 404);

    // Prevent circular parent reference
    if (parentId && parentId === id) {
      throw new AppError("Category cannot be its own parent", 400);
    }

    if (slug) {
      const slugExists = await prisma.category.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) throw new AppError("Slug already in use", 409);
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, slug, description, icon, parentId, sortOrder, isActive },
    });

    await logAudit({
      userId: req.user?.id,
      action: "UPDATE_CATEGORY",
      entity: "Category",
      entityId: id,
      newValues: { name, slug, isActive },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { courses: true, children: true } } },
    });
    if (!existing) throw new AppError("Category not found", 404);

    if (existing._count.courses > 0) {
      throw new AppError(
        "Cannot delete category with associated courses. Reassign courses first.",
        400
      );
    }

    await prisma.category.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_CATEGORY",
      entity: "Category",
      entityId: id,
      oldValues: { name: existing.name },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};