import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { lessonApi } from "@/lib/api";
import {
  ArrowLeft,
  Play,
  FileText,
  HelpCircle,
  Loader2,
  Download,
  Maximize2,
  BookOpen,
  ChevronRight,
  List,
  X,
  ExternalLink,
  Calculator,
  Bookmark,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LessonDiscussion } from "@/components/LessonDiscussion";
import { FinanceCalculators } from "@/components/FinanceCalculators";
import toast from "react-hot-toast";

interface LessonSummary {
  id: string;
  title: string;
  contentType: string;
  duration?: number;
  isPublished: boolean;
  isPreview: boolean;
  sortOrder: number;
}

interface ModuleSummary {
  id: string;
  title: string;
  sortOrder?: number;
  lessons: LessonSummary[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  contentType: string;
  contentUrl?: string;
  duration?: number;
  isPublished: boolean;
  isPreview: boolean;
  sortOrder: number;
  module?: {
    id: string;
    title: string;
    course?: {
      id: string;
      title: string;
      modules?: ModuleSummary[];
    };
  };
  quiz?: {
    id: string;
    title: string;
    isPublished: boolean;
    questions?: { id: string }[];
  } | null;
}

interface NoteItem {
  id: string;
  timestamp: number;
  timestampFormatted: string;
  text: string;
  createdAt: string;
}

export const LessonPlayer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreenPdf, setIsFullscreenPdf] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Phase B enhancements:
  const [activeBottomTab, setActiveBottomTab] = useState<"discussion" | "notes">("discussion");
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);

  // Notes state
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newNoteText, setNewNoteText] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleDownloadPdf = async (url: string, title: string) => {
    setDownloading(true);
    const toastId = toast.loading("Downloading PDF...");
    try {
      const res = await fetch(`${url}?download=true`);
      if (!res.ok) throw new Error("Failed to download file");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const cleanName = title.replace(/[^\w\s-]/gi, "").trim();
      link.download = cleanName.endsWith(".pdf") ? cleanName : `${cleanName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download completed!", { id: toastId });
    } catch {
      window.open(`${url}?download=true`, "_blank");
      toast.dismiss(toastId);
    } finally {
      setDownloading(false);
    }
  };

  // Load lesson
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    lessonApi
      .getLesson(id)
      .then((res) => setLesson(res.data.data))
      .catch(() => toast.error("Failed to load lesson"))
      .finally(() => setLoading(false));

    // Load saved notes for this lesson from localStorage
    try {
      const savedNotes = localStorage.getItem(`lesson_notes_${id}`);
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      else setNotes([]);
    } catch {
      // quiet
    }
  }, [id]);

  // Resume video playback position from localStorage
  useEffect(() => {
    if (!lesson || lesson.contentType !== "video" || !videoRef.current) return;
    try {
      const savedTime = localStorage.getItem(`lesson_pos_${lesson.id}`);
      if (savedTime && Number(savedTime) > 2) {
        videoRef.current.currentTime = Number(savedTime);
        toast(`Resumed from ${formatSeconds(Number(savedTime))}`, { icon: "⏱️" });
      }
    } catch {
      // quiet
    }
  }, [lesson]);

  // Save video playback position periodically
  const handleTimeUpdate = () => {
    if (!videoRef.current || !lesson) return;
    const current = Math.floor(videoRef.current.currentTime);
    if (current > 0 && current % 5 === 0) {
      localStorage.setItem(`lesson_pos_${lesson.id}`, String(current));
    }
  };

  // Playback rate handler
  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Keyboard shortcuts (Space = play/pause, Left/Right = seek 5s, M = mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (!videoRef.current) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (videoRef.current.paused) videoRef.current.play();
        else videoRef.current.pause();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        videoRef.current.currentTime = Math.min(
          videoRef.current.duration || 99999,
          videoRef.current.currentTime + 5
        );
      } else if (e.code === "KeyM") {
        videoRef.current.muted = !videoRef.current.muted;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Notes addition
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !id) return;
    const currentSec = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
    const newNote: NoteItem = {
      id: Date.now().toString(),
      timestamp: currentSec,
      timestampFormatted: formatSeconds(currentSec),
      text: newNoteText.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    setNewNoteText("");
    try {
      localStorage.setItem(`lesson_notes_${id}`, JSON.stringify(updated));
      toast.success("Bookmark note saved!");
    } catch {
      // quiet
    }
  };

  const handleDeleteNote = (noteId: string) => {
    const updated = notes.filter((n) => n.id !== noteId);
    setNotes(updated);
    if (id) localStorage.setItem(`lesson_notes_${id}`, JSON.stringify(updated));
  };

  const handleSeekToNote = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play();
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="py-12 text-center text-slate-500">
        Lesson not found.
        <div className="mt-4">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="mr-1 h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const course = lesson.module?.course;
  const modules = course?.modules || [];
  const allLessons = modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title, moduleId: m.id }))
  );
  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const isVideo = lesson.contentType === "video";
  const isText = lesson.contentType === "text";
  const isPdf = lesson.contentType === "pdf";
  const isQuiz = lesson.contentType === "quiz";

  const videoUrl = lesson.contentUrl || "";

  // Video Ended -> Trigger auto advance
  const handleVideoEnded = () => {
    if (!nextLesson) return;
    setAutoAdvanceCountdown(5);
    if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = setInterval(() => {
      setAutoAdvanceCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
          navigate(`/lessons/${nextLesson.id}`);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelAutoAdvance = () => {
    if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
    setAutoAdvanceCountdown(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Breadcrumbs & Finance Tools Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={() => navigate(`/courses/${course?.id}`)}
            className="flex items-center gap-1 font-medium hover:text-emerald-600 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {course?.title || "Course"}
          </button>
          <span>/</span>
          <span className="truncate max-w-[200px] sm:max-w-md font-semibold text-slate-800 dark:text-slate-200">
            {lesson.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Finance Tools Drawer Button */}
          <button
            onClick={() => setShowFinanceModal(true)}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50"
            title="Open Interactive Financial Calculator Drawer"
          >
            <Calculator className="h-4 w-4 text-emerald-600" />
            Finance Calculator
          </button>

          {/* Toggle Course Content Sidebar on small screens */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
          >
            <List className="h-4 w-4" />
            {showSidebar ? "Hide Content" : "Show All Files"} ({allLessons.length})
          </button>
        </div>
      </div>

      {/* Auto-advance Countdown Banner */}
      {autoAdvanceCountdown !== null && nextLesson && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Lesson completed! Next lesson auto-advancing in <strong>{autoAdvanceCountdown}s</strong>: {nextLesson.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                cancelAutoAdvance();
                navigate(`/lessons/${nextLesson.id}`);
              }}
              className="px-3 py-1 bg-white text-emerald-800 text-xs font-bold rounded shadow-sm hover:bg-emerald-50"
            >
              Play Now
            </button>
            <button
              onClick={cancelAutoAdvance}
              className="px-2 py-1 text-xs text-white/80 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left = Lesson Content, Right = All Files Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Lesson Player */}
        <div className={showSidebar ? "lg:col-span-3 space-y-4" : "lg:col-span-4 space-y-4"}>
          {/* Lesson Header Title */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase text-emerald-700">
                  {lesson.module?.title || "Module"}
                </span>
                <span className="text-xs text-slate-500">
                  Lesson {currentIndex + 1} of {allLessons.length}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{lesson.title}</h1>
            </div>

            {lesson.isPreview && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Free Preview
              </span>
            )}
          </div>

          {lesson.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{lesson.description}</p>
          )}

          {/* Content Card */}
          <div className="card overflow-hidden p-0 border shadow-sm">
            {/* VIDEO PLAYER */}
            {isVideo && (
              <div className="space-y-2">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  {videoUrl ? (
                    videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
                      <iframe
                        src={
                          videoUrl.includes("watch?v=")
                            ? videoUrl.replace("watch?v=", "embed/")
                            : videoUrl.includes("youtu.be/")
                            ? videoUrl.replace("youtu.be/", "www.youtube.com/embed/")
                            : videoUrl
                        }
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={lesson.title}
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleVideoEnded}
                        className="h-full w-full"
                        controlsList="nodownload"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-white">
                      <Play className="mb-2 h-12 w-12 opacity-50" />
                      <p className="text-sm opacity-70">No video uploaded yet</p>
                    </div>
                  )}
                </div>

                {/* Video Playback Speed Bar */}
                {videoUrl && !videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be") && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>Speed:</span>
                      {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSpeedChange(s)}
                          className={`px-2 py-0.5 rounded font-semibold ${
                            playbackRate === s
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-400 hidden sm:block">
                      Shortcuts: Space (play/pause), ←/→ (seek 5s), M (mute)
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PDF VIEWER WITH EXPLICIT VIEW ONLY & DOWNLOAD OPTIONS */}
            {isPdf && (
              <div className="space-y-3 p-4">
                {videoUrl ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-gradient-to-r from-slate-50 to-slate-100 p-3 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-md bg-rose-100 p-2 text-rose-600 shadow-sm">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 truncate max-w-xs sm:max-w-md">
                            {lesson.title}.pdf
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                              View-Only Mode
                            </span>
                            <span className="text-xs text-slate-500">
                              Safe In-Browser Textbook
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => window.open(videoUrl, "_blank")}
                          className="btn-secondary text-xs inline-flex items-center gap-1.5"
                          title="Open textbook in a separate native browser tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open in Tab
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsFullscreenPdf(true)}
                          className="btn-secondary text-xs inline-flex items-center gap-1.5"
                          title="Expand PDF to Fullscreen Reader"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          Fullscreen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(videoUrl, lesson.title)}
                          disabled={downloading}
                          className="btn-primary text-xs inline-flex items-center gap-1.5"
                        >
                          {downloading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Download PDF
                        </button>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border bg-slate-200 shadow-inner">
                      <object
                        data={`${videoUrl}#toolbar=1&navpanes=1`}
                        type="application/pdf"
                        className="h-[78vh] w-full rounded-lg bg-white block"
                      >
                        <iframe
                          src={`${videoUrl}#toolbar=1&navpanes=1`}
                          className="h-[78vh] w-full rounded-lg bg-white border-0"
                          title={lesson.title}
                        />
                      </object>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <FileText className="mb-2 h-12 w-12" />
                    <p>No document attached to this lesson.</p>
                  </div>
                )}
              </div>
            )}

            {/* TEXT LESSON */}
            {isText && (
              <div className="p-6">
                {videoUrl ? (
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{videoUrl}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <FileText className="mb-2 h-12 w-12" />
                    <p>No text content available.</p>
                  </div>
                )}
              </div>
            )}

            {/* QUIZ LESSON */}
            {isQuiz && (
              <div className="p-8">
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <div className="rounded-full bg-amber-100 p-4 text-amber-600">
                    <HelpCircle className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Quiz: {lesson.quiz?.title || lesson.title}
                  </h3>
                  <p className="max-w-md text-sm text-slate-500">
                    Test your understanding of the curriculum concepts.
                  </p>
                  {lesson.quiz?.isPublished ? (
                    <Link
                      to={`/lessons/${lesson.id}/quiz/take`}
                      className="btn-primary mt-2"
                    >
                      Start Quiz Attempt
                    </Link>
                  ) : (
                    <span className="rounded bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                      Quiz not published yet
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Bar (Previous & Next Lesson) */}
          <div className="flex items-center justify-between border-t pt-4">
            {prevLesson ? (
              <Link
                to={`/lessons/${prevLesson.id}`}
                className="btn-secondary flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous:</span> {prevLesson.title}
              </Link>
            ) : (
              <span />
            )}
            {nextLesson ? (
              <Link
                to={`/lessons/${nextLesson.id}`}
                className="btn-primary flex items-center gap-1.5"
              >
                <span className="hidden sm:inline">Next:</span> {nextLesson.title}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span />
            )}
          </div>

          {/* Interactive Lesson Tabs: Discussion vs My Timestamped Notes (B1) */}
          <div className="mt-8 rounded-xl border bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center gap-4 border-b pb-3 mb-6">
              <button
                onClick={() => setActiveBottomTab("discussion")}
                className={`pb-2 text-sm font-bold border-b-2 transition ${
                  activeBottomTab === "discussion"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Discussion & Q&A
              </button>
              <button
                onClick={() => setActiveBottomTab("notes")}
                className={`pb-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
                  activeBottomTab === "notes"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Bookmark className="w-4 h-4" />
                Personal Notes & Bookmarks ({notes.length})
              </button>
            </div>

            {activeBottomTab === "discussion" ? (
              <LessonDiscussion lessonId={lesson.id} currentUserId={user?.id} />
            ) : (
              <div className="space-y-4">
                {/* Note creation */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Add a timestamped study bookmark for this lesson:
                    </span>
                    {isVideo && videoRef.current && (
                      <span className="font-semibold text-emerald-700">
                        Current Video Time: {formatSeconds(videoRef.current.currentTime || 0)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="e.g. Important formula at this moment..."
                      className="input text-sm flex-1"
                    />
                    <button type="submit" className="btn-primary text-xs whitespace-nowrap">
                      Save Note
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                {notes.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No personal notes or bookmarks added for this lesson yet.
                  </p>
                ) : (
                  <div className="space-y-2.5 pt-2">
                    {notes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleSeekToNote(n.timestamp)}
                            className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline bg-emerald-100/60 px-2 py-0.5 rounded"
                          >
                            <Clock className="w-3 h-3" /> {n.timestampFormatted}
                          </button>
                          <p className="text-slate-800 text-sm font-medium">{n.text}</p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Delete note"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mandatory Academic & Financial Notice */}
          <div className="pt-4 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-400 max-w-xl mx-auto">
              <strong>Academic Disclaimer:</strong> FinTech ELMS instructional content is provided for financial literacy and curriculum certification only; not licensed investment advisory.
            </p>
          </div>
        </div>

        {/* Right Column: All Files & Curriculum Sidebar */}
        {showSidebar && (
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Course Content</h3>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {allLessons.length} Files
                </span>
              </div>

              {/* Modules & Lessons List */}
              <div className="mt-3 divide-y max-h-[75vh] overflow-y-auto space-y-3 pr-1">
                {modules.map((mod) => (
                  <div key={mod.id} className="pt-2 first:pt-0">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      {mod.title}
                    </p>
                    <div className="space-y-1">
                      {mod.lessons.map((l) => {
                        const isActive = l.id === lesson.id;
                        return (
                          <Link
                            key={l.id}
                            to={`/lessons/${l.id}`}
                            className={`flex items-start gap-2.5 rounded-lg p-2 text-xs transition ${
                              isActive
                                ? "bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {l.contentType === "video" && (
                                <Play
                                  className={`h-3.5 w-3.5 ${
                                    isActive ? "text-emerald-600" : "text-blue-500"
                                  }`}
                                />
                              )}
                              {l.contentType === "pdf" && (
                                <FileText
                                  className={`h-3.5 w-3.5 ${
                                    isActive ? "text-emerald-600" : "text-rose-500"
                                  }`}
                                />
                              )}
                              {l.contentType === "quiz" && (
                                <HelpCircle
                                  className={`h-3.5 w-3.5 ${
                                    isActive ? "text-emerald-600" : "text-amber-500"
                                  }`}
                                />
                              )}
                              {l.contentType === "text" && (
                                <FileText
                                  className={`h-3.5 w-3.5 ${
                                    isActive ? "text-emerald-600" : "text-slate-400"
                                  }`}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate leading-tight">{l.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                                <span className="uppercase">{l.contentType}</span>
                                {l.duration && <span>• {l.duration}m</span>}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FULLSCREEN PDF MODAL (VIEW ONLY MODE) */}
      {isFullscreenPdf && isPdf && videoUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-t-lg border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-rose-600" />
              <span className="font-bold text-slate-900 text-sm truncate">
                {lesson.title}.pdf — Fullscreen Reader
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.open(videoUrl, "_blank")}
                className="btn-secondary text-xs flex items-center gap-1.5"
                title="Open in native browser tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Tab
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreenPdf(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-900 overflow-hidden rounded-b-lg">
            <iframe src={`${videoUrl}#toolbar=1`} className="h-full w-full border-0" title="PDF Fullscreen" />
          </div>
        </div>
      )}

      {/* INTERACTIVE FINANCE TOOLS MODAL DRAWER */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-2 border">
            <button
              onClick={() => setShowFinanceModal(false)}
              className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <FinanceCalculators compact={true} />
          </div>
        </div>
      )}
    </div>
  );
};
