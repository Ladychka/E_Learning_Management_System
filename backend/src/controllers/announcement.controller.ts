import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

export const getCourseAnnouncements = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.id;

    const announcements = await prisma.announcement.findMany({
      where: {
        courseId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        reads: {
          where: { userId },
          select: { readAt: true },
        },
      },
    });

    const transformed = announcements.map((a) => ({
      ...a,
      isRead: a.reads.length > 0,
      reads: undefined,
    }));

    res.json({ success: true, data: transformed });
  } catch (error) {
    next(error);
  }
};

export const getMyAnnouncements = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;

    // Get user's enrolled courses
    const enrollments = await prisma.enrollment.findMany({
      where: { userId, status: "active" },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((e) => e.courseId);

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { courseId: { in: courseIds } },
          { courseId: null }, // Platform-wide announcements
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        reads: {
          where: { userId },
          select: { readAt: true },
        },
      },
    });

    const transformed = announcements.map((a) => ({
      ...a,
      isRead: a.reads.length > 0,
      reads: undefined,
    }));

    res.json({ success: true, data: transformed });
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;
    const { title, content, priority = "normal" } = req.body;
    const userId = req.user!.id;

    if (!title || !content) {
      throw new AppError("Title and content are required", 400);
    }

    let courseTitle = "Platform Announcement";
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true, instructorId: true },
      });
      if (!course) throw new AppError("Course not found", 404);

      if (req.user?.role !== "ADMIN" && course.instructorId !== userId) {
        throw new AppError("Not authorized to post announcements for this course", 403);
      }
      courseTitle = course.title;
    } else if (req.user?.role !== "ADMIN") {
      throw new AppError("Only admins can post platform-wide announcements", 403);
    }

    const announcement = await prisma.announcement.create({
      data: {
        courseId: courseId || null,
        createdBy: userId,
        title,
        content,
        priority,
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Broadcast in-app notifications to all enrolled students
    if (courseId) {
      const enrolled = await prisma.enrollment.findMany({
        where: { courseId, status: "active" },
        select: { userId: true },
      });

      if (enrolled.length > 0) {
        await prisma.notification.createMany({
          data: enrolled.map((e) => ({
            userId: e.userId,
            type: "ANNOUNCEMENT",
            title: `Announcement: ${title}`,
            message: `New update in ${courseTitle}: ${title}`,
            entityType: "Course",
            entityId: courseId,
          })),
        });
      }
    }

    await logAudit({
      userId,
      action: "CREATE_ANNOUNCEMENT",
      entity: "Announcement",
      entityId: announcement.id,
      newValues: { courseId, title, priority },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
};

export const markAnnouncementRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId,
        },
      },
      create: {
        announcementId: id,
        userId,
      },
      update: {
        readAt: new Date(),
      },
    });

    res.json({ success: true, message: "Announcement marked as read" });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.announcement.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!existing) throw new AppError("Announcement not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      existing.createdBy !== userId &&
      existing.course?.instructorId !== userId
    ) {
      throw new AppError("Not authorized to delete this announcement", 403);
    }

    await prisma.announcement.delete({ where: { id } });

    await logAudit({
      userId,
      action: "DELETE_ANNOUNCEMENT",
      entity: "Announcement",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Announcement deleted" });
  } catch (error) {
    next(error);
  }
};
