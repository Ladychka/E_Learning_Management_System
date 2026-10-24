import { z } from "zod";

export const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  shortDesc: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().max(3).default("USD"),
  isFree: z.boolean().default(false),
  duration: z.number().min(0).optional(),
  language: z.string().max(10).default("en"),
  prerequisites: z.array(z.string()).optional(),
  learningOutcomes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const courseQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  categoryId: z.string().optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  search: z.string().optional(),
  instructorId: z.string().optional(),
  isFree: z.string().optional(),
  sortBy: z.string().optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  icon: z.string().max(200).optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().default(0),
});

export const updateCategorySchema = createCategorySchema.partial();