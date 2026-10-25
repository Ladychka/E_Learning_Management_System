import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/**
 * US-081: Course Completion Analytics
 * Returns enrollments count, completed count, completion rate, avg progress
 */
export async function getCourseCompletionStats(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    const { courseId, startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const courseWhere: any = {};
    if (user.role === "INSTRUCTOR") {
      courseWhere.instructorId = user.id;
    }
    if (courseId) {
      courseWhere.id = courseId as string;
    }

    const courses = await prisma.course.findMany({
      where: courseWhere,
      select: {
        id: true,
        title: true,
        slug: true,
        enrollments: {
          where: Object.keys(dateFilter).length > 0 ? { enrolledAt: dateFilter } : undefined,
          select: {
            id: true,
            status: true,
            progressPercent: true,
            enrolledAt: true,
            completedAt: true,
          },
        },
      },
    });

    const stats = courses.map((course) => {
      const totalEnrollments = course.enrollments.length;
      const completedCount = course.enrollments.filter((e) => e.status === "completed" || e.progressPercent === 100).length;
      const activeCount = course.enrollments.filter((e) => e.status === "active").length;
      const totalProgress = course.enrollments.reduce((acc, curr) => acc + curr.progressPercent, 0);
      const avgProgress = totalEnrollments > 0 ? Math.round(totalProgress / totalEnrollments) : 0;
      const completionRate = totalEnrollments > 0 ? Math.round((completedCount / totalEnrollments) * 100) : 0;

      return {
        courseId: course.id,
        title: course.title,
        slug: course.slug,
        totalEnrollments,
        completedCount,
        activeCount,
        avgProgress,
        completionRate,
      };
    });

    res.json({ data: stats });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch course completion stats", error: err.message });
  }
}

/**
 * US-082: Student Progress Report
 * Per student progress across enrolled courses
 */
export async function getStudentProgressReport(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, courseId } = req.query;

    const where: any = {};
    if (studentId) where.userId = studentId as string;
    if (courseId) where.courseId = courseId as string;

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        course: {
          select: { id: true, title: true },
        },
        certificates: {
          select: { id: true, certificateNumber: true, issuedAt: true },
        },
      },
      orderBy: { enrolledAt: "desc" },
      take: 100,
    });

    const report = enrollments.map((e) => ({
      enrollmentId: e.id,
      student: {
        id: e.user.id,
        name: `${e.user.firstName} ${e.user.lastName}`,
        email: e.user.email,
      },
      course: {
        id: e.course.id,
        title: e.course.title,
      },
      status: e.status,
      progressPercent: e.progressPercent,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      certificate: e.certificates[0] || null,
    }));

    res.json({ data: report });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch student progress report", error: err.message });
  }
}

/**
 * US-083: Assessment Performance Report
 * Summary of quiz and assignment score statistics
 */
