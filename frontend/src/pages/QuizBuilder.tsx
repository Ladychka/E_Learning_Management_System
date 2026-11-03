import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { quizApi, lessonApi } from "@/lib/api";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  ArrowLeft,
  Loader2,
  GripVertical,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

interface QuestionItem {
  id: string;
  type: string;
  question: string;
  options: string[] | null;
  correctAnswer: string | null;
  points: number;
  sortOrder: number;
}

interface QuizData {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  isPublished: boolean;
  questions: QuestionItem[];
}

export const QuizBuilder = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [newQuiz, setNewQuiz] = useState({
    title: "",
    description: "",
    timeLimit: "",
    maxAttempts: "",
    passingScore: "60",
    isPublished: false,
  });
  const [questionForm, setQuestionForm] = useState({
    type: "MCQ",
    question: "",
    options: ["", ""],
    correctAnswer: "",
    points: 1,
  });

  const fetchQuiz = async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const [quizRes, lessonRes] = await Promise.all([
        quizApi.getQuiz(lessonId).catch(() => ({ data: { data: null } })),
        lessonApi.getLesson(lessonId),
      ]);
      setQuiz(quizRes.data.data);
      setLesson(lessonRes.data.data);
    } catch {
      toast.error("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, [lessonId]);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonId || !newQuiz.title.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }
    setCreatingQuiz(true);
    try {
      await quizApi.createQuiz(lessonId, {
        title: newQuiz.title.trim(),
        description: newQuiz.description || undefined,
        timeLimit: newQuiz.timeLimit ? parseInt(newQuiz.timeLimit, 10) : undefined,
        maxAttempts: newQuiz.maxAttempts ? parseInt(newQuiz.maxAttempts, 10) : undefined,
        passingScore: newQuiz.passingScore ? parseInt(newQuiz.passingScore, 10) : undefined,
        isPublished: newQuiz.isPublished,
      });
      toast.success("Quiz created");
      await fetchQuiz();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create quiz");
    } finally {
      setCreatingQuiz(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz?.id) {
      toast.error("Create a quiz first in the course builder");
      return;
    }
    try {
      const payload = {
        ...questionForm,
        options: questionForm.type === "MCQ" ? questionForm.options.filter((o) => o.trim()) : undefined,
      };
      if (editingQuestionId) {
        await quizApi.updateQuestion(quiz.id, editingQuestionId, payload);
        toast.success("Question updated");
      } else {
        await quizApi.addQuestion(quiz.id, payload);
        toast.success("Question added");
      }
      setShowQuestionForm(false);
      setEditingQuestionId(null);
      setQuestionForm({ type: "MCQ", question: "", options: ["", ""], correctAnswer: "", points: 1 });
      fetchQuiz();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save question");
    }
  };

  const handleEditQuestion = (q: QuestionItem) => {
    setEditingQuestionId(q.id);
    setQuestionForm({
      type: q.type,
      question: q.question,
      options: q.options ? [...q.options, ""] : ["", ""],
      correctAnswer: q.correctAnswer || "",
      points: q.points,
    });
    setShowQuestionForm(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!quiz?.id || !confirm("Delete this question?")) return;
    try {
      await quizApi.deleteQuestion(quiz.id, questionId);
      toast.success("Question deleted");
      fetchQuiz();
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const addOption = () => {
    setQuestionForm((prev) => ({ ...prev, options: [...prev.options, ""] }));
  };

  const removeOption = (idx: number) => {
    setQuestionForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }));
  };

  const updateOption = (idx: number, value: string) => {
    setQuestionForm((prev) => {
      const next = [...prev.options];
      next[idx] = value;
      return { ...prev, options: next };
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Quiz Builder</h1>
            <p className="text-sm text-gray-500">{lesson?.title}</p>
          </div>
        </div>

        <form onSubmit={handleCreateQuiz} className="card space-y-4">
          <h3 className="font-semibold">Create quiz for this lesson</h3>
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              required
              value={newQuiz.title}
              onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
              className="input mt-1"
              placeholder="e.g. Module 1 Assessment"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              rows={2}
              value={newQuiz.description}
              onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
              className="input mt-1"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Time limit (min)</label>
              <input
                type="number"
                min="1"
                value={newQuiz.timeLimit}
                onChange={(e) => setNewQuiz({ ...newQuiz, timeLimit: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Max attempts</label>
              <input
                type="number"
                min="1"
                value={newQuiz.maxAttempts}
                onChange={(e) => setNewQuiz({ ...newQuiz, maxAttempts: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Passing score (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newQuiz.passingScore}
                onChange={(e) => setNewQuiz({ ...newQuiz, passingScore: e.target.value })}
                className="input mt-1"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newQuiz.isPublished}
              onChange={(e) => setNewQuiz({ ...newQuiz, isPublished: e.target.checked })}
            />
            Publish quiz immediately
          </label>
          <button type="submit" disabled={creatingQuiz} className="btn-primary">
            {creatingQuiz ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Create Quiz
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Quiz Builder</h1>
            <p className="text-sm text-gray-500">
              {quiz.title} — {lesson?.title}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingQuestionId(null);
            setQuestionForm({ type: "MCQ", question: "", options: ["", ""], correctAnswer: "", points: 1 });
            setShowQuestionForm(true);
          }}
          className="btn-primary"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Question
        </button>
      </div>

      {showQuestionForm && (
        <form onSubmit={handleSaveQuestion} className="card space-y-4">
          <h3 className="font-semibold">{editingQuestionId ? "Edit Question" : "New Question"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Type</label>
              <select
                value={questionForm.type}
                onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
                className="input mt-1"
              >
                <option value="MCQ">Multiple Choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Points</label>
              <input
                type="number"
                min="1"
                value={questionForm.points}
                onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                className="input mt-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Question</label>
            <textarea
              required
              rows={2}
              value={questionForm.question}
              onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
              className="input mt-1"
            />
          </div>

          {questionForm.type === "MCQ" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Options</label>
              {questionForm.options.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    className="input flex-1"
                    placeholder={`Option ${idx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="btn-secondary px-2"
                    disabled={questionForm.options.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addOption} className="btn-secondary text-xs">
                + Add Option
              </button>
            </div>
          )}

          {questionForm.type === "TRUE_FALSE" && (
            <div>
              <label className="block text-sm font-medium">Correct Answer</label>
              <select
                value={questionForm.correctAnswer}
                onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                className="input mt-1"
              >
                <option value="">Select...</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          )}

          {questionForm.type === "SHORT_ANSWER" && (
            <div>
              <label className="block text-sm font-medium">Correct Answer</label>
              <input
                value={questionForm.correctAnswer}
                onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                className="input mt-1"
                placeholder="Expected answer"
              />
            </div>
          )}

          {questionForm.type === "MCQ" && (
            <div>
              <label className="block text-sm font-medium">Correct Answer (option text)</label>
              <input
                value={questionForm.correctAnswer}
                onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                className="input mt-1"
                placeholder="Exact text of the correct option"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary"><Save className="mr-1 h-4 w-4" /> Save</button>
            <button type="button" onClick={() => setShowQuestionForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {quiz.questions.length === 0 ? (
          <div className="card py-12 text-center text-gray-500">No questions yet. Add your first question above.</div>
        ) : (
          quiz.questions.map((q, idx) => (
            <div key={q.id} className="card flex items-start gap-3">
              <GripVertical className="mt-1 h-4 w-4 text-gray-300" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                    {q.type}
                  </span>
                  <span className="text-xs text-gray-400">{q.points} pts</span>
                </div>
                <p className="mt-1 font-medium">{idx + 1}. {q.question}</p>
                {q.options && q.options.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    {q.options.map((opt, i) => (
                      <li key={i} className={opt === q.correctAnswer ? "font-medium text-green-600" : ""}>
                        <span className="inline-flex items-center gap-1">
                          {opt}
                          {opt === q.correctAnswer && (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {q.correctAnswer && (!q.options || q.options.length === 0) && (
                  <p className="mt-1 text-sm text-green-600">Answer: {q.correctAnswer}</p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEditQuestion(q)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-200"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="rounded p-1 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
