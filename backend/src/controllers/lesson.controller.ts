import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

const verifyModuleAccess = async (
  moduleId: string,
  userId: string,
  role: string
) => {
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: { select: { instructorId: true } } },
  });
  if (!module) throw new AppError("Module not found", 404);
  if (role !== "ADMIN" && module.course.instructorId !== userId) {
    throw new AppError("Not authorized to manage this module", 403);
  }
  return module;
};

export const getLessonsByModule = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { moduleId } = req.params;

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { instructorId: true, status: true } } },
    });
    if (!module) throw new AppError("Module not found", 404);

    const where: Record<string, unknown> = { moduleId };
    if (req.user?.role === "STUDENT") {
      where.isPublished = true;
    } else if (req.user?.role === "INSTRUCTOR") {
      if (module.course.instructorId !== req.user.id) {
        where.isPublished = true;
      }
    }

    const lessons = await prisma.lesson.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            isPublished: true,
            _count: { select: { questions: true } },
          },
        },
      },
    });

    // Flatten _count into questionCount for the response
    const data = lessons.map((l) => ({
      ...l,
      quiz: l.quiz
        ? { ...l.quiz, questionCount: l.quiz._count.questions }
        : undefined,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createLesson = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { moduleId } = req.params;
    const {
      title,
      description,
      contentType,
      contentUrl,
      duration,
      isPublished,
      isPreview,
      sortOrder,
      attachments,
      dripDays,
    } = req.body;

    await verifyModuleAccess(moduleId, req.user!.id, req.user!.role);

    let finalOrder = sortOrder;
    if (finalOrder === undefined) {
      const last = await prisma.lesson.findFirst({
        where: { moduleId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      finalOrder = (last?.sortOrder ?? -1) + 1;
    }

    const lesson = await prisma.lesson.create({
      data: {
        moduleId,
        title,
        description,
        contentType: contentType || "text",
        contentUrl,
        duration,
        isPublished: isPublished || false,
        isPreview: isPreview || false,
        sortOrder: finalOrder,
        attachments: attachments || [],
        dripDays,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "CREATE_LESSON",
      entity: "Lesson",
      entityId: lesson.id,
      newValues: { title, moduleId, contentType },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
};

export const getLessonById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: {
              include: {
                modules: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    id: true,
                    title: true,
                    lessons: {
                      orderBy: { sortOrder: "asc" },
                      select: {
                        id: true,
                        title: true,
                        contentType: true,
                        duration: true,
                        isPublished: true,
                        isPreview: true,
                        sortOrder: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        quiz: {
          include: {
            questions: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                type: true,
                question: true,
                options: true,
                points: true,
                sortOrder: true,
              },
            },
          },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 5,
          select: { id: true, version: true, createdAt: true, createdBy: true },
        },
      },
    });

    if (!lesson) throw new AppError("Lesson not found", 404);

    const course = lesson.module.course;

    // Preview lessons are visible to everyone
    if (!lesson.isPreview && !req.user) {
      throw new AppError("Access denied. Please enroll to view this lesson.", 401);
    }

    // Students can only see published lessons within published courses
    if (req.user?.role === "STUDENT") {
      if (!lesson.isPublished || course.status !== "PUBLISHED") {
        throw new AppError("Lesson not found", 404);
      }

      // Check enrollment (preview lessons are exempt)
      if (!lesson.isPreview) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: req.user.id,
              courseId: course.id,
            },
          },
        });
        if (!enrollment || enrollment.status !== "active") {
          throw new AppError("You must be enrolled in this course to access this lesson", 403);
        }

        // Check drip scheduling
        if (lesson.dripDays && lesson.dripDays > 0) {
          const enrolledAt = new Date(enrollment.enrolledAt);
          const unlockDate = new Date(enrolledAt);
          unlockDate.setDate(unlockDate.getDate() + lesson.dripDays);

          if (new Date() < unlockDate) {
            throw new AppError(
              `This lesson is locked until ${unlockDate.toISOString()}. Please come back after ${lesson.dripDays} day(s) from enrollment.`,
              403
            );
          }
        }
      }
    }

    // Instructors can see their own; others see published only
    if (req.user?.role === "INSTRUCTOR" && course.instructorId !== req.user.id) {
      if (!lesson.isPublished || course.status !== "PUBLISHED") {
        throw new AppError("Lesson not found", 404);
      }
    }

    res.json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
};

export const updateLesson = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: { course: { select: { instructorId: true } } },
        },
      },
    });
    if (!existing) throw new AppError("Lesson not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      existing.module.course.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to update this lesson", 403);
    }

    // Snapshot current content for versioning if contentUrl changes
    const shouldSnapshot =
      body.contentUrl !== undefined &&
      body.contentUrl !== existing.contentUrl &&
      existing.contentUrl;

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.contentType !== undefined) updateData.contentType = body.contentType;
    if (body.contentUrl !== undefined) updateData.contentUrl = body.contentUrl;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
    if (body.isPreview !== undefined) updateData.isPreview = body.isPreview;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.attachments !== undefined) updateData.attachments = body.attachments;
    if (body.dripDays !== undefined) updateData.dripDays = body.dripDays;

    // Increment version on content change
    if (Object.keys(updateData).length > 0) {
      updateData.version = existing.version + 1;
    }

    const lesson = await prisma.$transaction(async (tx) => {
      if (shouldSnapshot) {
        await tx.lessonVersion.create({
          data: {
            lessonId: id,
            content: existing.contentUrl || "",
            version: existing.version,
            createdBy: req.user!.id,
          },
        });
      }

      return tx.lesson.update({
        where: { id },
        data: updateData,
      });
    });

    await logAudit({
      userId: req.user?.id,
      action: "UPDATE_LESSON",
      entity: "Lesson",
      entityId: id,
      oldValues: {
        title: existing.title,
        contentType: existing.contentType,
        contentUrl: existing.contentUrl,
      },
      newValues: updateData,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
};

export const deleteLesson = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: { course: { select: { instructorId: true } } },
        },
      },
    });
    if (!existing) throw new AppError("Lesson not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      existing.module.course.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to delete this lesson", 403);
    }

    await prisma.lesson.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_LESSON",
      entity: "Lesson",
      entityId: id,
      oldValues: { title: existing.title },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Lesson deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const reorderLessons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { moduleId } = req.params;
    const { orders }: { orders: { id: string; sortOrder: number }[] } = req.body;

    await verifyModuleAccess(moduleId, req.user!.id, req.user!.role);

    await prisma.$transaction(
      orders.map((o) =>
        prisma.lesson.update({
          where: { id: o.id, moduleId },
          data: { sortOrder: o.sortOrder },
        })
      )
    );

    await logAudit({
      userId: req.user?.id,
      action: "REORDER_LESSONS",
      entity: "Module",
      entityId: moduleId,
      newValues: { orders },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Lessons reordered successfully" });
  } catch (error) {
    next(error);
  }
};
