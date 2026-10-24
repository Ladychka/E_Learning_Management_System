import { z } from "zod";

export const createGradeCategorySchema = z.object({
  name: z.string().min(1).max(100),
  weight: z.number().int().min(0).max(100),
  sortOrder: z.number().int().optional(),
});

export const updateGradeCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  weight: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().optional(),
});
