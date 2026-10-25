import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";
import { sendGradePublishedEmail, sendAppealResultEmail } from "../utils/email";

function calculateLetterGrade(percentage: number): string {
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

function calculatePassFail(percentage: number): string {
  return percentage >= 60 ? "pass" : "fail";
}

function calculateGPA(percentage: number): number {
  if (percentage >= 93) return 4.0;
  if (percentage >= 90) return 3.7;
  if (percentage >= 87) return 3.3;
  if (percentage >= 83) return 3.0;
  if (percentage >= 80) return 2.7;
  if (percentage >= 77) return 2.3;
  if (percentage >= 73) return 2.0;
  if (percentage >= 70) return 1.7;
  if (percentage >= 67) return 1.3;
  if (percentage >= 63) return 1.0;
  if (percentage >= 60) return 0.7;
  return 0.0;
}

export const createGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { studentId, courseId, assignmentId, quizId, points, maxPoints, letterGrade, passFail, feedback } = req.body;

    if (assignmentId && quizId) {
      throw new AppError("Cannot grade both an assignment and a quiz in the same record", 400);
    }

    const percentage = maxPoints > 0 ? Number(((points / maxPoints) * 100).toFixed(2)) : 0;
    const finalLetterGrade = letterGrade || calculateLetterGrade(percentage);
    const finalPassFail = passFail || calculatePassFail(percentage);

    // Check if grade already exists for this student+course+assessment
    const existingWhere: Record<string, unknown> = { studentId, courseId };
    if (assignmentId) existingWhere.assignmentId = assignmentId;
    if (quizId) existingWhere.quizId = quizId;

    const existing = await prisma.grade.findFirst({ where: existingWhere });

    let grade;
    if (existing) {
      grade = await prisma.grade.update({
        where: { id: existing.id },
        data: {
          points,
          maxPoints,
          percentage,
          letterGrade: finalLetterGrade,
          passFail: finalPassFail,
          feedback: feedback ?? existing.feedback,
          gradedBy: req.user!.id,
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true } },
          assignment: { select: { id: true, title: true } },
          quiz: { select: { id: true, title: true } },
          grader: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    } else {
      grade = await prisma.grade.create({
        data: {
          studentId,
          courseId,
          assignmentId: assignmentId || null,
          quizId: quizId || null,
          points,
          maxPoints,
          percentage,
          letterGrade: finalLetterGrade,
          passFail: finalPassFail,
          feedback: feedback || null,
          gradedBy: req.user!.id,
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true } },
          assignment: { select: { id: true, title: true } },
          quiz: { select: { id: true, title: true } },
          grader: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: existing ? "UPDATE_GRADE" : "CREATE_GRADE",
      entity: "Grade",
      entityId: grade.id,
      newValues: { studentId, courseId, points, maxPoints, percentage, letterGrade: finalLetterGrade },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(existing ? 200 : 201).json({ success: true, data: grade });
  } catch (error) {
    next(error);
  }
};

export const getGrades = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "20", courseId, studentId, isPublished } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;
    if (studentId) where.studentId = studentId;
    if (isPublished !== undefined) where.isPublished = isPublished === "true";

    // Instructors can only see grades for their own courses
    if (req.user?.role === "INSTRUCTOR") {
      const instructorCourses = await prisma.course.findMany({
        where: { instructorId: req.user.id },
        select: { id: true },
      });
      const courseIds = instructorCourses.map((c) => c.id);
      if (courseId && !courseIds.includes(courseId)) {
        throw new AppError("Not authorized to view grades for this course", 403);
      }
      where.courseId = courseId ? courseId : { in: courseIds };
    }

    // Students can only see published grades for themselves
    if (req.user?.role === "STUDENT") {
      where.studentId = req.user.id;
      where.isPublished = true;
    }

    const [grades, total] = await Promise.all([
      prisma.grade.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true } },
          assignment: { select: { id: true, title: true } },
          quiz: { select: { id: true, title: true } },
          grader: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.grade.count({ where }),
    ]);

    res.json({
      success: true,
      data: grades,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

export const getGradeById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const grade = await prisma.grade.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
        assignment: { select: { id: true, title: true, maxPoints: true } },
        quiz: { select: { id: true, title: true } },
        grader: { select: { id: true, firstName: true, lastName: true } },
        appeals: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!grade) throw new AppError("Grade not found", 404);

    if (req.user?.role === "STUDENT" && grade.studentId !== req.user.id) {
      throw new AppError("Not authorized to view this grade", 403);
    }
    if (req.user?.role === "STUDENT" && !grade.isPublished) {
      throw new AppError("Grade has not been published yet", 403);
    }

    res.json({ success: true, data: grade });
  } catch (error) {
    next(error);
  }
};

