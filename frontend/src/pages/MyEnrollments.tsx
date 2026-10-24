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
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "active":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Enrollments</h1>
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <BookOpen className="w-4 h-4" />
          Browse Courses
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">You are not enrolled in any courses yet.</p>
          <Link to="/courses" className="text-blue-600 hover:underline font-medium">
            Explore courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 hover:shadow-md transition"
            >
              <div className="w-24 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                {enrollment.course.thumbnailUrl ? (
                  <img
                    src={enrollment.course.thumbnailUrl}
                    alt={enrollment.course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(enrollment.status)}
                  <span className="text-sm font-medium capitalize">{enrollment.status}</span>
                </div>
                <Link
                  to={`/courses/${enrollment.course.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600 truncate block"
                >
                  {enrollment.course.title}
                </Link>
                <p className="text-sm text-gray-500 mt-1">
                  Instructor: {enrollment.course.instructor.firstName} {enrollment.course.instructor.lastName}
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{enrollment.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
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
