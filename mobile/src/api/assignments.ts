import { apiClient } from "./client";

export type AssignmentAttachment = {
  name: string;
  url: string;
};

export type GradeSummary = {
  id: string;
  points: string | number;
  maxPoints: string | number;
  percentage: string | number;
  letterGrade?: string | null;
  passFail?: string | null;
  feedback?: string | null;
  isPublished?: boolean;
  publishedAt?: string | null;
  grader?: { firstName: string; lastName: string } | null;
};

export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  content?: string | null;
  fileUrls: string[];
  submittedAt: string;
  isLate: boolean;
  grade?: GradeSummary | null;
};

export type AssignmentSummary = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  maxPoints: number;
  dueDate?: string | null;
  allowLate: boolean;
  attachments?: AssignmentAttachment[] | null;
  isPublished: boolean;
  course: { id: string; title: string };
  creator?: { id: string; firstName: string; lastName: string };
  submission?: Submission | null;
  grade?: GradeSummary | null;
  _count?: { submissions?: number };
};

export type AssignmentDetail = AssignmentSummary & {
  submissions: Submission[];
};

export type SubmitAssignmentPayload = {
  content?: string;
  fileUrls?: string[];
};

export type UploadedFile = {
  url: string;
  originalName: string;
  mimeType?: string;
  size?: number;
};

export async function getAssignments(courseId?: string) {
  const response = await apiClient.get("/assignments", {
    params: { ...(courseId ? { courseId } : {}), limit: 50 },
  });
  return (response.data?.data ?? []) as AssignmentSummary[];
}

export async function getAssignment(assignmentId: string) {
  const response = await apiClient.get(`/assignments/${assignmentId}`);
  return response.data.data as AssignmentDetail;
}

export async function submitAssignment(
  assignmentId: string,
  payload: SubmitAssignmentPayload
) {
  const response = await apiClient.post(
    `/assignments/${assignmentId}/submit`,
    payload
  );
  return response.data.data as Submission;
}

export async function uploadSubmissionFile(asset: {
  uri: string;
  name: string;
  mimeType?: string;
  file?: File;
}) {
  const formData = new FormData();

  if (asset.file) {
    formData.append("file", asset.file, asset.name);
  } else {
    formData.append(
      "file",
      {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "application/octet-stream",
      } as any
    );
  }

  const response = await apiClient.post("/upload/submissions", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data as UploadedFile;
}
