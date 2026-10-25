import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { quizApi, quizAttemptApi } from "@/lib/api";
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,
  Play,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Award,
} from "lucide-react";
import toast from "react-hot-toast";

interface Question {
  id: string;
  question: string;
  type: string;
  options: string[] | null;
  points: number;
  sortOrder: number;
}

interface QuizInfo {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  isPublished: boolean;
}

interface AttemptRecord {
  id: string;
  status: string;
  score?: number;
  percentage?: number;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
}

interface AttemptStatus {
  attempts: AttemptRecord[];
  totalAttempts: number;
  completedCount: number;
  remainingAttempts: number | null;
  maxAttempts?: number;
  timeLimit?: number;
}

interface QuizAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean | null;
  pointsEarned: number;
  question: {
    id: string;
    question: string;
    type: string;
    correctAnswer: string | null;
    points: number;
  };
}

interface AttemptResult {
  id: string;
  status: string;
  score: number;
  maxScore: number;
  percentage: number;
  quiz: { title: string; passingScore?: number };
  answers: QuizAnswer[];
}

export const QuizTaking = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<
    "loading" | "info" | "taking" | "submitting" | "results"
  >("loading");
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [status, setStatus] = useState<AttemptStatus | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [results, setResults] = useState<AttemptResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAutoSubmitted = useRef(false);

  // Autosave to localStorage (Phase A requirement)
  useEffect(() => {
    if (attemptId && phase === "taking") {
      localStorage.setItem(`quiz_answers_${attemptId}`, JSON.stringify(answers));
      if (timeLeft !== null) {
        localStorage.setItem(`quiz_time_${attemptId}`, String(timeLeft));
      }
    }
  }, [answers, timeLeft, attemptId, phase]);

  const loadQuizInfo = useCallback(async () => {
    if (!lessonId) return;
    try {
      setPhase("loading");
      const quizRes = await quizApi.getQuiz(lessonId);
      const quizData = quizRes.data.data as QuizInfo | null;
      if (!quizData) {
        toast.error("No quiz found for this lesson");
        navigate(`/lessons/${lessonId}`);
        return;
      }
      if (!quizData.isPublished) {
        toast.error("This quiz is not available yet");
        navigate(`/lessons/${lessonId}`);
        return;
      }
      setQuiz(quizData);

      const statusRes = await quizAttemptApi.getStatus(quizData.id);
      setStatus(statusRes.data.data);
      setPhase("info");
    } catch {
      toast.error("Failed to load quiz information");
      navigate(`/lessons/${lessonId}`);
    }
  }, [lessonId, navigate]);

  useEffect(() => {
    loadQuizInfo();
  }, [loadQuizInfo]);

  // Timer logic
  useEffect(() => {
    if (phase === "taking" && timeLeft !== null && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, timeLeft]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (phase === "taking" && timeLeft === 0 && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      toast.error("Time's up! Your quiz has been auto-submitted.");
      handleSubmit(true);
    }
  }, [phase, timeLeft]);

  const startQuiz = async () => {
    if (!quiz?.id) return;
    try {
      setPhase("loading");
      const res = await quizAttemptApi.startAttempt(quiz.id);
      const data = res.data.data as {
        attempt: { id: string; timeLimit?: number };
        questions: Question[];
      };
      setAttemptId(data.attempt.id);
      setQuestions(data.questions);
      setCurrentIndex(0);
      hasAutoSubmitted.current = false;

      // Restore saved answers if user is resuming an active attempt
      const savedAnswers = localStorage.getItem(`quiz_answers_${data.attempt.id}`);
      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers));
          toast.success("Resumed previously saved answers");
        } catch {
          setAnswers({});
        }
      } else {
        setAnswers({});
      }

      const savedTime = localStorage.getItem(`quiz_time_${data.attempt.id}`);
      if (savedTime && parseInt(savedTime, 10) > 0) {
        setTimeLeft(parseInt(savedTime, 10));
      } else if (data.attempt.timeLimit) {
        setTimeLeft(data.attempt.timeLimit * 60);
      } else {
        setTimeLeft(null);
      }
      setPhase("taking");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start quiz");
      loadQuizInfo();
    }
  };

  const handleSubmit = async (isAuto = false) => {
    if (!attemptId) return;

    // Prevent double submit
    if (phase === "submitting") return;
    setPhase("submitting");
    setShowConfirmModal(false);

    const payload = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer: answer ?? "",
    }));

    try {
      const res = await quizAttemptApi.submitAttempt(attemptId, {
        answers: payload,
      });
      // Clear localStorage on successful submit
      localStorage.removeItem(`quiz_answers_${attemptId}`);
      localStorage.removeItem(`quiz_time_${attemptId}`);
      setResults(res.data.data);
      setPhase("results");
      if (!isAuto) {
        toast.success("Quiz submitted successfully!");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit quiz");
      setPhase("taking");
    }
  };

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent =
    questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  if (phase === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Info / Start Screen
  if (phase === "info" && quiz && status) {
    const canStart =
      status.remainingAttempts === null || status.remainingAttempts > 0;
    const bestAttempt = status.attempts.reduce<AttemptRecord | null>(
      (best, a) => {
        if (a.status !== "completed") return best;
        if (!best || (a.percentage ?? 0) > (best.percentage ?? 0)) return a;
        return best;
      },
      null
    );

    return (
      <div className="mx-auto max-w-2xl py-8 px-4">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate(`/lessons/${lessonId}`)}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
          </div>
        </div>

        <div className="card space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {quiz.timeLimit && (
              <div className="flex items-center gap-3 rounded-lg bg-primary-50 p-4">
                <Clock className="h-5 w-5 text-primary-600" />
                <div>
                  <p className="text-xs text-gray-500">Time Limit</p>
                  <p className="font-semibold">{quiz.timeLimit} min</p>
                </div>
              </div>
            )}
            {typeof quiz.passingScore === "number" && (
              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
                <Award className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-gray-500">Passing Score</p>
                  <p className="font-semibold">{quiz.passingScore}%</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
              <HelpCircle className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">Attempts</p>
                <p className="font-semibold">
                  {status.completedCount} /{" "}
                  {quiz.maxAttempts ?? "∞"}
                </p>
              </div>
            </div>
          </div>

          {bestAttempt && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Best Score: {bestAttempt.percentage ?? 0}% (
                  {bestAttempt.score} pts)
                </span>
              </div>
            </div>
          )}

          {status.attempts.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Attempt History
              </h3>
              <div className="space-y-2">
                {status.attempts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="text-gray-600">
                      Attempt #{a.attemptNumber}
                    </span>
                    <div className="flex items-center gap-3">
                      {a.status === "completed" && (
                        <span
                          className={`font-medium ${
                            (a.percentage ?? 0) >= (quiz.passingScore || 0)
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {a.percentage}%
                        </span>
                      )}
                      {a.status === "timed_out" && (
                        <span className="text-orange-600">Timed Out</span>
                      )}
                      {a.status === "in_progress" && (
                        <span className="text-blue-600">In Progress</span>
                      )}
                      <button
                        onClick={async () => {
                          try {
                            const res = await quizAttemptApi.getResults(a.id);
                            setResults(res.data.data);
                            setPhase("results");
                          } catch {
                            toast.error("Failed to load results");
                          }
                        }}
                        className="text-primary-600 hover:underline"
                        disabled={a.status === "in_progress"}
                      >
                        View Results
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!canStart && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>You have reached the maximum number of attempts.</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={startQuiz}
              disabled={!canStart}
              className="btn-primary"
            >
              <Play className="mr-1 h-4 w-4" />
              {status.attempts.length === 0 ? "Start Quiz" : "Retake Quiz"}
            </button>
            <Link to={`/lessons/${lessonId}`} className="btn-secondary">
              Back to Lesson
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Taking Screen
  if (phase === "taking" || phase === "submitting") {
    const question = questions[currentIndex];
    if (!question) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      );
    }

    const isLast = currentIndex === questions.length - 1;
    const isFirst = currentIndex === 0;

    return (
      <div className="mx-auto max-w-3xl py-6 px-4">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/lessons/${lessonId}`)}
              className="text-gray-500 hover:text-gray-700"
              title="Leave quiz (progress will be lost)"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">{quiz?.title}</h1>
          </div>
          {timeLeft !== null && (
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                timeLeft <= 60
                  ? "bg-red-100 text-red-700"
                  : "bg-primary-50 text-primary-700"
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="mb-1 flex items-center justify-between text-sm text-gray-500">
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span>{progressPercent}% answered</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-primary-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="card space-y-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                {question.points} pts
              </span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {question.type.replace("_", " ")}
              </span>
            </div>
            <h3 className="text-lg font-medium">{question.question}</h3>
          </div>

          {question.type === "MCQ" && question.options && (
            <div className="space-y-2">
              {question.options.map((opt, idx) => (
                <label
                  key={idx}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition hover:bg-gray-50 ${
                    answers[question.id] === opt
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={opt}
                    checked={answers[question.id] === opt}
                    onChange={() => handleAnswer(question.id, opt)}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === "TRUE_FALSE" && (
            <div className="space-y-2">
              {["True", "False"].map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition hover:bg-gray-50 ${
                    answers[question.id]?.toLowerCase() === opt.toLowerCase()
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={opt.toLowerCase()}
                    checked={
                      answers[question.id]?.toLowerCase() === opt.toLowerCase()
                    }
                    onChange={() =>
                      handleAnswer(question.id, opt.toLowerCase())
                    }
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === "SHORT_ANSWER" && (
            <textarea
              rows={4}
              value={answers[question.id] || ""}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
              placeholder="Type your answer here..."
              className="input"
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst}
              className="btn-secondary"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </button>

            <div className="flex gap-2">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-8 w-8 rounded-full text-xs font-medium transition ${
                    idx === currentIndex
                      ? "bg-primary-600 text-white"
                      : answers[questions[idx].id]
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {isLast ? (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={phase === "submitting"}
                className="btn-primary"
              >
                {phase === "submitting" ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-1 h-4 w-4" /> Submit Quiz
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() =>
                  setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
                }
                className="btn-secondary"
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Confirm Submit Dialog Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-6 w-6 shrink-0" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Ready to Submit Your Quiz?
                </h3>
              </div>

              {(() => {
                const answeredCount = Object.keys(answers).filter(
                  (k) => answers[k] && answers[k].trim() !== ""
                ).length;
                const unansweredCount = questions.length - answeredCount;

                return (
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>Total Questions:</span>
                        <span>{questions.length}</span>
                      </div>
                      <div className="flex justify-between font-medium text-emerald-600">
                        <span>Answered:</span>
                        <span>{answeredCount}</span>
                      </div>
                      {unansweredCount > 0 && (
                        <div className="flex justify-between font-semibold text-rose-600">
                          <span>Unanswered:</span>
                          <span>{unansweredCount}</span>
                        </div>
                      )}
                    </div>

                    {unansweredCount > 0 ? (
                      <p className="text-rose-600 font-medium text-xs">
                        Warning: You have {unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}. You will not receive points for unanswered questions.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        You have answered all questions. Once submitted, your answers cannot be modified.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="btn-secondary text-sm"
                >
                  Keep Reviewing
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={phase === "submitting"}
                  className="btn-primary text-sm inline-flex items-center gap-1.5"
                >
                  {phase === "submitting" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Results Screen
  if (phase === "results" && results) {
    const passed =
      results.percentage >= (results.quiz.passingScore || 0);

    return (
      <div className="mx-auto max-w-3xl py-8 px-4">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate(`/lessons/${lessonId}`)}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Quiz Results</h1>
        </div>

        <div className="card mb-6 text-center">
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
              passed ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {passed ? (
              <CheckCircle className="h-10 w-10 text-green-600" />
            ) : (
              <XCircle className="h-10 w-10 text-red-600" />
            )}
          </div>
          <h2 className="text-xl font-bold">{results.quiz.title}</h2>
          <p
            className={`mt-1 text-lg font-semibold ${
              passed ? "text-green-600" : "text-red-600"
            }`}
          >
            {passed ? "Passed" : "Did Not Pass"}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Score</p>
              <p className="text-lg font-bold">
                {results.score} / {results.maxScore}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Percentage</p>
              <p className="text-lg font-bold">{results.percentage}%</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Passing Score</p>
              <p className="text-lg font-bold">
                {results.quiz.passingScore ?? 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Answer Breakdown</h3>
          {results.answers.map((ans, idx) => {
            const isCorrect = ans.isCorrect === true;
            const isGraded = ans.isCorrect !== null;

            return (
              <div
                key={ans.questionId}
                className={`card border-l-4 p-4 ${
                  isCorrect
                    ? "border-l-green-500"
                    : isGraded
                    ? "border-l-red-500"
                    : "border-l-yellow-500"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs text-gray-400">
                      Q{idx + 1}
                    </span>
                    <p className="font-medium">{ans.question.question}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      isCorrect
                        ? "bg-green-100 text-green-700"
                        : isGraded
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {isCorrect
                      ? "Correct"
                      : isGraded
                      ? "Incorrect"
                      : "Pending Grade"}
                  </span>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-gray-500">Your Answer</p>
                    <p className="font-medium">{ans.answer || "—"}</p>
                  </div>
                  {isGraded && (
                    <div>
                      <p className="text-gray-500">Correct Answer</p>
                      <p className="font-medium text-green-600">
                        {ans.question.correctAnswer || "—"}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Points: {ans.pointsEarned} / {ans.question.points}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={startQuiz} className="btn-secondary">
            <RotateCcw className="mr-1 h-4 w-4" /> Retake Quiz
          </button>
          <Link to={`/lessons/${lessonId}`} className="btn-primary">
            Back to Lesson
          </Link>
          <Link to="/my-grades" className="btn-secondary">
            View My Grades
          </Link>
        </div>
      </div>
    );
  }

  return null;
};
