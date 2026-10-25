import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { BookOpen, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { enrollmentApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface Enrollment {
  id: string;
  status: string;
  progressPercent: number;
  enrolledAt: string;
  completedAt?: string;
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    instructor: { firstName: string; lastName: string };
  };
}

import { TableSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";

export function MyEnrollments() {
  const { user: _user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      const res = await enrollmentApi.getMyEnrollments();
      setEnrollments(res.data.data || []);
    } catch {
      toast.error("Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  };

  const handleUnenroll = async (id: string) => {
    if (!confirm("Are you sure you want to unenroll?")) return;
    try {
      await enrollmentApi.unenroll(id);
      toast.success("Unenrolled successfully");
      loadEnrollments();
    } catch {
      toast.error("Failed to unenroll");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "active":
        return <Clock className="w-4 h-4 text-emerald-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <TableSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">My Enrollments</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track your enrolled courses, certificates, and learning progress</p>
        </div>
        <Link
          to="/courses"
          className="btn-primary inline-flex items-center gap-2 text-xs sm:text-sm px-4 py-2"
        >
          <BookOpen className="w-4 h-4" />
          Browse Courses
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Active Enrollments"
          description="You haven't enrolled in any courses yet. Explore our fintech syllabus and start earning verified certificates."
          actionText="Explore Courses"
          actionLink="/courses"
        />
      ) : (
        <div className="grid gap-4">
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex items-start gap-4 hover:shadow-md transition text-slate-900 dark:text-slate-100"
            >
              <div className="w-24 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex-shrink-0 overflow-hidden">
                {enrollment.course.thumbnailUrl ? (
                  <img
                    src={enrollment.course.thumbnailUrl}
                    alt={enrollment.course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(enrollment.status)}
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{enrollment.status}</span>
                </div>
                <Link
                  to={`/courses/${enrollment.course.id}`}
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 truncate block transition"
                >
                  {enrollment.course.title}
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Instructor: {enrollment.course.instructor.firstName} {enrollment.course.instructor.lastName}
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Course Progress</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{enrollment.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${enrollment.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  to={`/courses/${enrollment.course.id}`}
                  className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-center"
                >
                  Continue
                </Link>
                {enrollment.status === "active" && (
                  <button
                    onClick={() => handleUnenroll(enrollment.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    Unenroll
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
