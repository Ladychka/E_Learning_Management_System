import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

// Let axios set Content-Type per request. Forcing application/json here makes
// FormData uploads serialize as JSON (the file is lost).
export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Don't intercept 401s from auth endpoints (login/register/etc.)
    const isAuthEndpoint = originalRequest.url?.startsWith("/auth/");
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          localStorage.setItem("accessToken", res.data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  register: (data: Record<string, unknown>) => api.post("/auth/register", data),
  login: (data: Record<string, unknown>) => api.post("/auth/login", data),
  logout: (refreshToken?: string) => api.post("/auth/logout", { refreshToken }),
  me: () => api.get("/auth/me"),
  updateProfile: (data: Record<string, unknown>) => api.patch("/auth/profile", data),
  changePassword: (data: Record<string, unknown>) => api.post("/auth/change-password", data),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (data: Record<string, unknown>) => api.post("/auth/reset-password", data),
  verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`),
  deactivate: (password: string) => api.post("/auth/deactivate", { password }),
};

// User endpoints
export const userApi = {
  getUsers: (params?: Record<string, string>) => api.get("/users", { params }),
  getUser: (id: string) => api.get(`/users/${id}`),
  createUser: (data: Record<string, unknown>) => api.post("/users", data),
  updateUser: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  suspendUser: (id: string) => api.post(`/users/${id}/suspend`),
  reactivateUser: (id: string) => api.post(`/users/${id}/reactivate`),
};

// Course endpoints
export const courseApi = {
  getCourses: (params?: Record<string, string>) => api.get("/courses", { params }),
  getCourse: (id: string) => api.get(`/courses/${id}`),
  createCourse: (data: Record<string, unknown>) => api.post("/courses", data),
  updateCourse: (id: string, data: Record<string, unknown>) => api.patch(`/courses/${id}`, data),
  deleteCourse: (id: string) => api.delete(`/courses/${id}`),
};

// Category endpoints
export const categoryApi = {
  getCategories: () => api.get("/categories"),
  getCategory: (id: string) => api.get(`/categories/${id}`),
  createCategory: (data: Record<string, unknown>) => api.post("/categories", data),
  updateCategory: (id: string, data: Record<string, unknown>) => api.patch(`/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
};

// Module endpoints
export const moduleApi = {
  getModules: (courseId: string) => api.get(`/courses/${courseId}/modules`),
  createModule: (courseId: string, data: Record<string, unknown>) => api.post(`/courses/${courseId}/modules`, data),
  updateModule: (courseId: string, id: string, data: Record<string, unknown>) => api.patch(`/courses/${courseId}/modules/${id}`, data),
  deleteModule: (courseId: string, id: string) => api.delete(`/courses/${courseId}/modules/${id}`),
  reorderModules: (courseId: string, orders: { id: string; sortOrder: number }[]) => api.post(`/courses/${courseId}/modules/reorder`, { orders }),
};

// Lesson endpoints
export const lessonApi = {
  getLessons: (moduleId: string) => api.get(`/modules/${moduleId}/lessons`),
  createLesson: (moduleId: string, data: Record<string, unknown>) => api.post(`/modules/${moduleId}/lessons`, data),
  getLesson: (id: string) => api.get(`/lessons/${id}`),
  updateLesson: (id: string, data: Record<string, unknown>) => api.patch(`/lessons/${id}`, data),
  deleteLesson: (id: string) => api.delete(`/lessons/${id}`),
  reorderLessons: (moduleId: string, orders: { id: string; sortOrder: number }[]) => api.post(`/modules/${moduleId}/lessons/reorder`, { orders }),
};

// Quiz endpoints
export const quizApi = {
  getQuiz: (lessonId: string) => api.get(`/lessons/${lessonId}/quiz`),
  createQuiz: (lessonId: string, data: Record<string, unknown>) => api.post(`/lessons/${lessonId}/quiz`, data),
  deleteQuiz: (lessonId: string) => api.delete(`/lessons/${lessonId}/quiz`),
  addQuestion: (quizId: string, data: Record<string, unknown>) => api.post(`/quizzes/${quizId}/questions`, data),
  updateQuestion: (quizId: string, questionId: string, data: Record<string, unknown>) => api.patch(`/quizzes/${quizId}/questions/${questionId}`, data),
  deleteQuestion: (quizId: string, questionId: string) => api.delete(`/quizzes/${quizId}/questions/${questionId}`),
  reorderQuestions: (quizId: string, orders: { id: string; sortOrder: number }[]) => api.post(`/quizzes/${quizId}/questions/reorder`, { orders }),
};

