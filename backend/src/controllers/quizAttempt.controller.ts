import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";
import { sendGradePublishedEmail } from "../utils/email";

export const startQuizAttempt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { quizId } = req.body;
    const userId = req.user!.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: { include: { module: { include: { course: true } } } },
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
    if (!quiz) throw new AppError("Quiz not found", 404);
    if (!quiz.isPublished) throw new AppError("Quiz is not available", 400);

    // Verify student is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: quiz.lesson.module.courseId } },
    });
    if (
      !enrollment ||
      (enrollment.status !== "active" && enrollment.status !== "completed")
    ) {
      throw new AppError("You must be enrolled in this course to take the quiz", 403);
    }

    // Check attempt limits
    if (quiz.maxAttempts) {
      const attemptCount = await prisma.quizAttempt.count({
        where: { quizId, userId, status: "completed" },
      });
      if (attemptCount >= quiz.maxAttempts) {
        throw new AppError(`Maximum ${quiz.maxAttempts} attempts reached`, 400);
      }
    }

    // Get next attempt number
    const lastAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId, userId },
      orderBy: { attemptNumber: "desc" },
    });
    const attemptNumber = (lastAttempt?.attemptNumber || 0) + 1;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        status: "in_progress",
        attemptNumber,
        timeLimit: quiz.timeLimit,
      },
      include: {
        quiz: {
          select: { title: true, timeLimit: true, maxAttempts: true, passingScore: true },
        },
      },
    });

    await logAudit({
      userId,
      action: "START_QUIZ_ATTEMPT",
      entity: "QuizAttempt",
      entityId: attempt.id,
      newValues: { quizId, attemptNumber },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: { attempt, questions: quiz.questions } });
  } catch (error) {
    next(error);
  }
};

export const submitQuizAnswers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;
    const userId = req.user!.id;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: { include: { questions: true, lesson: { include: { module: { include: { course: true } } } } } },
      },
    });
    if (!attempt) throw new AppError("Quiz attempt not found", 404);
    if (attempt.userId !== userId) throw new AppError("Not authorized", 403);
    if (attempt.status !== "in_progress") {
      throw new AppError("This attempt has already been submitted", 400);
    }

    // Check timer
    if (attempt.timeLimit) {
      const elapsedMinutes = (Date.now() - attempt.startedAt.getTime()) / 60000;
      if (elapsedMinutes > attempt.timeLimit) {
        // Auto-submit as timed_out
        await prisma.quizAttempt.update({
          where: { id: attemptId },
          data: { status: "timed_out", submittedAt: new Date() },
        });
        throw new AppError("Quiz time has expired", 400);
      }
    }

    // Process answers and auto-grade
    let totalScore = 0;
    let totalMaxScore = 0;
    const answerRecords = [];

    for (const ans of answers) {
      const question = attempt.quiz.questions.find((q) => q.id === ans.questionId);
      if (!question) continue;

      let isCorrect: boolean | null = null;
      let pointsEarned = 0;

      if (question.type === "MCQ" || question.type === "TRUE_FALSE") {
        const correct = question.correctAnswer?.toString().trim().toLowerCase();
        const given = ans.answer?.toString().trim().toLowerCase();
        isCorrect = correct === given;
        pointsEarned = isCorrect ? question.points : 0;
      }
      // SHORT_ANSWER requires manual grading — isCorrect stays null

      totalMaxScore += question.points;
      totalScore += pointsEarned;

      answerRecords.push({
        attemptId,
        questionId: ans.questionId,
        answer: ans.answer,
        isCorrect,
        pointsEarned,
      });
    }

    // Save answers
    await prisma.quizAnswer.createMany({ data: answerRecords });

    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    // Update attempt
    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: "completed",
        submittedAt: new Date(),
        score: totalScore,
        maxScore: totalMaxScore,
        percentage: percentage,
      },
      include: {
        quiz: { select: { title: true, passingScore: true } },
        answers: { include: { question: { select: { id: true, question: true, type: true, correctAnswer: true, points: true } } } },
      },
    });

    // Create grade record for graded quizzes
    if (attempt.quiz.lesson.module.courseId) {
      const grade = await prisma.grade.create({
        data: {
          studentId: userId,
          courseId: attempt.quiz.lesson.module.courseId,
          quizId: attempt.quizId,
          points: totalScore,
          maxPoints: totalMaxScore,
          percentage: percentage,
          passFail: percentage >= (attempt.quiz.passingScore || 0) ? "pass" : "fail",
          isPublished: true,
          publishedAt: new Date(),
        },
      });

      // Get course and student info for notification
      const [course, student] = await Promise.all([
        prisma.course.findUnique({ where: { id: attempt.quiz.lesson.module.courseId }, select: { title: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } }),
      ]);

      if (course) {
        // Create in-app notification
        await prisma.notification.create({
          data: {
            userId,
            type: "GRADE_PUBLISHED",
            title: `Quiz graded: ${attempt.quiz.title}`,
            message: `Your quiz ${attempt.quiz.title} in ${course.title} has been auto-graded.`,
            entityType: "Grade",
            entityId: grade.id,
          },
        });

        // Send email notification
        if (student?.email) {
          await sendGradePublishedEmail({
            email: student.email,
            studentName: `${student.firstName} ${student.lastName}`,
            courseTitle: course.title,
            assessmentTitle: attempt.quiz.title,
            percentage,
            letterGrade: "",
            passFail: percentage >= (attempt.quiz.passingScore || 0) ? "pass" : "fail",
          });
        }
      }
    }

    await logAudit({
      userId,
      action: "SUBMIT_QUIZ",
      entity: "QuizAttempt",
      entityId: attemptId,
      newValues: { score: totalScore, percentage, status: "completed" },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: updatedAttempt });
  } catch (error) {
    next(error);
  }
};

export const getQuizResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { attemptId } = req.params;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: { id: true, title: true, passingScore: true, timeLimit: true, maxAttempts: true },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                question: true,
                type: true,
                options: true,
                correctAnswer: true,
                points: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) throw new AppError("Quiz attempt not found", 404);

    // Students can only view their own attempts
    if (req.user?.role === "STUDENT" && attempt.userId !== req.user.id) {
      throw new AppError("Not authorized to view these results", 403);
    }

    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

export const getMyQuizAttempts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { quizId } = req.query as Record<string, string>;

    const where: Record<string, unknown> = { userId: req.user!.id };
    if (quizId) where.quizId = quizId;

    const attempts = await prisma.quizAttempt.findMany({
      where,
      include: {
        quiz: { select: { title: true, lessonId: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    res.json({ success: true, data: attempts });
  } catch (error) {
    next(error);
  }
};

export const getQuizAttemptStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { quizId } = req.params;
    const userId = req.user!.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { maxAttempts: true, timeLimit: true },
    });
    if (!quiz) throw new AppError("Quiz not found", 404);

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId, userId },
      orderBy: { attemptNumber: "asc" },
      select: { id: true, status: true, score: true, percentage: true, attemptNumber: true, startedAt: true, submittedAt: true },
    });

    const completedCount = attempts.filter((a) => a.status === "completed").length;
    const remainingAttempts = quiz.maxAttempts ? Math.max(0, quiz.maxAttempts - completedCount) : null;

    res.json({
      success: true,
      data: {
        attempts,
        totalAttempts: attempts.length,
        completedCount,
        remainingAttempts,
        maxAttempts: quiz.maxAttempts,
        timeLimit: quiz.timeLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};
