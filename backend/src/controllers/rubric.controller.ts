import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

export const getRubricByAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { assignmentId } = req.params;

    const rubric = await prisma.rubric.findUnique({
      where: { assignmentId },
      include: {
        criteria: {
          orderBy: { sortOrder: "asc" },
          include: {
            levels: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });

    if (!rubric) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: rubric });
  } catch (error) {
    return next(error);
  }
};

export const createOrUpdateRubric = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { assignmentId } = req.params;
    const { title, description, criteria } = req.body;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: true },
    });
    if (!assignment) throw new AppError("Assignment not found", 404);

    if (req.user?.role !== "ADMIN" && assignment.course.instructorId !== req.user?.id) {
      throw new AppError("Not authorized to modify this assignment", 403);
    }

    // Upsert rubric
    const existing = await prisma.rubric.findUnique({
      where: { assignmentId },
    });

    let rubric;
    if (existing) {
      // Delete old criteria and recreate
      await prisma.rubricCriterion.deleteMany({
        where: { rubricId: existing.id },
      });

      rubric = await prisma.rubric.update({
        where: { id: existing.id },
        data: {
          title,
          description,
          totalMaxPoints: criteria.reduce(
            (sum: number, c: any) => sum + (c.maxPoints || 0),
            0
          ),
        },
      });
    } else {
      rubric = await prisma.rubric.create({
        data: {
          assignmentId,
          title,
          description,
          totalMaxPoints: criteria.reduce(
            (sum: number, c: any) => sum + (c.maxPoints || 0),
            0
          ),
        },
      });

      // Link rubric to assignment
      await prisma.assignment.update({
        where: { id: assignmentId },
        data: { rubricId: rubric.id },
      });
    }

    // Create criteria and levels
    for (const criterion of criteria) {
      const createdCriterion = await prisma.rubricCriterion.create({
        data: {
          rubricId: rubric.id,
          title: criterion.title,
          description: criterion.description,
          maxPoints: criterion.maxPoints || 0,
          sortOrder: criterion.sortOrder || 0,
        },
      });

      if (criterion.levels?.length) {
        await prisma.rubricCriterionLevel.createMany({
          data: criterion.levels.map((level: any) => ({
            criterionId: createdCriterion.id,
            title: level.title,
            points: level.points,
            description: level.description,
            sortOrder: level.sortOrder || 0,
          })),
        });
      }
    }

    // Reload with relations
    const result = await prisma.rubric.findUnique({
      where: { id: rubric.id },
      include: {
        criteria: {
          orderBy: { sortOrder: "asc" },
          include: { levels: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: existing ? "UPDATE_RUBRIC" : "CREATE_RUBRIC",
      entity: "Rubric",
      entityId: rubric.id,
      newValues: { assignmentId, title },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(existing ? 200 : 201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deleteRubric = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.rubric.findUnique({
      where: { id },
      include: { assignment: { include: { course: true } } },
    });
    if (!existing) throw new AppError("Rubric not found", 404);

    if (req.user?.role !== "ADMIN" && existing.assignment.course.instructorId !== req.user?.id) {
      throw new AppError("Not authorized to delete this rubric", 403);
    }

    await prisma.rubric.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_RUBRIC",
      entity: "Rubric",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Rubric deleted" });
  } catch (error) {
    next(error);
  }
};

export const submitRubricGrades = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gradeId } = req.params;
    const { criterionGrades } = req.body;

    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: { assignment: { include: { course: true, rubric: { include: { criteria: true } } } }, quiz: true },
    });
    if (!grade) throw new AppError("Grade not found", 404);

    // Authorization
    if (req.user?.role !== "ADMIN") {
      const courseInstructorId = grade.assignment?.course.instructorId;
      if (courseInstructorId && courseInstructorId !== req.user?.id) {
        throw new AppError("Not authorized to grade this submission", 403);
      }
    }

    // Delete existing rubric grades for this grade
    await prisma.rubricGrade.deleteMany({ where: { gradeId } });

    // Create new rubric grades
    let totalPoints = 0;
    for (const cg of criterionGrades) {
      await prisma.rubricGrade.create({
        data: {
          gradeId,
          criterionId: cg.criterionId,
          levelId: cg.levelId || null,
          pointsEarned: cg.pointsEarned || 0,
          feedback: cg.feedback || null,
        },
      });
      totalPoints += cg.pointsEarned || 0;
    }

    // Update the main grade to reflect rubric total
    const rubricMax = Number(grade.assignment?.rubric?.totalMaxPoints || grade.maxPoints);
    const percentage =
      rubricMax > 0 ? Number(((totalPoints / rubricMax) * 100).toFixed(2)) : 0;

    await prisma.grade.update({
      where: { id: gradeId },
      data: {
        points: totalPoints,
        maxPoints: rubricMax,
        percentage,
        letterGrade: calculateLetterGrade(percentage),
        passFail: percentage >= 60 ? "pass" : "fail",
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "SUBMIT_RUBRIC_GRADES",
      entity: "Grade",
      entityId: gradeId,
      newValues: { points: totalPoints, percentage },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Rubric grades submitted" });
  } catch (error) {
    next(error);
  }
};

export const getRubricGrades = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gradeId } = req.params;

    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
    });
    if (!grade) throw new AppError("Grade not found", 404);

    if (req.user?.role === "STUDENT" && grade.studentId !== req.user.id) {
      throw new AppError("Not authorized", 403);
    }
    if (req.user?.role === "STUDENT" && !grade.isPublished) {
      throw new AppError("Grade not published yet", 403);
    }

    const rubricGrades = await prisma.rubricGrade.findMany({
      where: { gradeId },
      include: {
        criterion: {
          include: { levels: { orderBy: { sortOrder: "asc" } } },
        },
        level: true,
      },
    });

    res.json({ success: true, data: rubricGrades });
  } catch (error) {
    next(error);
  }
};

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
