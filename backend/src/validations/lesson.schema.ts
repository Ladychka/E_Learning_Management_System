import { z } from "zod";

export const createLessonSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  contentType: z.enum(["video", "pdf", "text", "quiz"]).default("text"),
  contentUrl: z.string().max(2000).optional(),
  duration: z.number().int().min(0).optional(),
  isPublished: z.boolean().default(false),
  isPreview: z.boolean().default(false),
  sortOrder: z.number().int().min(0).optional(),
  attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  dripDays: z.number().int().min(0).optional(),
});

export const updateLessonSchema = createLessonSchema.partial();

export const reorderLessonsSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ).min(1),
});
