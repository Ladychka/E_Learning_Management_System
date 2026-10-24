import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { logAudit } from "../utils/audit";

export const getGradeCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;

    const categories = await prisma.gradeCategory.findMany({
      where: { courseId },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { assignments: true, quizzes: true },
        },
      },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createGradeCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;
    const { name, weight, sortOrder } = req.body;

    // Verify course exists and user is instructor/admin
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new AppError("Course not found", 404);

    if (req.user?.role !== "ADMIN" && course.instructorId !== req.user?.id) {
      throw new AppError("Not authorized to modify this course", 403);
    }

    // Validate total weight does not exceed 100
    const existing = await prisma.gradeCategory.findMany({
      where: { courseId },
      select: { weight: true },
    });
    const totalWeight = existing.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight + weight > 100) {
      throw new AppError(
        `Total weight would exceed 100% (current: ${totalWeight}%, adding: ${weight}%)`,
        400
      );
    }

    const category = await prisma.gradeCategory.create({
      data: {
        courseId,
        name,
        weight,
        sortOrder: sortOrder ?? 0,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: "CREATE_GRADE_CATEGORY",
      entity: "GradeCategory",
      entityId: category.id,
      newValues: { courseId, name, weight },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateGradeCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, weight, sortOrder } = req.body;

    const existing = await prisma.gradeCategory.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!existing) throw new AppError("Grade category not found", 404);

    if (req.user?.role !== "ADMIN" && existing.course.instructorId !== req.user?.id) {
      throw new AppError("Not authorized to modify this course", 403);
    }

    // Validate total weight
    if (weight !== undefined && weight !== existing.weight) {
      const others = await prisma.gradeCategory.findMany({
        where: { courseId: existing.courseId, id: { not: id } },
        select: { weight: true },
      });
      const totalWeight = others.reduce((sum, c) => sum + c.weight, 0);
      if (totalWeight + weight > 100) {
        throw new AppError(
          `Total weight would exceed 100% (current others: ${totalWeight}%, new: ${weight}%)`,
          400
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (weight !== undefined) updateData.weight = weight;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updated = await prisma.gradeCategory.update({
      where: { id },
      data: updateData,
    });

    await logAudit({
      userId: req.user?.id,
      action: "UPDATE_GRADE_CATEGORY",
      entity: "GradeCategory",
      entityId: id,
      newValues: updateData,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteGradeCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.gradeCategory.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!existing) throw new AppError("Grade category not found", 404);

    if (req.user?.role !== "ADMIN" && existing.course.instructorId !== req.user?.id) {
      throw new AppError("Not authorized to modify this course", 403);
    }

    await prisma.gradeCategory.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: "DELETE_GRADE_CATEGORY",
      entity: "GradeCategory",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({ success: true, message: "Grade category deleted" });
  } catch (error) {
    next(error);
  }
};

export const getOverallGrades = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new AppError("Course not found", 404);

    // Authorization
    if (req.user?.role === "STUDENT") {
      // Students can only see their own overall grade
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId } },
      });
      if (!enrollment) throw new AppError("Not enrolled in this course", 403);
    } else if (req.user?.role === "INSTRUCTOR" && course.instructorId !== req.user.id) {
      throw new AppError("Not authorized to view grades for this course", 403);
    }

    // Get categories
    const categories = await prisma.gradeCategory.findMany({
      where: { courseId },
    });

    // Get all published grades for this course
    const where: Record<string, unknown> = { courseId, isPublished: true };
    if (req.user?.role === "STUDENT") {
      where.studentId = req.user.id;
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignment: { select: { id: true, title: true, categoryId: true } },
        quiz: { select: { id: true, title: true, categoryId: true } },
      },
    });

    // Group by student
    const studentMap = new Map<
      string,
      {
        student: unknown;
        categories: Map<string, { totalPoints: number; totalMax: number; weight: number }>;
        overallPercentage: number;
      }
    >();

    for (const g of grades) {
      const sid = g.studentId;
      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          student: g.student,
          categories: new Map(),
          overallPercentage: 0,
        });
      }

      const entry = studentMap.get(sid)!;
      const catId = g.assignment?.categoryId || g.quiz?.categoryId || "uncategorized";
      const cat = categories.find((c) => c.id === catId);
      const weight = cat?.weight ?? 0;

      if (!entry.categories.has(catId)) {
        entry.categories.set(catId, { totalPoints: 0, totalMax: 0, weight });
      }

      const catEntry = entry.categories.get(catId)!;
      catEntry.totalPoints += Number(g.points);
      catEntry.totalMax += Number(g.maxPoints);
    }

    // Calculate weighted overall
    const results = Array.from(studentMap.entries()).map(([studentId, entry]) => {
      let weightedSum = 0;
      let totalWeightUsed = 0;

      for (const [, catData] of entry.categories) {
        if (catData.totalMax > 0 && catData.weight > 0) {
          const catPct = (catData.totalPoints / catData.totalMax) * 100;
          weightedSum += catPct * (catData.weight / 100);
          totalWeightUsed += catData.weight;
        }
      }

      // If there are uncategorized grades, add them proportionally
      const uncategorized = entry.categories.get("uncategorized");
      if (uncategorized && uncategorized.totalMax > 0) {
        const uncategorizedPct = (uncategorized.totalPoints / uncategorized.totalMax) * 100;
        const remainingWeight = 100 - totalWeightUsed;
        if (remainingWeight > 0) {
          weightedSum += uncategorizedPct * (remainingWeight / 100);
          totalWeightUsed += remainingWeight;
        }
      }

      return {
        studentId,
        student: entry.student,
        overallPercentage: Number(weightedSum.toFixed(2)),
        letterGrade: calculateLetterGrade(weightedSum),
        passFail: weightedSum >= 60 ? "pass" : "fail",
        gpa: calculateGPA(weightedSum),
        categoryBreakdown: Array.from(entry.categories.entries()).map(([catId, data]) => {
          const cat = categories.find((c) => c.id === catId);
          return {
            categoryId: catId,
            categoryName: cat?.name || "Uncategorized",
            weight: cat?.weight || 0,
            percentage: data.totalMax > 0 ? Number(((data.totalPoints / data.totalMax) * 100).toFixed(2)) : 0,
            points: data.totalPoints,
            maxPoints: data.totalMax,
          };
        }),
      };
    });

    res.json({ success: true, data: results });
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
