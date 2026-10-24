import { z } from "zod";

const rubricCriterionLevelSchema = z.object({
  title: z.string().min(1),
  points: z.number().int().min(0),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const rubricCriterionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  maxPoints: z.number().int().min(0),
  sortOrder: z.number().int().optional(),
  levels: z.array(rubricCriterionLevelSchema).optional(),
});

export const createRubricSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  criteria: z.array(rubricCriterionSchema).min(1),
});

const criterionGradeSchema = z.object({
  criterionId: z.string().uuid(),
  levelId: z.string().uuid().optional(),
  pointsEarned: z.number().int().min(0),
  feedback: z.string().optional(),
});

export const submitRubricGradesSchema = z.object({
  criterionGrades: z.array(criterionGradeSchema).min(1),
});
