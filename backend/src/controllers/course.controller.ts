import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getCourses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = "1",
      limit = "10",
      status,
      categoryId,
      level,
      search,
      instructorId,
      isFree,
      sortBy = "createdAt",
      order = "desc",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (level) where.level = level;
    if (instructorId) where.instructorId = instructorId;
    if (isFree !== undefined) where.isFree = isFree === "true";
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    // Anonymous visitors and students see only published courses; instructors
    // see their own courses plus published ones; admins see everything.
    if (!req.user || req.user.role === "STUDENT") {
      where.status = "PUBLISHED";
    } else if (req.user.role === "INSTRUCTOR") {
      if (instructorId && instructorId !== req.user.id) {
        // Cannot inspect another instructor's unpublished courses.
        where.status = "PUBLISHED";
      } else if (!instructorId) {
        where.AND = [
          ...((where.AND as unknown[]) || []),
          {
            OR: [
              { status: "PUBLISHED" },
              { instructorId: req.user.id },
            ],
          },
        ];
      }
    }

    const allowedSortFields = ["createdAt", "updatedAt", "title", "price", "publishedAt"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortOrder = order === "asc" ? "asc" : "desc";

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          instructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { enrollments: true, modules: true } },
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.course.count({ where }),
    ]);

    res.json({
      success: true,
      data: courses,
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

export const getCourseById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const course = await prisma.course.findFirst({
      where: isUuid ? { OR: [{ id }, { slug: id }] } : { slug: id },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        category: { select: { id: true, name: true, slug: true } },
        modules: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                title: true,
                duration: true,
                isPreview: true,
                contentType: true,
              },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) throw new AppError("Course not found", 404);

    // Unpublished courses are only visible to the owning instructor or an admin.
    const isOwner = req.user?.id === course.instructor.id;
    if (course.status !== "PUBLISHED" && req.user?.role !== "ADMIN" && !isOwner) {
      throw new AppError("Course not found", 404);
    }

    const lessonIds = course.modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.id)
    );
    let completedLessonIds = new Set<string>();

    if (req.user && lessonIds.length > 0) {
      const completions = await prisma.lessonCompletion.findMany({
        where: {
          userId: req.user.id,
          courseId: course.id,
          lessonId: { in: lessonIds },
        },
        select: { lessonId: true },
      });
      completedLessonIds = new Set(
        completions.map((completion) => completion.lessonId)
      );
    }

    const modules = course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        isCompleted: completedLessonIds.has(lesson.id),
      })),
    }));

    const totalLessons = lessonIds.length;
    const completedLessons = completedLessonIds.size;
    const progressPercent =
      totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : 0;

    res.json({
      success: true,
      data: {
        ...course,
        modules,
        progress: {
          completedLessons,
          totalLessons,
          progressPercent,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      title,
      description,
      shortDesc,
      categoryId,
      level,
      price,
      currency,
      isFree,
      duration,
      language,
      prerequisites,
      learningOutcomes,
      tags,
      scheduledAt,
      status,
      thumbnailUrl,
    } = req.body;

    const slug = slugify(title);
    const existingSlug = await prisma.course.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;
    const finalStatus = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)
      ? status
      : "DRAFT";

    const course = await prisma.course.create({
      data: {
        title,
        slug: finalSlug,
        description,
        shortDesc,
        thumbnailUrl: thumbnailUrl || null,
        categoryId,
        level,
        price: price !== undefined && price !== null ? Number(price) : null,
        currency: currency || "USD",
        isFree: isFree || false,
        duration,
        language: language || "en",
        prerequisites: prerequisites || [],
        learningOutcomes: learningOutcomes || [],
        tags: tags || [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: finalStatus,
        publishedAt: finalStatus === "PUBLISHED" ? new Date() : null,
        instructorId: req.user!.id,
      },
      include: {
        instructor: {
          select: { id: true, firstName: true, lastName: true },
        },
        category: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "CREATE_COURSE",
      entity: "Course",
      entityId: course.id,
      newValues: { title, slug: finalSlug, categoryId, level },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) throw new AppError("Course not found", 404);

    // Only instructor who owns it or admin can update
    if (
      req.user?.role !== "ADMIN" &&
      existing.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to update this course", 403);
    }

    const updateData: Record<string, unknown> = {};
    if (body.title) {
      updateData.title = body.title;
      const newSlug = slugify(body.title);
      const slugExists = await prisma.course.findFirst({
        where: { slug: newSlug, id: { not: id } },
      });
      updateData.slug = slugExists ? `${newSlug}-${Date.now()}` : newSlug;
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.shortDesc !== undefined) updateData.shortDesc = body.shortDesc;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null;
    if (body.level !== undefined) updateData.level = body.level;
    if (body.price !== undefined) {
      updateData.price = body.price === null ? null : Number(body.price);
    }
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl || null;
    if (body.isFree !== undefined) updateData.isFree = body.isFree;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.prerequisites !== undefined) updateData.prerequisites = body.prerequisites;
    if (body.learningOutcomes !== undefined) updateData.learningOutcomes = body.learningOutcomes;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.status !== undefined) {
      if (body.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }
      updateData.status = body.status;
    }

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        instructor: {
          select: { id: true, firstName: true, lastName: true },
        },
        category: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "UPDATE_COURSE",
      entity: "Course",
      entityId: id,
      oldValues: {
        title: existing.title,
        status: existing.status,
        categoryId: existing.categoryId,
      },
      newValues: updateData,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) throw new AppError("Course not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      existing.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to delete this course", 403);
    }

    await prisma.course.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_COURSE",
      entity: "Course",
      entityId: id,
      oldValues: { title: existing.title, instructorId: existing.instructorId },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    next(error);
  }
};