export const updateGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { points, maxPoints, letterGrade, passFail, feedback } = req.body;

    const existing = await prisma.grade.findUnique({ where: { id } });
    if (!existing) throw new AppError("Grade not found", 404);

    const updateData: Record<string, unknown> = {};
    if (points !== undefined) updateData.points = points;
    if (maxPoints !== undefined) updateData.maxPoints = maxPoints;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (letterGrade !== undefined) updateData.letterGrade = letterGrade;
    if (passFail !== undefined) updateData.passFail = passFail;

    // Recalculate percentage if points or maxPoints changed
    const finalPoints = points !== undefined ? points : Number(existing.points);
    const finalMaxPoints = maxPoints !== undefined ? maxPoints : Number(existing.maxPoints);
    const percentage = finalMaxPoints > 0 ? Number(((finalPoints / finalMaxPoints) * 100).toFixed(2)) : 0;
    updateData.percentage = percentage;

    if (!letterGrade) updateData.letterGrade = calculateLetterGrade(percentage);
    if (!passFail) updateData.passFail = calculatePassFail(percentage);

    updateData.gradedBy = req.user!.id;

    const grade = await prisma.grade.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
        assignment: { select: { id: true, title: true } },
        quiz: { select: { id: true, title: true } },
        grader: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "UPDATE_GRADE",
      entity: "Grade",
      entityId: id,
      oldValues: { points: existing.points, maxPoints: existing.maxPoints, letterGrade: existing.letterGrade },
      newValues: updateData,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: grade });
  } catch (error) {
    next(error);
  }
};

export const deleteGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.grade.findUnique({ where: { id } });
    if (!existing) throw new AppError("Grade not found", 404);

    await prisma.grade.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_GRADE",
      entity: "Grade",
      entityId: id,
      oldValues: existing,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Grade deleted" });
  } catch (error) {
    next(error);
  }
};

export const publishGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.grade.findUnique({ where: { id } });
    if (!existing) throw new AppError("Grade not found", 404);

    const grade = await prisma.grade.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
        assignment: { select: { title: true } },
        quiz: { select: { title: true } },
      },
    });

    // Create in-app notification
    const assessmentTitle = grade.assignment?.title || grade.quiz?.title || "Assessment";
    await prisma.notification.create({
      data: {
        userId: grade.studentId,
        type: "GRADE_PUBLISHED",
        title: `Grade published: ${assessmentTitle}`,
        message: `Your grade for ${assessmentTitle} in ${grade.course.title} is now available.`,
        entityType: "Grade",
        entityId: grade.id,
      },
    });

    // Send email notification
    if (grade.student.email) {
      await sendGradePublishedEmail({
        email: grade.student.email,
        studentName: `${grade.student.firstName} ${grade.student.lastName}`,
        courseTitle: grade.course.title,
        assessmentTitle,
        percentage: Number(grade.percentage),
        letterGrade: grade.letterGrade || "",
        passFail: grade.passFail || "",
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: "PUBLISH_GRADE",
      entity: "Grade",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: grade });
  } catch (error) {
    next(error);
  }
};

