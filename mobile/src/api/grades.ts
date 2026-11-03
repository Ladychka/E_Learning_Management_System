import { apiClient } from "./client";

export type GradeAppeal = {
  id: string;
  gradeId: string;
  studentId: string;
  reason: string;
  status: string;
  response?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

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
  assignment?: { id: string; title: string; maxPoints?: number } | null;
  quiz?: { id: string; title: string } | null;
  grader?: { firstName: string; lastName: string } | null;
  appeals?: GradeAppeal[];
};

export async function getMyGrades(courseId?: string) {
  const response = await apiClient.get("/grades/my-grades", {
    params: { ...(courseId ? { courseId } : {}), limit: 50 },
  });
  return (response.data?.data ?? []) as Grade[];
}

export async function getGrade(gradeId: string) {
  const response = await apiClient.get(`/grades/${gradeId}`);
  return response.data.data as Grade;
}

export async function appealGrade(gradeId: string, reason: string) {
  const response = await apiClient.post(`/grades/${gradeId}/appeal`, {
    reason,
  });
  return response.data.data as GradeAppeal;
}
