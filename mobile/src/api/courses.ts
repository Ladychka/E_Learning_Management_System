import { apiClient } from "./client";

export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type InstructorSummary = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
};

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
};

export type CourseSummary = {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc?: string | null;
  thumbnailUrl?: string | null;
  price?: string | number | null;
  currency?: string;
  isFree: boolean;
  level?: CourseLevel | string | null;
  duration?: number | null;
  language?: string | null;
  status?: string;
  tags?: string[];
  prerequisites?: string[];
  learningOutcomes?: string[];
  createdAt?: string;
  publishedAt?: string | null;
  instructor: InstructorSummary;
  category?: CategorySummary | null;
  _count?: {
    enrollments?: number;
    modules?: number;
  };
};

export type CourseProgress = {
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
};

export type CourseLesson = {
  id: string;
  title: string;
  duration?: number | null;
  isPreview: boolean;
  isPublished?: boolean;
  sortOrder?: number;
  isCompleted?: boolean;
  contentType: string;
};

export type CourseModule = {
  id: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  lessons: CourseLesson[];
};

export type CourseDetail = CourseSummary & {
  modules: CourseModule[];
  progress?: CourseProgress | null;
};

export type EnrollmentStatus = "active" | "completed" | "dropped" | "expired";

export type Enrollment = {
  id: string;
  courseId: string;
  status: EnrollmentStatus;
  progressPercent: number;
  enrolledAt: string;
  completedAt?: string | null;
  expiresAt?: string | null;
};

export type MyEnrollment = Enrollment & {
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    status?: string;
    instructor?: {
      firstName: string;
      lastName: string;
    } | null;
  };
};

export type CourseListParams = {
  search?: string;
  level?: string;
  categoryId?: string;
  isFree?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
};

export type CourseListResult = {
  courses: CourseSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function getCourses(params: CourseListParams = {}) {
  const response = await apiClient.get("/courses", { params });
  return {
    courses: (response.data?.data ?? []) as CourseSummary[],
    meta: response.data?.meta ?? {
      page: 1,
      limit: 0,
      total: 0,
      totalPages: 0,
    },
  } as CourseListResult;
}

export async function getCourse(courseId: string) {
  const response = await apiClient.get(`/courses/${courseId}`);
  return response.data.data as CourseDetail;
}

export async function selfEnroll(courseId: string) {
  const response = await apiClient.post("/enrollments/enroll", { courseId });
  return response.data.data as Enrollment;
}

export async function getMyEnrollments() {
  const response = await apiClient.get("/enrollments/my-enrollments", {
    params: { limit: 50 },
  });
  return {
    enrollments: (response.data?.data ?? []) as MyEnrollment[],
    meta: response.data?.meta ?? {
      page: 1,
      limit: 0,
      total: 0,
      totalPages: 0,
    },
  };
}

export function hasActiveEnrollment(
  enrollments: Enrollment[],
  courseId: string | undefined
) {
  if (!courseId) return false;
  return enrollments.some(
    (enrollment) =>
      enrollment.courseId === courseId &&
      (enrollment.status === "active" || enrollment.status === "completed")
  );
}
