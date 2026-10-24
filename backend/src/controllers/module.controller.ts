import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

const verifyCourseAccess = async (
  courseId: string,
  userId: string,
  role: string
) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true },
  });
  if (!course) throw new AppError("Course not found", 404);
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new AppError("Not authorized to manage this course", 403);
  }
  return course;
};

export const getModulesByCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true, status: true },
    });
    if (!course) throw new AppError("Course not found", 404);

    // Students see only published modules
    const where: Record<string, unknown> = { courseId };
    if (req.user?.role === "STUDENT") {
      where.isPublished = true;
    } else if (req.user?.role === "INSTRUCTOR") {
      if (course.instructorId !== req.user.id) {
        where.isPublished = true;
      }
    }

    const modules = await prisma.module.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        lessons: {
          where: req.user?.role === "STUDENT" ? { isPublished: true } : undefined,
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            duration: true,
            isPublished: true,
            isPreview: true,
            contentType: true,
            sortOrder: true,
          },
        },
        _count: { select: { lessons: true } },
      },
    });

    res.json({ success: true, data: modules });
  } catch (error) {
    next(error);
  }
};

export const createModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;
    const { title, description, sortOrder } = req.body;

    await verifyCourseAccess(courseId, req.user!.id, req.user!.role);

    // Compute next sortOrder if not provided
    let finalOrder = sortOrder;
    if (finalOrder === undefined) {
      const last = await prisma.module.findFirst({
        where: { courseId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      finalOrder = (last?.sortOrder ?? -1) + 1;
    }

    const module = await prisma.module.create({
      data: {
        courseId,
        title,
        description,
        sortOrder: finalOrder,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "CREATE_MODULE",
      entity: "Module",
      entityId: module.id,
      newValues: { title, courseId, sortOrder: finalOrder },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: module });
  } catch (error) {
    next(error);
  }
};

export const updateModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { title, description, sortOrder, isPublished } = req.body;

    const existing = await prisma.module.findUnique({
      where: { id },
      include: { course: { select: { instructorId: true } } },
    });
    if (!existing) throw new AppError("Module not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      existing.course.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to update this module", 403);
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const module = await prisma.module.update({
      where: { id },
      data: updateData,
    });

    await logAudit({
      userId: req.user?.id,
      action: "UPDATE_MODULE",
      entity: "Module",
      entityId: id,
      oldValues: { title: existing.title, isPublished: existing.isPublished },
      newValues: updateData,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: module });
  } catch (error) {
    next(error);
  }
};

export const deleteModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.module.findUnique({
      where: { id },
      include: { course: { select: { instructorId: true } } },
    });
    if (!existing) throw new AppError("Module not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      existing.course.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to delete this module", 403);
    }

    await prisma.module.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_MODULE",
      entity: "Module",
      entityId: id,
      oldValues: { title: existing.title },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Module deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const reorderModules = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;
    const { orders }: { orders: { id: string; sortOrder: number }[] } = req.body;

    await verifyCourseAccess(courseId, req.user!.id, req.user!.role);

    await prisma.$transaction(
      orders.map((o) =>
        prisma.module.update({
          where: { id: o.id, courseId },
          data: { sortOrder: o.sortOrder },
        })
      )
    );

    await logAudit({
      userId: req.user?.id,
      action: "REORDER_MODULES",
      entity: "Course",
      entityId: courseId,
      newValues: { orders },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Modules reordered successfully" });
  } catch (error) {
    next(error);
  }
};