export const getMyGrades = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "20", courseId } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = { studentId: req.user!.id, isPublished: true };
    if (courseId) where.courseId = courseId;

    const [grades, total] = await Promise.all([
      prisma.grade.findMany({
        where,
        include: {
          course: { select: { id: true, title: true } },
          assignment: { select: { id: true, title: true } },
          quiz: { select: { id: true, title: true } },
          grader: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.grade.count({ where }),
    ]);

    res.json({
      success: true,
      data: grades,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

export const exportGradebook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.query as { courseId?: string };

    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;

    if (req.user?.role === "INSTRUCTOR") {
      const instructorCourses = await prisma.course.findMany({
        where: { instructorId: req.user.id },
        select: { id: true },
      });
      const courseIds = instructorCourses.map((c) => c.id);
      if (courseId && !courseIds.includes(courseId)) {
        throw new AppError("Not authorized to export grades for this course", 403);
      }
      where.courseId = courseId ? courseId : { in: courseIds };
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
        course: { select: { title: true } },
        assignment: { select: { title: true } },
        quiz: { select: { title: true } },
        grader: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ courseId: "asc" }, { studentId: "asc" }],
    });

    // CSV header
    const headers = ["Course", "Student", "Email", "Assessment", "Points", "Max Points", "Percentage", "Letter Grade", "Pass/Fail", "Feedback", "Graded By", "Published"];
    const rows = grades.map((g) => [
      `"${g.course?.title || ""}"`,
      `"${g.student?.firstName || ""} ${g.student?.lastName || ""}"`,
      g.student?.email || "",
      `"${g.assignment?.title || g.quiz?.title || "Overall"}"`,
      g.points,
      g.maxPoints,
      `${g.percentage}%`,
      g.letterGrade || "",
      g.passFail || "",
      `"${(g.feedback || "").replace(/"/g, '""')}"`,
      `"${g.grader?.firstName || ""} ${g.grader?.lastName || ""}"`,
      g.isPublished ? "Yes" : "No",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="gradebook-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const appealGrade = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const grade = await prisma.grade.findUnique({ where: { id } });
    if (!grade) throw new AppError("Grade not found", 404);

    if (req.user?.role === "STUDENT" && grade.studentId !== req.user.id) {
      throw new AppError("Not authorized to appeal this grade", 403);
    }
    if (!grade.isPublished) {
      throw new AppError("Cannot appeal an unpublished grade", 400);
    }

    const appeal = await prisma.gradeAppeal.create({
      data: {
        gradeId: id,
        studentId: grade.studentId,
        reason,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "APPEAL_GRADE",
      entity: "GradeAppeal",
      entityId: appeal.id,
      newValues: { gradeId: id, reason },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: appeal });
  } catch (error) {
    next(error);
  }
};

export const respondAppeal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, response } = req.body;

    const appeal = await prisma.gradeAppeal.findUnique({
      where: { id },
      include: {
        grade: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, email: true } },
            course: { select: { id: true, title: true } },
            assignment: { select: { title: true } },
            quiz: { select: { title: true } },
          },
        },
      },
    });
    if (!appeal) throw new AppError("Appeal not found", 404);

    const updated = await prisma.gradeAppeal.update({
      where: { id },
      data: { status, response: response || null },
    });

    // Notify student in-app and by email (US-060)
    const assessmentTitle = appeal.grade.assignment?.title || appeal.grade.quiz?.title || "Assessment";
    await prisma.notification.create({
      data: {
        userId: appeal.studentId,
        type: "GRADE_APPEAL_RESULT",
        title: `Grade appeal ${status}: ${assessmentTitle}`,
        message: `Your grade appeal for ${assessmentTitle} in ${appeal.grade.course.title} has been ${status}.${response ? ` Response: ${response}` : ""}`,
        entityType: "Grade",
        entityId: appeal.gradeId,
      },
    });

    if (appeal.grade.student.email) {
      await sendAppealResultEmail({
        email: appeal.grade.student.email,
        studentName: `${appeal.grade.student.firstName} ${appeal.grade.student.lastName}`,
        courseTitle: appeal.grade.course.title,
        assessmentTitle,
        status,
        response: response || undefined,
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: "RESPOND_APPEAL",
      entity: "GradeAppeal",
      entityId: id,
      oldValues: { status: appeal.status },
      newValues: { status, response },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getCourseGPA = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.query as { studentId?: string };

    const where: Record<string, unknown> = { courseId, isPublished: true };
    if (studentId) where.studentId = studentId;

    if (req.user?.role === "STUDENT") {
      where.studentId = req.user.id;
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Group by student and compute average
    const studentMap = new Map<string, { student: unknown; totalPoints: number; totalMaxPoints: number; count: number }>();
    for (const g of grades) {
      const key = g.studentId;
      if (!studentMap.has(key)) {
        studentMap.set(key, { student: g.student, totalPoints: 0, totalMaxPoints: 0, count: 0 });
      }
      const entry = studentMap.get(key)!;
      entry.totalPoints += Number(g.points);
      entry.totalMaxPoints += Number(g.maxPoints);
      entry.count += 1;
    }

    const results = Array.from(studentMap.entries()).map(([id, entry]) => {
      const avgPercentage = entry.totalMaxPoints > 0 ? Number(((entry.totalPoints / entry.totalMaxPoints) * 100).toFixed(2)) : 0;
      return {
        studentId: id,
        student: entry.student,
        averagePercentage: avgPercentage,
        gpa: calculateGPA(avgPercentage),
        letterGrade: calculateLetterGrade(avgPercentage),
        passFail: calculatePassFail(avgPercentage),
        gradedItems: entry.count,
      };
    });

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

export const getGradebookOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.query as { courseId?: string };

    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;

    if (req.user?.role === "INSTRUCTOR") {
      const instructorCourses = await prisma.course.findMany({
        where: { instructorId: req.user.id },
        select: { id: true },
      });
      const courseIds = instructorCourses.map((c) => c.id);
      if (courseId && !courseIds.includes(courseId)) {
        throw new AppError("Not authorized", 403);
      }
      where.courseId = courseId ? courseId : { in: courseIds };
    }

    const totalGrades = await prisma.grade.count({ where });
    const publishedGrades = await prisma.grade.count({ where: { ...where, isPublished: true } });
    const unpublishedGrades = totalGrades - publishedGrades;

    const passCount = await prisma.grade.count({ where: { ...where, passFail: "pass" } });
    const failCount = await prisma.grade.count({ where: { ...where, passFail: "fail" } });

    // Average percentage
    const avgResult = await prisma.grade.aggregate({
      where: { ...where, isPublished: true },
      _avg: { percentage: true },
    });

    res.json({
      success: true,
      data: {
        totalGrades,
        publishedGrades,
        unpublishedGrades,
        passCount,
        failCount,
        averagePercentage: Number((avgResult._avg.percentage || 0).toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
};
