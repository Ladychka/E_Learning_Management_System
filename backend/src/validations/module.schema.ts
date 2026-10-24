import { z } from "zod";

export const createModuleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateModuleSchema = createModuleSchema.partial().extend({
  isPublished: z.boolean().optional(),
});

export const reorderModulesSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ).min(1),
});
