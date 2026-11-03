import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

const verifyLessonAccess = async (
  lessonId: string,
  userId: string,
  role: string
) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: { course: { select: { instructorId: true } } },
      },
    },
  });
  if (!lesson) throw new AppError("Lesson not found", 404);
  if (role !== "ADMIN" && lesson.module.course.instructorId !== userId) {
    throw new AppError("Not authorized to manage this lesson", 403);
  }
  return lesson;
};

export const getQuizByLesson = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            type: true,
            question: true,
            options: true,
            correctAnswer: true,
            points: true,
            sortOrder: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
            moduleId: true,
            isPublished: true,
            isPreview: true,
          },
        },
      },
    });

    if (!quiz) throw new AppError("Quiz not found for this lesson", 404);

    // Students can only see published quiz content
    if (req.user?.role === "STUDENT" && !quiz.isPublished) {
      throw new AppError("Quiz not found", 404);
    }

    // Never leak answer keys to students; instructors need them to edit quizzes.
    if (req.user?.role === "STUDENT") {
      quiz.questions = quiz.questions.map(({ correctAnswer: _correctAnswer, ...q }) => q) as typeof quiz.questions;
    }

    res.json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

export const getCourseQuizzes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.id;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, status: true },
    });
    if (!course || course.status !== "PUBLISHED") {
      throw new AppError("Course not found", 404);
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { status: true },
    });
    if (
      !enrollment ||
      (enrollment.status !== "active" && enrollment.status !== "completed")
    ) {
      throw new AppError(
        "You must be enrolled in this course to view quizzes",
        403
      );
    }

    const quizzes = await prisma.quiz.findMany({
      where: {
        isPublished: true,
        lesson: {
          isPublished: true,
          module: { courseId, isPublished: true },
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            sortOrder: true,
            moduleId: true,
            module: {
              select: { id: true, title: true, sortOrder: true },
            },
          },
        },
        _count: { select: { questions: true } },
        quizAttempts: {
          where: { userId },
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            status: true,
            score: true,
            maxScore: true,
            percentage: true,
            attemptNumber: true,
            startedAt: true,
            submittedAt: true,
          },
        },
      },
    });

    const data = quizzes
      .sort(
        (a, b) =>
          a.lesson.module.sortOrder - b.lesson.module.sortOrder ||
          a.lesson.sortOrder - b.lesson.sortOrder ||
          a.title.localeCompare(b.title)
      )
      .map((quiz) => {
        const completedAttempts = quiz.quizAttempts.filter(
          (attempt) => attempt.status === "completed"
        ).length;
        const remainingAttempts = quiz.maxAttempts
          ? Math.max(0, quiz.maxAttempts - completedAttempts)
          : null;
        const bestPercentage = quiz.quizAttempts.reduce<number | null>(
          (best, attempt) => {
            if (attempt.percentage === null) return best;
            const percentage = Number(attempt.percentage);
            return best === null || percentage > best ? percentage : best;
          },
          null
        );

        return {
          id: quiz.id,
          lessonId: quiz.lessonId,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          maxAttempts: quiz.maxAttempts,
          passingScore: quiz.passingScore,
          isPublished: quiz.isPublished,
          questionCount: quiz._count.questions,
          lesson: {
            id: quiz.lesson.id,
            title: quiz.lesson.title,
            moduleId: quiz.lesson.moduleId,
            moduleTitle: quiz.lesson.module.title,
          },
          attemptCount: quiz.quizAttempts.length,
          completedAttempts,
          remainingAttempts,
          bestPercentage,
          lastAttempt: quiz.quizAttempts[0] ?? null,
        };
      });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;
    const {
      title,
      description,
      timeLimit,
      maxAttempts,
      passingScore,
      isPublished,
    } = req.body;

    await verifyLessonAccess(lessonId, req.user!.id, req.user!.role);

    const existing = await prisma.quiz.findUnique({ where: { lessonId } });

    let quiz;
    if (existing) {
      quiz = await prisma.quiz.update({
        where: { lessonId },
        data: {
          title,
          description,
          timeLimit,
          maxAttempts,
          passingScore,
          isPublished: isPublished !== undefined ? isPublished : existing.isPublished,
        },
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
      });

      await logAudit({
        userId: req.user?.id,
        action: "UPDATE_QUIZ",
        entity: "Quiz",
        entityId: quiz.id,
        newValues: { title, timeLimit, maxAttempts },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    } else {
      quiz = await prisma.quiz.create({
        data: {
          lessonId,
          title: title || "Untitled Quiz",
          description,
          timeLimit,
          maxAttempts,
          passingScore,
          isPublished: isPublished || false,
        },
        include: {
          questions: true,
        },
      });

      await logAudit({
        userId: req.user?.id,
        action: "CREATE_QUIZ",
        entity: "Quiz",
        entityId: quiz.id,
        newValues: { title, lessonId },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }

    res.json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

export const deleteQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lessonId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        lesson: {
          include: {
            module: {
              include: { course: { select: { instructorId: true } } },
            },
          },
        },
      },
    });
    if (!quiz) throw new AppError("Quiz not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      quiz.lesson.module.course.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to delete this quiz", 403);
    }

    await prisma.quiz.delete({ where: { lessonId } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_QUIZ",
      entity: "Quiz",
      entityId: quiz.id,
      oldValues: { title: quiz.title },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const addQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { quizId } = req.params;
    const { type, question, options, correctAnswer, points, sortOrder } = req.body;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            module: {
              include: { course: { select: { instructorId: true } } },
            },
          },
        },
      },
    });
    if (!quiz) throw new AppError("Quiz not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      quiz.lesson.module.course.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to modify this quiz", 403);
    }

    let finalOrder = sortOrder;
    if (finalOrder === undefined) {
      const last = await prisma.question.findFirst({
        where: { quizId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      finalOrder = (last?.sortOrder ?? -1) + 1;
    }

    const q = await prisma.question.create({
      data: {
        quizId,
        type,
        question,
        options: options || [],
        correctAnswer,
        points: points || 1,
        sortOrder: finalOrder,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "CREATE_QUESTION",
      entity: "Question",
      entityId: q.id,
      newValues: { type, question, points },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: q });
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { quizId, questionId } = req.params;
    const body = req.body;

    const existing = await prisma.question.findFirst({
      where: { id: questionId, quizId },
      include: {
        quiz: {
          include: {
            lesson: {
              include: {
                module: {
                  include: { course: { select: { instructorId: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!existing) throw new AppError("Question not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      existing.quiz.lesson.module.course.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to update this question", 403);
    }

    const updateData: Record<string, unknown> = {};
    if (body.type !== undefined) updateData.type = body.type;
    if (body.question !== undefined) updateData.question = body.question;
    if (body.options !== undefined) updateData.options = body.options;
    if (body.correctAnswer !== undefined)
      updateData.correctAnswer = body.correctAnswer;
    if (body.points !== undefined) updateData.points = body.points;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const q = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
    });

    await logAudit({
      userId: req.user?.id,
      action: "UPDATE_QUESTION",
      entity: "Question",
      entityId: questionId,
      newValues: updateData,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: q });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { quizId, questionId } = req.params;

    const existing = await prisma.question.findFirst({
      where: { id: questionId, quizId },
      include: {
        quiz: {
          include: {
            lesson: {
              include: {
                module: {
                  include: { course: { select: { instructorId: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!existing) throw new AppError("Question not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      existing.quiz.lesson.module.course.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to delete this question", 403);
    }

    await prisma.question.delete({ where: { id: questionId } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_QUESTION",
      entity: "Question",
      entityId: questionId,
      oldValues: { question: existing.question },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const reorderQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { quizId } = req.params;
    const { orders }: { orders: { id: string; sortOrder: number }[] } = req.body;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            module: {
              include: { course: { select: { instructorId: true } } },
            },
          },
        },
      },
    });
    if (!quiz) throw new AppError("Quiz not found", 404);

    if (
      req.user?.role !== "ADMIN" &&
      quiz.lesson.module.course.instructorId !== req.user?.id
    ) {
      throw new AppError("Not authorized to modify this quiz", 403);
    }

    await prisma.$transaction(
      orders.map((o) =>
        prisma.question.update({
          where: { id: o.id, quizId },
          data: { sortOrder: o.sortOrder },
        })
      )
    );

    await logAudit({
      userId: req.user?.id,
      action: "REORDER_QUESTIONS",
      entity: "Quiz",
      entityId: quizId,
      newValues: { orders },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Questions reordered successfully" });
  } catch (error) {
    next(error);
  }
};
