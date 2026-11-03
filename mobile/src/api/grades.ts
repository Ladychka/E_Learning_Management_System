import { apiClient } from "./client";

export type Grade = {
  id: string;
  studentId?: string;
  courseId: string;
  assignmentId?: string | null;
  quizId?: string | null;
  points: string | number;
  maxPoints: string | number;
  percentage: string | number;
  letterGrade?: string | null;
  passFail?: string | null;
  feedback?: string | null;
  isPublished?: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  course?: { id: string; title: string };
  assignment?: { id: string; title: string } | null;
  quiz?: { id: string; title: string } | null;
  grader?: { firstName: string; lastName: string } | null;
};

export async function getMyGrades(courseId?: string) {
  const response = await apiClient.get("/grades/my-grades", {
    params: { ...(courseId ? { courseId } : {}), limit: 50 },
  });
  return (response.data?.data ?? []) as Grade[];
}
