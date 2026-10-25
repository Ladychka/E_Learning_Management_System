import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { assignmentApi, uploadApi, rubricApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
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
  Scale,
  Plus,
  X,
  FileCheck2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

interface RubricLevel {
  id?: string;
  title: string;
  points: number;
  description?: string;
}

interface RubricCriterion {
  id?: string;
  title: string;
  description?: string;
  maxPoints: number;
  levels: RubricLevel[];
}

interface Rubric {
  id: string;
  title: string;
  description?: string;
  totalMaxPoints: number;
  criteria: RubricCriterion[];
}

interface RubricGradeItem {
  id: string;
  criterionId: string;
  levelId?: string;
  pointsEarned: number;
  feedback?: string;
  criterion: {
    title: string;
    maxPoints: number;
  };
}

interface Submission {
  id: string;
  content?: string;
  fileUrls: string[];
  submittedAt: string;
  isLate: boolean;
  grade?: {
    id?: string;
    points: number;
    maxPoints: number;
    percentage: number;
    feedback?: string;
    passFail: string;
    letterGrade?: string;
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
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<{ name: string; url: string; size?: number }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Rubric state (US-054)
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [rubricGrades, setRubricGrades] = useState<RubricGradeItem[]>([]);
  const [showRubricBuilder, setShowRubricBuilder] = useState(false);
  const [rubricTitle, setRubricTitle] = useState("");
  const [rubricDesc, setRubricDesc] = useState("");
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [savingRubric, setSavingRubric] = useState(false);
  const [rubricExpanded, setRubricExpanded] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

        if (latest.grade?.id) {
          loadRubricGrades(latest.grade.id);
        }
      }

      loadRubric();
    } catch {
      toast.error("Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

  const loadRubric = async () => {
    try {
      const res = await rubricApi.getRubricByAssignment(id!);
      if (res.data.data) {
        setRubric(res.data.data);
      }
    } catch {
      // Rubric may not exist yet
    }
  };

  const loadRubricGrades = async (gradeId: string) => {
    try {
      const res = await rubricApi.getRubricGrades(gradeId);
      if (res.data.data) {
        setRubricGrades(res.data.data);
      }
    } catch {
      // ignore
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date() > new Date(dueDate);
  };

  const getRemainingTimeText = (dueDate?: string) => {
    if (!dueDate) return null;
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff <= 0) {
      const overdueHours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
      if (overdueHours < 24) return `Overdue by ${overdueHours} hours`;
      const overdueDays = Math.floor(overdueHours / 24);
      return `Overdue by ${overdueDays} day${overdueDays > 1 ? "s" : ""}`;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const validateAndUploadFile = async (file: File) => {
    // 25MB limit
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(`File "${file.name}" exceeds the 25MB size limit.`);
      return;
    }

    try {
      setUploadProgress(0);
      const res = await uploadApi.uploadFile("submissions", file, (p) =>
        setUploadProgress(p)
      );
      const url = res.data.data?.url || res.data.data;
      setFiles((prev) => [...prev, { name: file.name, url, size: file.size }]);
      toast.success(`Uploaded ${file.name}`);
    } catch {
      toast.error(`Failed to upload ${file.name}`);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await validateAndUploadFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      for (let i = 0; i < droppedFiles.length; i++) {
        await validateAndUploadFile(droppedFiles[i]);
      }
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!id) return;
    if (!content.trim() && files.length === 0) {
      toast.error("Please provide written answer or upload files.");
      return;
    }
    try {
      setSubmitting(true);
      await assignmentApi.submitAssignment(id, {
        content,
        fileUrls: files.map((f) => f.url),
      });
      toast.success("Assignment submitted successfully!");
      loadAssignment();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Rubric Builder
  const openRubricBuilder = () => {
    if (rubric) {
      setRubricTitle(rubric.title);
      setRubricDesc(rubric.description || "");
      setCriteria(
        rubric.criteria.map((c) => ({
          title: c.title,
          description: c.description,
          maxPoints: c.maxPoints,
          levels: c.levels.map((l) => ({
            title: l.title,
            points: l.points,
            description: l.description,
          })),
        }))
      );
    } else {
      setRubricTitle(`${assignment?.title} Rubric`);
      setRubricDesc("Grading criteria and performance indicators");
      setCriteria([
        {
          title: "Technical Accuracy & Implementation",
          description: "Calculations, structure, and completeness of finance model",
          maxPoints: 50,
          levels: [
            { title: "Exemplary", points: 50, description: "Flawless execution, robust logic" },
            { title: "Proficient", points: 40, description: "Minor discrepancies, sound core logic" },
            { title: "Needs Improvement", points: 25, description: "Key calculations missing or flawed" },
          ],
        },
        {
          title: "Analysis & Financial Insight",
          description: "Depth of interpretation and sound economic reasoning",
          maxPoints: 50,
          levels: [
            { title: "Exemplary", points: 50, description: "Deep insight, thorough risk assessment" },
            { title: "Competent", points: 40, description: "Satisfactory interpretation of outputs" },
            { title: "Limited", points: 25, description: "Superficial observations" },
          ],
        },
      ]);
    }
    setShowRubricBuilder(true);
  };

  const handleSaveRubric = async () => {
    if (!rubricTitle.trim()) {
      toast.error("Please enter a rubric title");
      return;
    }
    if (criteria.length === 0) {
      toast.error("Please add at least one criterion");
      return;
    }

    setSavingRubric(true);
    try {
      await rubricApi.createOrUpdateRubric(id!, {
        title: rubricTitle,
        description: rubricDesc,
        criteria,
      });
      toast.success("Grading rubric saved successfully");
      setShowRubricBuilder(false);
      loadRubric();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save rubric");
    } finally {
      setSavingRubric(false);
    }
  };

  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        title: "New Criterion",
        description: "",
        maxPoints: 20,
        levels: [
          { title: "Excellent", points: 20, description: "Exceeds expectations" },
          { title: "Satisfactory", points: 15, description: "Meets expectations" },
          { title: "Developing", points: 10, description: "Below expectations" },
        ],
      },
    ]);
  };

  const removeCriterion = (idx: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
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
  const canSubmit = !overdue || assignment.allowLate || !existingSubmission;
  const isInstructorOrAdmin = user?.role === "INSTRUCTOR" || user?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-4xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{assignment.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Link
                to={`/courses/${assignment.course.id}`}
                className="text-primary-600 hover:underline font-medium"
              >
                {assignment.course.title}
              </Link>{" "}
              · Instructor: {assignment.creator.firstName} {assignment.creator.lastName}
            </p>
          </div>
        </div>

        {isInstructorOrAdmin && (
          <button
            type="button"
            onClick={openRubricBuilder}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Scale className="h-4 w-4 text-indigo-600" />
            {rubric ? "Edit Rubric" : "Create Rubric"}
          </button>
        )}
      </div>

      {/* Overview Card */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
            <BookOpen className="h-4 w-4 text-primary-600" />
            Maximum Points: {assignment.maxPoints}
          </div>

          {assignment.dueDate && (
            <div
              className={`flex items-center gap-1.5 font-medium ${
                overdue ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Due: {new Date(assignment.dueDate).toLocaleString()}</span>
              {getRemainingTimeText(assignment.dueDate) && (
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  {getRemainingTimeText(assignment.dueDate)}
                </span>
              )}
            </div>
          )}

          {assignment.allowLate && (
            <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
              <AlertCircle className="h-3.5 w-3.5" />
              Late submissions permitted
            </div>
          )}
        </div>

        {assignment.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Description</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
              {assignment.description}
            </p>
          </div>
        )}

        {assignment.instructions && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Instructions</h3>
            <div className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
              {assignment.instructions}
            </div>
          </div>
        )}

        {assignment.attachments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Instructor Materials</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {assignment.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 shadow-sm"
                >
                  <FileText className="h-4 w-4 text-primary-600" />
                  {att.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rubric Section (US-054) */}
      {rubric && (
        <div className="card space-y-3 border border-slate-200 dark:border-slate-800">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setRubricExpanded(!rubricExpanded)}
          >
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {rubric.title}
                </h3>
                <span className="text-xs text-gray-500">
                  Evaluated across {rubric.criteria.length} criteria ({rubric.totalMaxPoints} total points)
                </span>
              </div>
            </div>
            <button type="button" className="text-gray-400 hover:text-gray-600 p-1">
              {rubricExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {rubricExpanded && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 pt-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3 w-1/4">Criterion</th>
                    <th className="px-4 py-3">Performance Levels</th>
                    <th className="px-4 py-3 w-20 text-right">Max Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {rubric.criteria.map((crit, cIdx) => (
                    <tr key={cIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{crit.title}</div>
                        {crit.description && (
                          <p className="mt-1 text-gray-500">{crit.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {crit.levels.map((lvl, lIdx) => (
                            <div
                              key={lIdx}
                              className="p-2 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                            >
                              <div className="flex items-center justify-between font-medium text-indigo-700 dark:text-indigo-400">
                                <span>{lvl.title}</span>
                                <span>{lvl.points} pts</span>
                              </div>
                              {lvl.description && (
                                <p className="mt-1 text-gray-500 text-[11px] leading-tight">
                                  {lvl.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-right font-bold text-gray-700 dark:text-gray-300">
                        {crit.maxPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Existing Submission Details & Rubric Score Breakdown */}
      {existingSubmission && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold">Your Current Submission</h3>
              <p className="text-xs text-gray-500">
                Submitted on {new Date(existingSubmission.submittedAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                existingSubmission.isLate
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
              }`}
            >
              {existingSubmission.isLate ? "Submitted Late" : "Submitted On Time"}
            </span>
          </div>

          {existingSubmission.content && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {existingSubmission.content}
            </div>
          )}

          {existingSubmission.fileUrls.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Attached Files</h4>
              <div className="flex flex-wrap gap-2">
                {existingSubmission.fileUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50"
                  >
                    <FileText className="h-4 w-4" />
                    File {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Grade banner */}
          {existingSubmission.grade && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-bold text-base">
                    Graded: {existingSubmission.grade.points} / {existingSubmission.grade.maxPoints} ({existingSubmission.grade.percentage}%)
                  </span>
                  {existingSubmission.grade.letterGrade && (
                    <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold text-xs">
                      {existingSubmission.grade.letterGrade}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {existingSubmission.grade.passFail === "pass" ? "PASSED" : "FAILED"}
                </span>
              </div>

              {existingSubmission.grade.feedback && (
                <div className="text-xs text-emerald-800 dark:text-emerald-200 pt-1 border-t border-emerald-200/50 dark:border-emerald-900/50">
                  <span className="font-semibold">Instructor Feedback:</span> {existingSubmission.grade.feedback}
                </div>
              )}

              {/* Rubric Grades Breakdown if available */}
              {rubricGrades.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase text-emerald-900 dark:text-emerald-200 mb-2">
                    Rubric Scoring Breakdown
                  </h4>
                  <div className="space-y-1.5">
                    {rubricGrades.map((rg) => (
                      <div
                        key={rg.id}
                        className="flex items-center justify-between text-xs bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900"
                      >
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {rg.criterion.title}
                        </span>
                        <div className="flex items-center gap-3">
                          {rg.feedback && (
                            <span className="text-gray-500 italic text-[11px]">{rg.feedback}</span>
                          )}
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {rg.pointsEarned} / {rg.criterion.maxPoints} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submission Form (with Drag & Drop upload) */}
      {canSubmit && (
        <div className="card space-y-4">
          <h3 className="text-base font-semibold">
            {existingSubmission ? "Resubmit Your Work" : "Submit Assignment"}
          </h3>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Written Answer
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your explanation, answers, or working notes here..."
              className="input text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Upload Files (PDF, Excel, Word, ZIP, Images — Max 25MB each)
            </label>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-primary-500 bg-primary-50/50 dark:bg-primary-950/20"
                  : "border-slate-300 dark:border-slate-700 hover:border-primary-400 bg-slate-50/50 dark:bg-slate-800/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileInput}
                disabled={uploadProgress !== null}
              />
              <Upload className="mx-auto h-8 w-8 text-primary-500 mb-2" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drag and drop files here, or <span className="text-primary-600 font-semibold">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Supports PDF, DOCX, XLSX, ZIP, PNG, JPG up to 25MB</p>
            </div>

            {/* Progress indicator */}
            {uploadProgress !== null && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary-600 h-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Attached file list */}
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((file, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2 truncate font-medium">
                      <FileCheck2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {overdue && assignment.allowLate && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Notice: The deadline has passed. This submission will be recorded with a "Late" timestamp.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary inline-flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {existingSubmission ? "Resubmit Assignment" : "Submit Assignment"}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Overdue lockout notice */}
      {!canSubmit && !existingSubmission && (
        <div className="card flex items-center gap-3 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">
            The deadline has passed and late submissions are not permitted for this assignment.
          </span>
        </div>
      )}

      {/* Rubric Builder Modal (US-054) */}
      {showRubricBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-bold">Grading Rubric Builder (US-054)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRubricBuilder(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Rubric Title</label>
                <input
                  type="text"
                  value={rubricTitle}
                  onChange={(e) => setRubricTitle(e.target.value)}
                  className="input text-sm"
                  placeholder="e.g. Case Study Evaluation Rubric"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={rubricDesc}
                  onChange={(e) => setRubricDesc(e.target.value)}
                  className="input text-sm"
                  placeholder="Assessment expectations and evaluation scale"
                />
              </div>
            </div>

            {/* Criteria Editor */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Criteria ({criteria.length})
                </h4>
                <button
                  type="button"
                  onClick={addCriterion}
                  className="btn-secondary py-1 text-xs inline-flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Criterion
                </button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                {criteria.map((crit, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={crit.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCriteria((prev) =>
                              prev.map((c, i) => (i === cIdx ? { ...c, title: val } : c))
                            );
                          }}
                          placeholder="Criterion Title"
                          className="input py-1 text-sm font-semibold"
                        />
                        <input
                          type="text"
                          value={crit.description || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCriteria((prev) =>
                              prev.map((c, i) => (i === cIdx ? { ...c, description: val } : c))
                            );
                          }}
                          placeholder="Criterion Description"
                          className="input py-1 text-xs text-gray-600"
                        />
                      </div>
                      <div className="w-24 text-right">
                        <label className="block text-[10px] text-gray-500 uppercase font-semibold">Max Pts</label>
                        <input
                          type="number"
                          min="1"
                          value={crit.maxPoints}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setCriteria((prev) =>
                              prev.map((c, i) => (i === cIdx ? { ...c, maxPoints: val } : c))
                            );
                          }}
                          className="input py-1 text-sm font-bold text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCriterion(cIdx)}
                        className="text-rose-500 hover:text-rose-700 p-1 mt-1"
                        title="Delete Criterion"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Levels */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <div className="text-[11px] font-semibold text-gray-500 uppercase">
                        Performance Levels
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {crit.levels.map((lvl, lIdx) => (
                          <div
                            key={lIdx}
                            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-1.5"
                          >
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={lvl.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCriteria((prev) =>
                                    prev.map((c, i) =>
                                      i === cIdx
                                        ? {
                                            ...c,
                                            levels: c.levels.map((l, j) =>
                                              j === lIdx ? { ...l, title: val } : l
                                            ),
                                          }
                                        : c
                                    )
                                  );
                                }}
                                placeholder="Level Title"
                                className="input py-0.5 text-xs font-medium flex-1"
                              />
                              <input
                                type="number"
                                value={lvl.points}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 0;
                                  setCriteria((prev) =>
                                    prev.map((c, i) =>
                                      i === cIdx
                                        ? {
                                            ...c,
                                            levels: c.levels.map((l, j) =>
                                              j === lIdx ? { ...l, points: val } : l
                                            ),
                                          }
                                        : c
                                    )
                                  );
                                }}
                                placeholder="Pts"
                                className="input py-0.5 text-xs font-bold w-14 text-right"
                              />
                            </div>
                            <textarea
                              rows={2}
                              value={lvl.description || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCriteria((prev) =>
                                  prev.map((c, i) =>
                                    i === cIdx
                                      ? {
                                          ...c,
                                          levels: c.levels.map((l, j) =>
                                            j === lIdx ? { ...l, description: val } : l
                                          ),
                                        }
                                      : c
                                  )
                                );
                              }}
                              placeholder="Description"
                              className="input py-0.5 text-[11px] leading-tight"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRubricBuilder(false)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingRubric}
                onClick={handleSaveRubric}
                className="btn-primary text-sm inline-flex items-center gap-2"
              >
                {savingRubric ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Scale className="h-4 w-4" />
                )}
                Save Rubric
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
