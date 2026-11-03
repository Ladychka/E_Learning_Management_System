import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { gradeApi } from "@/lib/api";
import { ArrowLeft, Loader2, AlertCircle, Award } from "lucide-react";
import toast from "react-hot-toast";

export function GradeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [grade, setGrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const res = await gradeApi.getGrade(id);
        setGrade(res.data.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load grade");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !grade) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
        <p className="text-sm text-slate-600">{error || "Grade not found"}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const assessment =
    grade.assignment?.title || grade.quiz?.title || "Assessment";
  const percentage = Number(grade.percentage || 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {assessment}
            </h1>
            <p className="text-sm text-slate-500">{grade.course?.title}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              grade.passFail === "pass"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {grade.passFail === "pass" ? "PASS" : "FAIL"}
          </span>
        </div>

        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <Award className="h-10 w-10 text-emerald-600" />
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {Number(grade.points)} / {Number(grade.maxPoints)}
            </p>
            <p className="text-xs text-slate-500">
              {percentage.toFixed(2)}%
              {grade.letterGrade ? ` • Grade ${grade.letterGrade}` : ""}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Student
          </h2>
          <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
            {grade.student
              ? `${grade.student.firstName} ${grade.student.lastName} (${grade.student.email})`
              : "—"}
          </p>
        </div>

        {grade.feedback && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Feedback
            </h2>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
              {grade.feedback}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800">
          <span>
            Graded by{" "}
            {grade.grader
              ? `${grade.grader.firstName} ${grade.grader.lastName}`
              : "—"}
          </span>
          <span>{grade.isPublished ? "Published" : "Draft"}</span>
        </div>

        {!grade.isPublished && (
          <button
            onClick={async () => {
              try {
                await gradeApi.publishGrade(grade.id);
                toast.success("Grade published");
                setGrade({ ...grade, isPublished: true });
              } catch (err: any) {
                toast.error(err?.response?.data?.message || "Failed to publish");
              }
            }}
            className="btn-primary w-full py-2.5 text-sm"
          >
            Publish Grade
          </button>
        )}
      </div>
    </div>
  );
}
