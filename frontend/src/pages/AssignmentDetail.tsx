import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { assignmentApi, uploadApi } from "@/lib/api";
import {
  ArrowLeft,
  Loader2,
  Clock,
  AlertCircle,
  CheckCircle,
  Upload,
  FileText,
  Trash2,
  Send,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";

interface Submission {
  id: string;
  content?: string;
  fileUrls: string[];
  submittedAt: string;
  isLate: boolean;
  grade?: {
    points: number;
    maxPoints: number;
    percentage: number;
    feedback?: string;
    passFail: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  maxPoints: number;
  dueDate?: string;
  allowLate: boolean;
  isPublished: boolean;
  attachments: { name: string; url: string }[];
  course: { id: string; title: string };
  creator: { firstName: string; lastName: string };
  submissions: Submission[];
}

export const AssignmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    loadAssignment();
  }, [id]);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      const res = await assignmentApi.getAssignment(id!);
      const data = res.data.data as Assignment;
      setAssignment(data);
      if (data.submissions.length > 0) {
        const latest = data.submissions[0];
        setContent(latest.content || "");
        setFiles(
          latest.fileUrls.map((url, idx) => ({
            name: `Attachment ${idx + 1}`,
            url,
          }))
        );
      }
    } catch {
      toast.error("Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date() > new Date(dueDate);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadProgress(0);
      const res = await uploadApi.uploadFile("submissions", file, (p) =>
        setUploadProgress(p)
      );
      const url = res.data.data?.url || res.data.data;
      setFiles((prev) => [...prev, { name: file.name, url }]);
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await assignmentApi.submitAssignment(id, {
        content,
        fileUrls: files.map((f) => f.url),
      });
      toast.success("Assignment submitted successfully");
      loadAssignment();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="py-12 text-center text-gray-500">
        Assignment not found.
        <div className="mt-4">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="mr-1 h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const overdue = isOverdue(assignment.dueDate);
  const existingSubmission = assignment.submissions[0];
  const canSubmit =
    !overdue || assignment.allowLate || !existingSubmission;

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{assignment.title}</h1>
          <p className="text-sm text-gray-500">
            <Link
              to={`/courses/${assignment.course.id}`}
              className="text-primary-600 hover:underline"
            >
              {assignment.course.title}
            </Link>
            {" "}· {assignment.creator.firstName} {assignment.creator.lastName}
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-gray-500">
            <BookOpen className="h-4 w-4" />
            {assignment.maxPoints} points
          </div>
          {assignment.dueDate && (
            <div
              className={`flex items-center gap-1 ${
                overdue ? "text-red-600" : "text-gray-500"
              }`}
            >
              <Clock className="h-4 w-4" />
              Due: {new Date(assignment.dueDate).toLocaleString()}
              {overdue && (
                <span className="ml-1 font-medium">(Overdue)</span>
              )}
            </div>
          )}
          {assignment.allowLate && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertCircle className="h-4 w-4" />
              Late submissions allowed
            </div>
          )}
        </div>

        {/* Description */}
        {assignment.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Description</h3>
            <p className="mt-1 whitespace-pre-wrap text-gray-600">
              {assignment.description}
            </p>
          </div>
        )}

        {/* Instructions */}
        {assignment.instructions && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Instructions
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-gray-600">
              {assignment.instructions}
            </p>
          </div>
        )}

        {/* Attachments */}
        {assignment.attachments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Attachments
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {assignment.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border bg-gray-50 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FileText className="h-4 w-4" />
                  {att.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Existing submission */}
      {existingSubmission && (
        <div className="card mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Submission</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                existingSubmission.isLate
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {existingSubmission.isLate ? "Late" : "On Time"}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Submitted on{" "}
            {new Date(existingSubmission.submittedAt).toLocaleString()}
          </p>
          {existingSubmission.content && (
            <div className="mt-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
              {existingSubmission.content}
            </div>
          )}
          {existingSubmission.fileUrls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {existingSubmission.fileUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50"
                >
                  <FileText className="h-4 w-4" />
                  File {idx + 1}
                </a>
              ))}
            </div>
          )}
          {existingSubmission.grade && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">
                  Graded: {existingSubmission.grade.points} /{" "}
                  {existingSubmission.grade.maxPoints} (
                  {existingSubmission.grade.percentage}%)
                </span>
              </div>
              {existingSubmission.grade.feedback && (
                <p className="mt-2 text-sm text-green-700">
                  Feedback: {existingSubmission.grade.feedback}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submission form */}
      {canSubmit && (
        <div className="card mt-6 space-y-4">
          <h3 className="text-lg font-semibold">
            {existingSubmission ? "Resubmit Assignment" : "Submit Assignment"}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Your Answer
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your response here..."
              className="input mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Attachments
            </label>
            <div className="mt-2 flex items-center gap-3">
              <label className="btn-secondary cursor-pointer">
                <Upload className="mr-1 h-4 w-4" /> Upload File
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploadProgress !== null}
                />
              </label>
              {uploadProgress !== null && (
                <span className="text-sm text-gray-500">
                  Uploading... {uploadProgress}%
                </span>
              )}
            </div>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((file, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-gray-400" />
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {overdue && assignment.allowLate && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
              <AlertCircle className="h-4 w-4" />
              This submission will be marked as late.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-1 h-4 w-4" />
                  {existingSubmission ? "Resubmit" : "Submit"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {!canSubmit && !existingSubmission && (
        <div className="card mt-6 flex items-center gap-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>
            The deadline has passed and late submissions are not allowed.
          </span>
        </div>
      )}
    </div>
  );
};