export async function getAssessmentPerformance(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;

    // Get quizzes
    const quizzes = await prisma.quiz.findMany({
      where: {
        lesson: {
          module: { courseId },
        },
      },
      include: {
        quizAttempts: {
          where: { status: "completed" },
          select: { score: true, maxScore: true, percentage: true },
        },
      },
    });

    const quizStats = quizzes.map((q) => {
      const attempts = q.quizAttempts;
      const count = attempts.length;
      if (count === 0) {
        return {
          id: q.id,
          title: q.title,
          type: "quiz",
          totalAttempts: 0,
          meanScore: 0,
          passRate: 0,
        };
      }

      const percentages = attempts.map((a) => Number(a.percentage || 0));
      const meanScore = Math.round(percentages.reduce((a, b) => a + b, 0) / count);
      const passed = attempts.filter((a) => Number(a.percentage || 0) >= (q.passingScore || 60)).length;
      const passRate = Math.round((passed / count) * 100);

      return {
        id: q.id,
        title: q.title,
        type: "quiz",
        totalAttempts: count,
        meanScore,
        passRate,
      };
    });

    // Get assignments
    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      include: {
        submissions: true,
        grades: true,
      },
    });

    const assignmentStats = assignments.map((a) => {
      const submissions = a.submissions;
      const grades = a.grades;
      const count = grades.length;
      if (count === 0) {
        return {
          id: a.id,
          title: a.title,
          type: "assignment",
          totalSubmissions: submissions.length,
          gradedCount: 0,
          meanScore: 0,
        };
      }

      const scores = grades.map((g) => Number(g.points));
      const meanScore = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / count);

      return {
        id: a.id,
        title: a.title,
        type: "assignment",
        totalSubmissions: submissions.length,
        gradedCount: count,
        meanScore,
      };
    });

    res.json({
      data: {
        quizzes: quizStats,
        assignments: assignmentStats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch assessment performance", error: err.message });
  }
}

/**
 * US-086: Quiz Item Analysis (hardest questions, error rate)
 */
export async function getQuizItemAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const { quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            answers: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ message: "Quiz not found" });
      return;
    }

    const itemAnalysis = quiz.questions.map((q, idx) => {
      const totalAnswers = q.answers.length;
      const correctCount = q.answers.filter((a) => a.isCorrect === true).length;
      const incorrectCount = totalAnswers - correctCount;
      const errorRate = totalAnswers > 0 ? Math.round((incorrectCount / totalAnswers) * 100) : 0;

      return {
        questionId: q.id,
        index: idx + 1,
        question: q.question,
        type: q.type,
        totalAnswers,
        correctCount,
        incorrectCount,
        errorRate,
        isHard: errorRate >= 50,
      };
    });

    res.json({
      data: {
        quizId: quiz.id,
        title: quiz.title,
        questions: itemAnalysis,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to perform quiz item analysis", error: err.message });
  }
}

/**
 * US-087: Revenue Analytics
 * Revenue by gateway (KHQR, ABA, Bakong), monthly trend
 */
export async function getRevenueAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const where: any = {
      status: "paid",
    };
    if (Object.keys(dateFilter).length > 0) {
      where.paidAt = dateFilter;
    }

    if (user.role === "INSTRUCTOR") {
      where.course = { instructorId: user.id };
    }

    const payments = await prisma.payment.findMany({
      where,
      select: {
        id: true,
        amount: true,
        currency: true,
        gateway: true,
        paidAt: true,
        course: {
          select: { id: true, title: true },
        },
      },
      orderBy: { paidAt: "asc" },
    });

    const totalRevenueUSD = payments
      .filter((p) => p.currency === "USD")
      .reduce((acc, p) => acc + Number(p.amount), 0);
    const totalRevenueKHR = payments
      .filter((p) => p.currency === "KHR")
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const gatewayBreakdown: Record<string, { count: number; totalUSD: number; totalKHR: number }> = {
      khqr: { count: 0, totalUSD: 0, totalKHR: 0 },
      aba_payway: { count: 0, totalUSD: 0, totalKHR: 0 },
      bakong: { count: 0, totalUSD: 0, totalKHR: 0 },
    };

    payments.forEach((p) => {
      const gw = p.gateway || "other";
      if (!gatewayBreakdown[gw]) {
        gatewayBreakdown[gw] = { count: 0, totalUSD: 0, totalKHR: 0 };
      }
      gatewayBreakdown[gw].count += 1;
      if (p.currency === "USD") {
        gatewayBreakdown[gw].totalUSD += Number(p.amount);
      } else if (p.currency === "KHR") {
        gatewayBreakdown[gw].totalKHR += Number(p.amount);
      }
    });

    res.json({
      data: {
        totalTransactions: payments.length,
        totalRevenueUSD,
        totalRevenueKHR,
        gatewayBreakdown,
        recentPayments: payments.slice(-10).reverse(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch revenue analytics", error: err.message });
  }
}

/**
 * US-089: Export Reports as CSV
 */
export async function exportReportCsv(req: Request, res: Response): Promise<void> {
  try {
    const { type } = req.params;

    if (type === "completion") {
      const courses = await prisma.course.findMany({
        select: {
          title: true,
          enrollments: {
            select: { status: true, progressPercent: true },
          },
        },
      });

      let csv = "Course Title,Total Enrollments,Completed,Completion Rate (%)\n";
      courses.forEach((c) => {
        const total = c.enrollments.length;
        const completed = c.enrollments.filter((e) => e.status === "completed" || e.progressPercent === 100).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        csv += `"${c.title.replace(/"/g, '""')}",${total},${completed},${rate}%\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="course_completion_report.csv"');
      res.send(csv);
      return;
    }

    if (type === "revenue") {
      const payments = await prisma.payment.findMany({
        where: { status: "paid" },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          course: { select: { title: true } },
        },
        orderBy: { paidAt: "desc" },
      });

      let csv = "Payment ID,Date,Learner Name,Learner Email,Course,Amount,Currency,Gateway\n";
      payments.forEach((p) => {
        const learner = p.user ? `${p.user.firstName} ${p.user.lastName}` : "Unknown";
        const email = p.user ? p.user.email : "";
        const course = p.course ? p.course.title : "Direct";
        const date = p.paidAt ? p.paidAt.toISOString().slice(0, 10) : "";
        csv += `"${p.id}","${date}","${learner}","${email}","${course.replace(/"/g, '""')}",${p.amount},${p.currency},${p.gateway}\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="revenue_report.csv"');
      res.send(csv);
      return;
    }

    res.status(400).json({ message: `Export type '${type}' not supported. Choose 'completion' or 'revenue'.` });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to export report", error: err.message });
  }
}
