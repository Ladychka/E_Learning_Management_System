import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

export const getLessonComments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;

    const comments = await prisma.comment.findMany({
      where: {
        lessonId,
        parentId: null, // top-level comments
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
    });

    res.json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
};

export const createComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user!.id;

    if (!content || typeof content !== "string" || !content.trim()) {
      throw new AppError("Comment content is required", 400);
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: { course: true },
        },
      },
    });
    if (!lesson) throw new AppError("Lesson not found", 404);

    // Verify student is enrolled or is course instructor/admin
    if (req.user?.role === "STUDENT") {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: lesson.module.courseId,
          },
        },
      });
      if (!enrollment && !lesson.isPreview) {
        throw new AppError("You must be enrolled to comment on this lesson", 403);
      }
    }

    const comment = await prisma.comment.create({
      data: {
        lessonId,
        userId,
        content: content.trim(),
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    // Notify instructor if student commented
    const instructorId = lesson.module.course.instructorId;
    if (instructorId && instructorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: instructorId,
          type: "LESSON_COMMENT",
          title: `New comment on ${lesson.title}`,
          message: `${(req.user as any)?.firstName || req.user?.email || "Someone"}: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`,
          entityType: "Course",
          entityId: lesson.module.courseId,
        },
      });
    }

    await logAudit({
      userId,
      action: "CREATE_COMMENT",
      entity: "Comment",
      entityId: comment.id,
      newValues: { lessonId, parentId },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new AppError("Comment not found", 404);

    if (req.user?.role !== "ADMIN" && comment.userId !== userId) {
      throw new AppError("Not authorized to delete this comment", 403);
    }

    // Delete replies first if any
    await prisma.comment.deleteMany({ where: { parentId: id } });
    await prisma.comment.delete({ where: { id } });

    await logAudit({
      userId,
      action: "DELETE_COMMENT",
      entity: "Comment",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Comment deleted" });
  } catch (error) {
    next(error);
  }
};
