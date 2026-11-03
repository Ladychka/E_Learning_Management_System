import { apiClient } from "./client";

export type QuizQuestion = {
  id: string;
  type: string;
  question: string;
  options?: string[] | null;
  points: number;
  sortOrder?: number;
};

export type QuizAttempt = {
  id: string;
  quizId?: string;
  userId?: string;
  status: string;
  score: number;
  maxScore: number;
  percentage: string | number | null;
  attemptNumber: number;
  timeLimit?: number | null;
  startedAt: string;
  submittedAt?: string | null;
};

export type CourseQuiz = {
  id: string;
  lessonId: string;
  title: string;
  description?: string | null;
  timeLimit?: number | null;
  maxAttempts?: number | null;
  passingScore?: number | null;
  isPublished?: boolean;
  questionCount: number;
  lesson: {
    id: string;
    title: string;
    moduleId: string;
    moduleTitle: string;
  };
  attemptCount: number;
  completedAttempts: number;
  remainingAttempts: number | null;
  bestPercentage: number | null;
  lastAttempt: QuizAttempt | null;
};

export type QuizForLesson = {
  id: string;
  lessonId: string;
  title: string;
  description?: string | null;
  timeLimit?: number | null;
  maxAttempts?: number | null;
  passingScore?: number | null;
  isPublished: boolean;
  questions: QuizQuestion[];
};

export type QuizStatus = {
  attempts: QuizAttempt[];
  totalAttempts: number;
  completedCount: number;
  remainingAttempts: number | null;
  maxAttempts: number | null;
  timeLimit: number | null;
};

export type QuizResultQuestion = {
  id: string;
  question: string;
  type: string;
  options?: string[] | null;
  correctAnswer?: string | null;
  points: number;
};

export type QuizResultAnswer = {
  id: string;
  questionId: string;
  answer: string;
  isCorrect: boolean | null;
  pointsEarned: number;
  question: QuizResultQuestion;
};

export type QuizResult = QuizAttempt & {
  quiz: {
    id: string;
    title: string;
    passingScore?: number | null;
    timeLimit?: number | null;
    maxAttempts?: number | null;
  };
  answers: QuizResultAnswer[];
};

export type AttemptAnswerInput = {
  questionId: string;
  answer: string;
};

export type StartAttemptResult = {
  attempt: QuizAttempt & {
    quiz?: {
      title: string;
      timeLimit?: number | null;
      maxAttempts?: number | null;
      passingScore?: number | null;
    };
  };
  questions: QuizQuestion[];
};

export async function getCourseQuizzes(courseId: string) {
  const response = await apiClient.get(`/courses/${courseId}/quizzes`);
  return (response.data?.data ?? []) as CourseQuiz[];
}

export async function getQuizForLesson(lessonId: string) {
  const response = await apiClient.get(`/lessons/${lessonId}/quiz`);
  return response.data.data as QuizForLesson;
}

export async function getQuizStatus(quizId: string) {
  const response = await apiClient.get(`/quizzes/${quizId}/status`);
  return response.data.data as QuizStatus;
}

export async function startQuizAttempt(quizId: string) {
  const response = await apiClient.post("/quizzes/attempts", { quizId });
  return response.data.data as StartAttemptResult;
}

export async function submitQuizAttempt(
  attemptId: string,
  answers: AttemptAnswerInput[]
) {
  const response = await apiClient.post(
    `/quizzes/attempts/${attemptId}/submit`,
    { answers }
  );
  return response.data.data as QuizResult;
}

export async function getQuizResults(attemptId: string) {
  const response = await apiClient.get(
    `/quizzes/attempts/${attemptId}/results`
  );
  return response.data.data as QuizResult;
}

export async function getMyQuizAttempts(quizId?: string) {
  const response = await apiClient.get("/quizzes/my-attempts", {
    params: quizId ? { quizId } : undefined,
  });
  return (response.data?.data ?? []) as (QuizAttempt & {
    quiz: { title: string; lessonId: string };
  })[];
}
