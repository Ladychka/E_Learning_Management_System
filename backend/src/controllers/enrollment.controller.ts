import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

export const selfEnroll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId: rawCourseId } = req.body;
    const userId = req.user!.id;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCourseId);
    const course = await prisma.course.findFirst({
      where: isUuid ? { OR: [{ id: rawCourseId }, { slug: rawCourseId }] } : { slug: rawCourseId },
    });
    if (!course) throw new AppError("Course not found", 404);
    const courseId = course.id;
    if (course.status !== "PUBLISHED") {
      throw new AppError("Course is not available for enrollment", 400);
    }

    // Check for prerequisites (basic check — can be expanded)
    if (course.prerequisites && Array.isArray(course.prerequisites) && course.prerequisites.length > 0) {
      // Future: verify student has completed prerequisite courses
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) {
      if (existing.status === "active") {
        throw new AppError("Already enrolled in this course", 400);
      }
      // Reactivate if dropped/expired
      const updated = await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: "active", enrolledAt: new Date() },
        include: { course: { select: { id: true, title: true } } },
      });
      res.json({ success: true, data: updated });
    } else {
      const enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: "active",
          enrolledBy: userId,
        },
        include: { course: { select: { id: true, title: true } } },
      });

      await logAudit({
        userId,
        action: "SELF_ENROLL",
        entity: "Enrollment",
        entityId: enrollment.id,
        newValues: { courseId, status: "active" },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.status(201).json({ success: true, data: enrollment });
    }
  } catch (error) {
    next(error);
  }
};

export const adminEnroll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, courseId, expiresAt } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError("Course not found", 404);

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new AppError("User not found", 404);

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing && existing.status === "active") {
      throw new AppError("User is already enrolled in this course", 400);
    }

    let enrollment;
    if (existing) {
      enrollment = await prisma.enrollment.update({
        where: { id: existing.id },
        data: {
          status: "active",
          enrolledBy: req.user!.id,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      });
    } else {
      enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: "active",
          enrolledBy: req.user!.id,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: "ADMIN_ENROLL",
      entity: "Enrollment",
      entityId: enrollment.id,
      newValues: { userId, courseId, status: "active" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
};

export const updateEnrollment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, progressPercent, expiresAt } = req.body;

    const existing = await prisma.enrollment.findUnique({ where: { id } });
    if (!existing) throw new AppError("Enrollment not found", 404);

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (progressPercent !== undefined) updateData.progressPercent = progressPercent;
    if (expiresAt !== undefined) updateData.expiresAt = new Date(expiresAt);

    if (status === "completed" && existing.status !== "completed") {
      updateData.completedAt = new Date();
    }

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "UPDATE_ENROLLMENT",
      entity: "Enrollment",
      entityId: id,
      oldValues: { status: existing.status, progressPercent: existing.progressPercent },
      newValues: updateData,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
};

export const unenroll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.enrollment.findUnique({
      where: { id },
      include: { course: { select: { instructorId: true } } },
    });
    if (!existing) throw new AppError("Enrollment not found", 404);

    // Students can only unenroll themselves; admins/instructors can unenroll anyone
    if (
      req.user?.role === "STUDENT" &&
      existing.userId !== req.user.id
    ) {
      throw new AppError("Not authorized to unenroll this user", 403);
    }

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: { status: "dropped" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        course: { select: { id: true, title: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "UNENROLL",
      entity: "Enrollment",
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: "dropped" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
};

export const getMyEnrollments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "10", status } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { userId: req.user!.id };
    if (status) where.status = status;

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              status: true,
              instructor: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { enrolledAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.enrollment.count({ where }),
    ]);

    res.json({
      success: true,
      data: enrollments,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

export const getEnrollments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "10", status, courseId, userId } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (courseId) where.courseId = courseId;
    if (userId) where.userId = userId;

    // Instructors can only see enrollments for their own courses
    if (req.user?.role === "INSTRUCTOR") {
      const instructorCourses = await prisma.course.findMany({
        where: { instructorId: req.user.id },
        select: { id: true },
      });
      const courseIds = instructorCourses.map((c) => c.id);
      where.courseId = courseId && courseIds.includes(courseId) ? courseId : { in: courseIds };
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          course: { select: { id: true, title: true, thumbnailUrl: true } },
        },
        orderBy: { enrolledAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.enrollment.count({ where }),
    ]);

    res.json({
      success: true,
      data: enrollments,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

export const getEnrollmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            instructor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!enrollment) throw new AppError("Enrollment not found", 404);

    // Students can only view their own enrollment
    if (req.user?.role === "STUDENT" && enrollment.userId !== req.user.id) {
      throw new AppError("Not authorized to view this enrollment", 403);
    }

    res.json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
};

export const bulkEnroll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId, userIds } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError("Course not found", 404);

    const results = await prisma.$transaction(async (tx) => {
      const created: unknown[] = [];
      const skipped: string[] = [];

      for (const userId of userIds) {
        const existing = await tx.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } },
        });
        if (existing && existing.status === "active") {
          skipped.push(userId);
          continue;
        }

        if (existing) {
          const updated = await tx.enrollment.update({
            where: { id: existing.id },
            data: { status: "active", enrolledBy: req.user!.id },
          });
          created.push(updated);
        } else {
          const enrollment = await tx.enrollment.create({
            data: {
              userId,
              courseId,
              status: "active",
              enrolledBy: req.user!.id,
            },
          });
          created.push(enrollment);
        }
      }

      return { created, skipped };
    });

    await logAudit({
      userId: req.user?.id,
      action: "BULK_ENROLL",
      entity: "Enrollment",
      newValues: { courseId, userIds, createdCount: results.created.length, skippedCount: results.skipped.length },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({
      success: true,
      data: { created: results.created.length, skipped: results.skipped },
    });
  } catch (error) {
    next(error);
  }
};

export const getEnrollmentReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;

    // Instructors can only report on their own courses
    if (req.user?.role === "INSTRUCTOR") {
      const instructorCourses = await prisma.course.findMany({
        where: { instructorId: req.user.id },
        select: { id: true },
      });
      const courseIds = instructorCourses.map((c) => c.id);
      if (courseId && !courseIds.includes(courseId)) {
        throw new AppError("Not authorized to report on this course", 403);
      }
      where.courseId = courseId ? courseId : { in: courseIds };
    }

    const [total, active, completed, dropped, expired] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.count({ where: { ...where, status: "active" } }),
      prisma.enrollment.count({ where: { ...where, status: "completed" } }),
      prisma.enrollment.count({ where: { ...where, status: "dropped" } }),
      prisma.enrollment.count({ where: { ...where, status: "expired" } }),
    ]);

    const recentEnrollments = await prisma.enrollment.findMany({
      where,
      orderBy: { enrolledAt: "desc" },
      take: 10,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        course: { select: { title: true } },
      },
    });

    res.json({
      success: true,
      data: {
        summary: { total, active, completed, dropped, expired },
        recentEnrollments,
      },
    });
  } catch (error) {
    next(error);
  }
};
