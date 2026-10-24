import { useEffect, useState } from "react";
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
} from "lucide-react";
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

export const LessonPlayer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreenPdf, setIsFullscreenPdf] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [downloading, setDownloading] = useState(false);

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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    lessonApi
      .getLesson(id)
      .then((res) => setLesson(res.data.data))
      .catch(() => toast.error("Failed to load lesson"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="py-12 text-center text-gray-500">
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

  return (
    <div className="space-y-4">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => navigate(`/courses/${course?.id}`)}
            className="flex items-center gap-1 font-medium hover:text-primary-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {course?.title || "Course"}
          </button>
          <span>/</span>
          <span className="truncate max-w-[200px] sm:max-w-md font-semibold text-gray-800">
            {lesson.title}
          </span>
        </div>

        {/* Toggle Course Content Sidebar on small screens */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 lg:hidden"
        >
          <List className="h-4 w-4" />
          {showSidebar ? "Hide Content" : "Show All Files"} ({allLessons.length})
        </button>
      </div>

      {/* Main Grid: Left = Lesson Content, Right = All Files Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Lesson Player */}
        <div className={showSidebar ? "lg:col-span-3 space-y-4" : "lg:col-span-4 space-y-4"}>
          {/* Lesson Header Title */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-semibold uppercase text-primary-700">
                  {lesson.module?.title || "Module"}
                </span>
                <span className="text-xs text-gray-500">
                  Lesson {currentIndex + 1} of {allLessons.length}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">{lesson.title}</h1>
            </div>

            {lesson.isPreview && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Free Preview
              </span>
            )}
          </div>

          {lesson.description && (
            <p className="text-sm text-gray-600">{lesson.description}</p>
          )}

          {/* Content Card */}
          <div className="card overflow-hidden p-0 border shadow-sm">
            {/* VIDEO PLAYER */}
            {isVideo && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
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
                      src={videoUrl}
                      controls
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
            )}

            {/* PDF VIEWER WITH EXPLICIT VIEW ONLY & DOWNLOAD OPTIONS */}
            {isPdf && (
              <div className="space-y-3 p-4">
                {videoUrl ? (
                  <>
                    {/* Control Bar: Option to View Only or Download */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-gradient-to-r from-gray-50 to-gray-100 p-3 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-md bg-rose-100 p-2 text-rose-600 shadow-sm">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 truncate max-w-xs sm:max-w-md">
                            {lesson.title}.pdf
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                              View-Only Mode
                            </span>
                            <span className="text-xs text-gray-500">
                              Safe In-Browser Textbook
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: View in Tab / Fullscreen vs Download */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Option 1: Open in Native Browser Tab */}
                        <button
                          type="button"
                          onClick={() => window.open(videoUrl, "_blank")}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
                          title="Open textbook in a separate native browser tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open in Tab
                        </button>

                        {/* Option 2: View in Fullscreen Modal */}
                        <button
                          type="button"
                          onClick={() => setIsFullscreenPdf(true)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition"
                          title="Expand PDF to Fullscreen Reader"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          Fullscreen
                        </button>

                        {/* Option 3: Explicit Download Option */}
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(videoUrl, lesson.title)}
                          disabled={downloading}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition"
                          title="Download PDF file for offline storage"
                        >
                          {downloading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          {downloading ? "Downloading..." : "Download PDF"}
                        </button>
                      </div>
                    </div>

                    {/* Inline Interactive View-Only Reader with Robust Fallbacks */}
                    <div className="overflow-hidden rounded-lg border bg-gray-200 shadow-inner">
                      <object
                        data={`${videoUrl}#toolbar=1&navpanes=1`}
                        type="application/pdf"
                        className="h-[78vh] w-full rounded-lg bg-white block"
                      >
                        <iframe
                          src={`${videoUrl}#toolbar=1&navpanes=1`}
                          className="h-[78vh] w-full rounded-lg bg-white border-0"
                          title={lesson.title}
                        >
                          <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
                            <FileText className="mb-3 h-12 w-12 text-gray-400" />
                            <p className="text-base font-semibold text-gray-800">
                              PDF Preview is restricted by your browser.
                            </p>
                            <p className="mt-1 max-w-md text-xs text-gray-500">
                              You can read this document directly in a browser tab or download it.
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => window.open(videoUrl, "_blank")}
                                className="btn-secondary text-xs flex items-center gap-1.5"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> Open in Browser Tab
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(videoUrl, lesson.title)}
                                disabled={downloading}
                                className="btn-primary text-xs flex items-center gap-1.5"
                              >
                                <Download className="h-3.5 w-3.5" /> Download PDF
                              </button>
                            </div>
                          </div>
                        </iframe>
                      </object>
                    </div>

                    {/* Reading Guidance Tip */}
                    <div className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Tip:</span> If you need page thumbnails, search, or zoom, click <strong>Open in Tab</strong> or <strong>Fullscreen</strong>.
                      </div>
                      <button
                        type="button"
                        onClick={() => window.open(videoUrl, "_blank")}
                        className="font-semibold text-primary-700 underline hover:text-primary-900"
                      >
                        Open Native Viewer →
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <FileText className="mb-2 h-12 w-12" />
                    <p>No PDF uploaded for this lesson yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* TEXT LESSON */}
            {isText && (
              <div className="p-6">
                {videoUrl ? (
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{videoUrl}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
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
                  <h3 className="text-xl font-bold text-gray-900">
                    Quiz: {lesson.quiz?.title || lesson.title}
                  </h3>
                  <p className="max-w-md text-sm text-gray-500">
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
        </div>

        {/* Right Column: All Files & Curriculum Sidebar */}
        {showSidebar && (
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Course Content</h3>
                </div>
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700">
                  {allLessons.length} Files
                </span>
              </div>

              {/* Modules & Lessons List */}
              <div className="mt-3 divide-y max-h-[75vh] overflow-y-auto space-y-3 pr-1">
                {modules.map((mod) => (
                  <div key={mod.id} className="pt-2 first:pt-0">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
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
                                ? "bg-primary-50 text-primary-700 font-semibold border border-primary-200"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {l.contentType === "video" && (
                                <Play
                                  className={`h-3.5 w-3.5 ${
                                    isActive ? "text-primary-600" : "text-blue-500"
                                  }`}
                                />
                              )}
                              {l.contentType === "pdf" && (
                                <FileText
                                  className={`h-3.5 w-3.5 ${
                                    isActive ? "text-primary-600" : "text-rose-500"
                                  }`}
                                />
                              )}
                              {l.contentType === "quiz" && (
                                <HelpCircle
                                  className={`h-3.5 w-3.5 ${
                                    isActive ? "text-primary-600" : "text-amber-500"
                                  }`}
                                />
                              )}
                              {l.contentType === "text" && (
                                <FileText
                                  className={`h-3.5 w-3.5 ${
                                    isActive ? "text-primary-600" : "text-gray-400"
                                  }`}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate leading-tight">{l.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
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
              <span className="font-bold text-gray-900 text-sm truncate">
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
                onClick={() => handleDownloadPdf(videoUrl, lesson.title)}
                disabled={downloading}
                className="btn-primary text-xs flex items-center gap-1.5"
                title="Download PDF"
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {downloading ? "Downloading..." : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreenPdf(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 transition"
                title="Exit Fullscreen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-gray-900 rounded-b-lg overflow-hidden">
            <object
              data={`${videoUrl}#toolbar=1&navpanes=1`}
              type="application/pdf"
              className="h-full w-full bg-white block"
            >
              <iframe
                src={`${videoUrl}#toolbar=1&navpanes=1`}
                className="h-full w-full bg-white border-0"
                title={lesson.title}
              />
            </object>
          </div>
        </div>
      )}
    </div>
  );
};
