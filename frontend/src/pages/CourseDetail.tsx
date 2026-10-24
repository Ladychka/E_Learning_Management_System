import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { courseApi, enrollmentApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  BookOpen, Clock, Users, ArrowLeft, Play, FileText,
  HelpCircle, CreditCard, LogIn, CheckCircle, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

export const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!id) return;
    courseApi
      .getCourse(id)
      .then((res) => setCourse(res.data.data))
      .catch(() => toast.error("Failed to load course"))
      .finally(() => setLoading(false));
  }, [id]);

  // Check enrollment status
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    enrollmentApi
      .getMyEnrollments()
      .then((res) => {
        const enrollments = res.data.data || [];
        const targetId = course?.id || id;
        const enrolled = enrollments.some(
          (e: any) =>
            (e.courseId === targetId || e.courseId === id || e.course?.slug === id) &&
            e.status === "active"
        );
        setIsEnrolled(enrolled);
      })
      .catch(() => {
        // silently fail — buttons will just show as not enrolled
      });
  }, [isAuthenticated, id, course]);

  const handleEnroll = async () => {
    const targetId = course?.id || id;
    if (!targetId) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setEnrolling(true);
    try {
      await enrollmentApi.selfEnroll(targetId);
      setIsEnrolled(true);
      toast.success("Enrolled successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  };

  const handleBuy = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(`/checkout/${course?.id || id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!course) {
    return <div className="py-12 text-center">Course not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Link to="/courses" className="inline-flex items-center text-sm text-gray-500 hover:text-primary-600">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to courses
      </Link>

      <div className="card">
        <div className="flex h-48 items-center justify-center rounded-md bg-gray-100 sm:h-64">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            <BookOpen className="h-16 w-16 text-gray-300" />
          )}
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              {course.level}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              {course.category?.name || "General Finance"}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold">{course.title}</h1>
          <p className="mt-2 text-gray-600">{course.description}</p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {course.duration || 0} min
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {course._count?.enrollments || 0} enrolled
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {course.modules?.length || 0} modules
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
              {course.instructor.firstName[0]}
              {course.instructor.lastName[0]}
            </div>
            <div>
              <p className="text-sm font-medium">
                {course.instructor.firstName} {course.instructor.lastName}
              </p>
              <p className="text-xs text-gray-500">Instructor</p>
            </div>
          </div>

          {/* Enrollment / Purchase Actions */}
          <div className="mt-6 border-t pt-6">
            {isEnrolled ? (
              <button
                onClick={() => {
                  const firstLessonId = course.modules?.[0]?.lessons?.[0]?.id;
                  if (firstLessonId) {
                    navigate(`/lessons/${firstLessonId}`);
                  } else {
                    toast.error("No lessons published yet");
                  }
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 transition"
              >
                <CheckCircle className="h-5 w-5" />
                You're Enrolled — Start Learning
              </button>
            ) : course.isFree ? (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 transition disabled:opacity-50"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Enroll for Free
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    ${course.price}
                  </span>
                  <span className="text-sm text-gray-500">{course.currency}</span>
                </div>
                {!isAuthenticated ? (
                  <button
                    onClick={() => navigate("/login")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-3 font-semibold text-white hover:bg-gray-900 transition"
                  >
                    <LogIn className="h-5 w-5" />
                    Login to Purchase
                  </button>
                ) : (
                  <button
                    onClick={handleBuy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 transition"
                  >
                    <CreditCard className="h-5 w-5" />
                    Buy Now
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Course Content</h2>
        <div className="mt-4 space-y-3">
          {course.modules?.length ? (
            course.modules.map((mod: any) => (
              <div key={mod.id} className="rounded-md border p-4">
                <h3 className="font-medium">{mod.title}</h3>
                <div className="mt-2 space-y-1">
                  {mod.lessons?.map((lesson: any) => (
                    <Link
                      to={`/lessons/${lesson.id}`}
                      key={lesson.id}
                      className="flex items-center justify-between rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600"
                    >
                      <span className="flex items-center gap-2">
                        {lesson.contentType === "video" && <Play className="h-4 w-4 text-blue-500" />}
                        {lesson.contentType === "pdf" && <FileText className="h-4 w-4 text-rose-500" />}
                        {lesson.contentType === "quiz" && <HelpCircle className="h-4 w-4 text-amber-500" />}
                        {lesson.contentType === "text" && <FileText className="h-4 w-4 text-gray-500" />}
                        <span className="font-medium text-gray-800">{lesson.title}</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                          {lesson.contentType}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        {lesson.duration && (
                          <span className="text-xs text-gray-400">
                            {lesson.duration} min
                          </span>
                        )}
                        {lesson.isPreview && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            Preview
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No modules published yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};