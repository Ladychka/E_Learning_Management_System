import { apiClient } from "./client";

export type CommentAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role?: string;
};

export type LessonComment = {
  id: string;
  lessonId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  user: CommentAuthor;
  replies?: LessonComment[];
};

export async function getLessonComments(lessonId: string) {
  const response = await apiClient.get(`/lessons/${lessonId}/comments`);
  return (response.data?.data ?? []) as LessonComment[];
}

export async function createLessonComment(lessonId: string, content: string) {
  const response = await apiClient.post(`/lessons/${lessonId}/comments`, {
    content,
  });
  return response.data.data as LessonComment;
}

export async function deleteLessonComment(commentId: string) {
  await apiClient.delete(`/comments/${commentId}`);
}