// Upload endpoint
export const uploadApi = {
  uploadFile: (folder: string, file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/upload/${folder}`, formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    });
  },
};

// Enrollment endpoints
export const enrollmentApi = {
  selfEnroll: (courseId: string) => api.post("/enrollments/enroll", { courseId }),
  adminEnroll: (data: Record<string, unknown>) => api.post("/enrollments", data),
  getMyEnrollments: (params?: Record<string, string>) => api.get("/enrollments/my-enrollments", { params }),
  getEnrollments: (params?: Record<string, string>) => api.get("/enrollments", { params }),
  unenroll: (id: string) => api.delete(`/enrollments/${id}`),
  bulkEnroll: (data: Record<string, unknown>) => api.post("/enrollments/bulk", data),
};

// Assignment endpoints
export const assignmentApi = {
  getAssignments: (courseId?: string) => api.get("/assignments", { params: courseId ? { courseId } : undefined }),
  getAssignment: (id: string) => api.get(`/assignments/${id}`),
  createAssignment: (data: Record<string, unknown>) => api.post("/assignments", data),
  submitAssignment: (id: string, data: Record<string, unknown>) => api.post(`/assignments/${id}/submit`, data),
};

// Quiz attempt endpoints
export const quizAttemptApi = {
  startAttempt: (quizId: string) => api.post("/quizzes/attempts", { quizId }),
  submitAttempt: (attemptId: string, data: Record<string, unknown>) =>
    api.post(`/quizzes/attempts/${attemptId}/submit`, data),
  getMyAttempts: (quizId: string) => api.get("/quizzes/my-attempts", { params: { quizId } }),
  getResults: (attemptId: string) => api.get(`/quizzes/attempts/${attemptId}/results`),
  getStatus: (quizId: string) => api.get(`/quizzes/${quizId}/status`),
};

// Grade endpoints
export const gradeApi = {
  getGrades: (params?: Record<string, string>) => api.get("/grades", { params }),
  getMyGrades: (params?: Record<string, string>) => api.get("/grades/my-grades", { params }),
  getGrade: (id: string) => api.get(`/grades/${id}`),
  createGrade: (data: Record<string, unknown>) => api.post("/grades", data),
  updateGrade: (id: string, data: Record<string, unknown>) => api.patch(`/grades/${id}`, data),
  publishGrade: (id: string) => api.post(`/grades/${id}/publish`),
  exportGradebook: (params?: Record<string, string>) =>
    api.get("/grades/export", { params, responseType: "blob" }),
  appealGrade: (id: string, reason: string) => api.post(`/grades/${id}/appeal`, { reason }),
  getCourseGPA: (courseId: string) => api.get(`/grades/course/${courseId}/gpa`),
};

// Payment endpoints
export const paymentApi = {
  checkout: (data: Record<string, unknown>, headers?: Record<string, string>) =>
    api.post("/payments/checkout", data, { headers }),
  confirmPayment: (id: string, data: { status: string; gatewayRef?: string }) =>
    api.post(`/payments/${id}/confirm`, data),
  refundPayment: (id: string, reason: string) =>
    api.post(`/payments/${id}/refund`, { reason }),
  getPaymentHistory: (params?: Record<string, string>) => api.get("/payments/history", { params }),
  getPayment: (id: string) => api.get(`/payments/${id}`),
  getPaymentQr: (id: string) => api.get(`/payments/${id}/qr`),
  getInvoice: (id: string) => api.get(`/payments/${id}/invoice`),
  validateCoupon: (code: string, courseId?: string) => api.post("/payments/coupons/validate", { code, courseId }),
};

// Subscription endpoints
export const subscriptionApi = {
  getPlans: () => api.get("/payments/subscriptions"),
  createPlan: (data: Record<string, unknown>) => api.post("/payments/subscriptions", data),
};

// Certificate endpoints
export const certificateApi = {
  getMyCertificates: (params?: Record<string, string>) => api.get("/certificates/my-certificates", { params }),
  getCertificate: (id: string) => api.get(`/certificates/${id}`),
  verifyCertificate: (number: string) => api.get(`/certificates/verify/${number}`),
};

// Grade category endpoints (US-053)
export const gradeCategoryApi = {
  getGradeCategories: (courseId: string) => api.get(`/courses/${courseId}/grade-categories`),
  createGradeCategory: (courseId: string, data: { name: string; weight: number; sortOrder?: number }) =>
    api.post(`/courses/${courseId}/grade-categories`, data),
  updateGradeCategory: (id: string, data: { name?: string; weight?: number; sortOrder?: number }) =>
    api.patch(`/grade-categories/${id}`, data),
  deleteGradeCategory: (id: string) => api.delete(`/grade-categories/${id}`),
  getOverallGrades: (courseId: string) => api.get(`/courses/${courseId}/overall-grades`),
};

// Rubric endpoints (US-054)
export const rubricApi = {
  getRubricByAssignment: (assignmentId: string) => api.get(`/assignments/${assignmentId}/rubric`),
  createOrUpdateRubric: (assignmentId: string, data: Record<string, unknown>) =>
    api.post(`/assignments/${assignmentId}/rubric`, data),
  deleteRubric: (id: string) => api.delete(`/rubrics/${id}`),
  submitRubricGrades: (
    gradeId: string,
    data: {
      criterionGrades: Array<{
        criterionId: string;
        levelId?: string;
        pointsEarned: number;
        feedback?: string;
      }>;
    }
  ) => api.post(`/grades/${gradeId}/rubric-grades`, data),
  getRubricGrades: (gradeId: string) => api.get(`/grades/${gradeId}/rubric-grades`),
};

// Notification endpoints (US-060, US-065)
export const notificationApi = {
  getMyNotifications: (params?: { page?: number; limit?: number }) =>
    api.get("/notifications/my", { params }),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/read-all"),
  getUnreadCount: () => api.get("/notifications/unread-count"),
};

// Comment endpoints (US-062)
export const commentApi = {
  getLessonComments: (lessonId: string) => api.get(`/lessons/${lessonId}/comments`),
  createComment: (lessonId: string, data: { content: string; parentId?: string }) =>
    api.post(`/lessons/${lessonId}/comments`, data),
  deleteComment: (id: string) => api.delete(`/comments/${id}`),
};

// Announcement endpoints (US-064)
export const announcementApi = {
  getMyAnnouncements: (params?: { page?: number; limit?: number }) =>
    api.get("/announcements/my", { params }),
  getCourseAnnouncements: (courseId: string) =>
    api.get(`/courses/${courseId}/announcements`),
  createCourseAnnouncement: (courseId: string, data: { title: string; content: string; priority?: string }) =>
    api.post(`/courses/${courseId}/announcements`, data),
  createGlobalAnnouncement: (data: { title: string; content: string; priority?: string }) =>
    api.post("/announcements", data),
  markRead: (id: string) => api.post(`/announcements/${id}/read`),
  deleteAnnouncement: (id: string) => api.delete(`/announcements/${id}`),
};

// Reports and Analytics endpoints (US-081 to US-090)
export const reportApi = {
  getCompletionStats: (params?: { courseId?: string; startDate?: string; endDate?: string }) =>
    api.get("/reports/completion", { params }),
  getStudentProgress: (params?: { studentId?: string; courseId?: string }) =>
    api.get("/reports/students", { params }),
  getAssessmentPerformance: (courseId: string) =>
    api.get(`/reports/assessments/${courseId}`),
  getQuizItemAnalysis: (quizId: string) =>
    api.get(`/reports/quizzes/${quizId}/item-analysis`),
  getRevenueAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/reports/revenue", { params }),
  exportReportCsv: (type: "completion" | "revenue" | "students") =>
    api.get(`/reports/export/${type}`, { responseType: "blob" }),
  getExportUrl: (type: "completion" | "revenue" | "students") => {
    const token = localStorage.getItem("accessToken");
    return token
      ? `${API_BASE_URL}/reports/export/${type}?token=${encodeURIComponent(token)}`
      : `${API_BASE_URL}/reports/export/${type}`;
  },
};

// Settings & Branding endpoints (US-091, US-093)
export const settingApi = {
  getPublicSettings: () => api.get("/settings/public"),
  getAllSettings: () => api.get("/settings"),
  updateSettings: (settings: Array<{ key: string; value: string; type?: string; group?: string; isPublic?: boolean }>) =>
    api.put("/settings", { settings }),
};

// Audit logs endpoints (US-096)
export const auditApi = {
  getAuditLogs: (params?: { page?: number; limit?: number; userId?: string; action?: string; entity?: string }) =>
    api.get("/audit-logs", { params }),
};

// Backup endpoints (US-094, US-095)
export const backupApi = {
  getBackupStatus: () => api.get("/backup/status"),
  exportBackup: () => api.get("/backup/export", { responseType: "blob" }),
  getBackupExportUrl: () => {
    const token = localStorage.getItem("accessToken");
    return token
      ? `${API_BASE_URL}/backup/export?token=${encodeURIComponent(token)}`
      : `${API_BASE_URL}/backup/export`;
  },
};