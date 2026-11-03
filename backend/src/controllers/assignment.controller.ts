import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";
import { sendGradePublishedEmail } from "../utils/email";

export const createAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      courseId,
      title,
      description,
      instructions,
      maxPoints,
      dueDate,
      allowLate,
      attachments,
    } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError("Course not found", 404);

    if (req.user?.role !== "ADMIN" && course.instructorId !== req.user?.id) {
      throw new AppError("Not authorized to create assignments for this course", 403);
    }

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        createdBy: req.user!.id,
        title,
        description,
        instructions,
        maxPoints: maxPoints || 100,
        dueDate: dueDate ? new Date(dueDate) : null,
        allowLate: allowLate ?? false,
        attachments: attachments || [],
      },
      include: {
        course: { select: { id: true, title: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "CREATE_ASSIGNMENT",
      entity: "Assignment",
      entityId: assignment.id,
      newValues: { courseId, title, maxPoints, dueDate },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

export const getAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = "1", limit = "10", courseId } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;

    // Students only see published assignments
    if (req.user?.role === "STUDENT") {
      where.isPublished = true;
    } else if (req.user?.role === "INSTRUCTOR") {
      // Instructors only see assignments in their own courses.
      where.course = { instructorId: req.user.id };
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          course: { select: { id: true, title: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.assignment.count({ where }),
    ]);

    res.json({
      success: true,
      data: assignments,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, instructorId: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        submissions: req.user?.role === "STUDENT"
          ? { where: { studentId: req.user.id } }
          : true,
        grades:
          req.user?.role === "STUDENT"
            ? { where: { studentId: req.user.id } }
            : true,
      },
    });

    if (!assignment) throw new AppError("Assignment not found", 404);

    if (req.user?.role === "STUDENT" && !assignment.isPublished) {
      throw new AppError("Assignment not found", 404);
    }
    if (
      req.user?.role === "INSTRUCTOR" &&
      assignment.course.instructorId !== req.user.id
    ) {
      throw new AppError("Not authorized to view this assignment", 403);
    }

    // Attach the matching grade to each submission so the UI can show the
    // score/feedback without a separate lookup.
    const grades = assignment.grades || [];
    const data = {
      ...assignment,
      grades: undefined,
      submissions: assignment.submissions.map((submission) => ({
        ...submission,
        grade:
          grades.find(
            (grade) =>
              grade.studentId === submission.studentId &&
              grade.assignmentId === assignment.id
          ) || null,
      })),
    };

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!existing) throw new AppError("Assignment not found", 404);

    if (req.user?.role !== "ADMIN" && existing.course.instructorId !== req.user?.id) {
      throw new AppError("Not authorized to update this assignment", 403);
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.instructions !== undefined) updateData.instructions = body.instructions;
    if (body.maxPoints !== undefined) updateData.maxPoints = body.maxPoints;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.allowLate !== undefined) updateData.allowLate = body.allowLate;
    if (body.attachments !== undefined) updateData.attachments = body.attachments;
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;

    const assignment = await prisma.assignment.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { id: true, title: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "UPDATE_ASSIGNMENT",
      entity: "Assignment",
      entityId: id,
      oldValues: { title: existing.title, maxPoints: existing.maxPoints },
      newValues: updateData,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

export const deleteAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!existing) throw new AppError("Assignment not found", 404);

    if (req.user?.role !== "ADMIN" && existing.course.instructorId !== req.user?.id) {
      throw new AppError("Not authorized to delete this assignment", 403);
    }

    await prisma.assignment.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_ASSIGNMENT",
      entity: "Assignment",
      entityId: id,
      oldValues: { title: existing.title, courseId: existing.courseId },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Assignment deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const submitAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { content, fileUrls } = req.body;
    const studentId = req.user!.id;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!assignment) throw new AppError("Assignment not found", 404);
    if (!assignment.isPublished) throw new AppError("Assignment not found", 404);

    // Verify student is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentId, courseId: assignment.courseId } },
    });
    if (!enrollment || enrollment.status !== "active") {
      throw new AppError("You must be enrolled in this course to submit", 403);
    }

    // Check deadline
    let isLate = false;
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
      if (!assignment.allowLate) {
        throw new AppError("Assignment deadline has passed and late submissions are not allowed", 400);
      }
      isLate = true;
    }

    // Check existing submission
    const existingSubmission = await prisma.submission.findFirst({
      where: { assignmentId: id, studentId },
    });

    let submission;
    if (existingSubmission) {
      // Update existing submission
      submission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: { content, fileUrls: fileUrls || [], submittedAt: new Date(), isLate },
        include: {
          assignment: { select: { title: true, maxPoints: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          assignmentId: id,
          studentId,
          content,
          fileUrls: fileUrls || [],
          isLate,
        },
        include: {
          assignment: { select: { title: true, maxPoints: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    await logAudit({
      userId: studentId,
      action: "SUBMIT_ASSIGNMENT",
      entity: "Submission",
      entityId: submission.id,
      newValues: { assignmentId: id, isLate },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

export const getSubmissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { assignmentId: queryAssignmentId } = req.query as Record<string, string>;
    const assignmentId = id || queryAssignmentId;

    if (!assignmentId) {
      throw new AppError("Assignment id is required", 400);
    }

    const where: Record<string, unknown> = { assignmentId };

    // Students only see their own submissions
    if (req.user?.role === "STUDENT") {
      where.studentId = req.user.id;
    } else if (req.user?.role === "INSTRUCTOR") {
      // Verify instructor owns the assignment's course
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { course: true },
      });
      if (!assignment || assignment.course.instructorId !== req.user.id) {
        throw new AppError("Not authorized to view these submissions", 403);
      }
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignment: { select: { id: true, title: true, maxPoints: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    res.json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};

export const gradeSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { points, feedback } = req.body;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { assignment: { include: { course: true } } },
    });
    if (!submission) throw new AppError("Submission not found", 404);

    if (req.user?.role !== "ADMIN" && submission.assignment.course.instructorId !== req.user?.id) {
      throw new AppError("Not authorized to grade this submission", 403);
    }

    const maxPoints = submission.assignment.maxPoints;
    if (points > maxPoints) {
      throw new AppError(`Points cannot exceed maximum ${maxPoints}`, 400);
    }

    const percentage = Math.round((points / maxPoints) * 100);
    const passFail = percentage >= 50 ? "pass" : "fail";

    // Create or update grade
    const existingGrade = await prisma.grade.findFirst({
      where: { studentId: submission.studentId, assignmentId: submission.assignmentId },
    });

    let grade;
    if (existingGrade) {
      grade = await prisma.grade.update({
        where: { id: existingGrade.id },
        data: {
          points: points,
          maxPoints: maxPoints,
          percentage: percentage,
          passFail,
          feedback,
          gradedBy: req.user!.id,
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    } else {
      grade = await prisma.grade.create({
        data: {
          studentId: submission.studentId,
          courseId: submission.assignment.courseId,
          assignmentId: submission.assignmentId,
          points: points,
          maxPoints: maxPoints,
          percentage: percentage,
          passFail,
          feedback,
          gradedBy: req.user!.id,
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    }

    // Get student info for notification
    const student = await prisma.user.findUnique({
      where: { id: submission.studentId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId: submission.studentId,
        type: "GRADE_PUBLISHED",
        title: `Grade published: ${submission.assignment.title}`,
        message: `Your grade for ${submission.assignment.title} in ${submission.assignment.course.title} is now available.`,
        entityType: "Grade",
        entityId: grade.id,
      },
    });

    // Send email notification
    if (student?.email) {
      await sendGradePublishedEmail({
        email: student.email,
        studentName: `${student.firstName} ${student.lastName}`,
        courseTitle: submission.assignment.course.title,
        assessmentTitle: submission.assignment.title,
        percentage,
        letterGrade: grade.letterGrade || "",
        passFail,
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: "GRADE_SUBMISSION",
      entity: "Grade",
      entityId: grade.id,
      newValues: { submissionId: id, points, percentage, passFail },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: grade });
  } catch (error) {
    next(error);
  }
};
