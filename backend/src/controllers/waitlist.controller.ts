import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

export const joinWaitlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.body;
    const userId = req.user!.id;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError("Course not found", 404);
    if (course.status !== "PUBLISHED") {
      throw new AppError("Course is not available", 400);
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existingEnrollment && existingEnrollment.status === "active") {
      throw new AppError("Already enrolled in this course", 400);
    }

    // Check if already on waitlist
    const existingWaitlist = await prisma.waitlist.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existingWaitlist) {
      if (existingWaitlist.status === "pending") {
        throw new AppError("Already on waitlist for this course", 400);
      }
      // Reactivate if previously rejected
      const updated = await prisma.waitlist.update({
        where: { id: existingWaitlist.id },
        data: { status: "pending", requestedAt: new Date(), processedAt: null, processedBy: null, notes: null },
        include: { course: { select: { id: true, title: true } } },
      });
      res.json({ success: true, data: updated });
      return;
    }

    const waitlist = await prisma.waitlist.create({
      data: { userId, courseId, status: "pending" },
      include: { course: { select: { id: true, title: true } } },
    });

    await logAudit({
      userId,
      action: "JOIN_WAITLIST",
      entity: "Waitlist",
      entityId: waitlist.id,
      newValues: { courseId, status: "pending" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: waitlist });
  } catch (error) {
    next(error);
  }
};

export const leaveWaitlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.waitlist.findUnique({ where: { id } });
    if (!existing) throw new AppError("Waitlist entry not found", 404);

    if (req.user?.role === "STUDENT" && existing.userId !== req.user.id) {
      throw new AppError("Not authorized", 403);
    }

    await prisma.waitlist.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: "LEAVE_WAITLIST",
      entity: "Waitlist",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Removed from waitlist" });
  } catch (error) {
    next(error);
  }
};

export const processWaitlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const existing = await prisma.waitlist.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!existing) throw new AppError("Waitlist entry not found", 404);

    const updated = await prisma.waitlist.update({
      where: { id },
      data: {
        status,
        processedAt: new Date(),
        processedBy: req.user!.id,
        notes: notes || existing.notes,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    // Auto-enroll if approved
    if (status === "approved") {
      const enrollmentExists = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: existing.userId, courseId: existing.courseId } },
      });
      if (!enrollmentExists) {
        await prisma.enrollment.create({
          data: {
            userId: existing.userId,
            courseId: existing.courseId,
            status: "active",
            enrolledBy: req.user!.id,
          },
        });
      } else if (enrollmentExists.status !== "active") {
        await prisma.enrollment.update({
          where: { id: enrollmentExists.id },
          data: { status: "active", enrolledBy: req.user!.id },
        });
      }
    }

    await logAudit({
      userId: req.user?.id,
      action: `WAITLIST_${status.toUpperCase()}`,
      entity: "Waitlist",
      entityId: id,
      newValues: { status, processedBy: req.user!.id },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getWaitlists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "10", status, courseId } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (courseId) where.courseId = courseId;

    // Students see only their own waitlists
    if (req.user?.role === "STUDENT") {
      where.userId = req.user.id;
    } else if (req.user?.role === "INSTRUCTOR") {
      const instructorCourses = await prisma.course.findMany({
        where: { instructorId: req.user.id },
        select: { id: true },
      });
      const courseIds = instructorCourses.map((c) => c.id);
      where.courseId = courseId && courseIds.includes(courseId) ? courseId : { in: courseIds };
    }

    const [waitlists, total] = await Promise.all([
      prisma.waitlist.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true, thumbnailUrl: true } },
        },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.waitlist.count({ where }),
    ]);

    res.json({
      success: true,
      data: waitlists,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyWaitlists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "10" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [waitlists, total] = await Promise.all([
      prisma.waitlist.findMany({
        where: { userId: req.user!.id },
        include: {
          course: { select: { id: true, title: true, thumbnailUrl: true, status: true } },
        },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.waitlist.count({ where: { userId: req.user!.id } }),
    ]);

    res.json({
      success: true,
      data: waitlists,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};
