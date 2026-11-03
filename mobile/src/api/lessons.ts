import { apiClient } from "./client";
import type { CourseModule, CourseProgress } from "./courses";

export type LessonAttachment = {
  name?: string;
  url: string;
  type?: string;
};

export type LessonQuizSummary = {
  id: string;
  title: string;
  description?: string | null;
  isPublished?: boolean;
  timeLimit?: number | null;
  maxAttempts?: number | null;
  passingScore?: number | null;
  questions?: { id: string; type?: string }[];
};

export type LessonDetail = {
  id: string;
  moduleId: string;
  title: string;
  description?: string | null;
  contentType: string;
  contentUrl?: string | null;
  duration?: number | null;
  isPublished: boolean;
  isPreview: boolean;
  sortOrder?: number;
  attachments?: LessonAttachment[] | null;
  dripDays?: number | null;
  version?: number;
  isCompleted?: boolean;
  module: {
    id: string;
    title: string;
    isPublished?: boolean;
    course: {
      id: string;
      title: string;
      modules: CourseModule[];
    };
  };
  quiz?: LessonQuizSummary | null;
  courseProgress?: CourseProgress | null;
};

export type CompleteLessonResult = CourseProgress & {
  lessonId: string;
  isCompleted: boolean;
  enrollment?: {
    id: string;
    status: string;
    progressPercent: number;
  } | null;
};

export async function getLesson(lessonId: string) {
  const response = await apiClient.get(`/lessons/${lessonId}`);
  return response.data.data as LessonDetail;
}

export async function completeLesson(lessonId: string) {
  const response = await apiClient.post(`/lessons/${lessonId}/complete`);
  return response.data.data as CompleteLessonResult;
}
