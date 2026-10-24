import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  BookOpen, Award, Clock, TrendingUp, Bell,
  CreditCard, FileText, CheckCircle, AlertCircle,
  ChevronRight, GraduationCap
} from "lucide-react";
import { Link } from "react-router-dom";
import { enrollmentApi, gradeApi, paymentApi } from "@/lib/api";
import toast from "react-hot-toast";

interface Enrollment {
  id: string;
  courseId: string;
  status: string;
  progressPercent: number;
  enrolledAt: string;
  course: { title: string; thumbnailUrl?: string };
}

interface Grade {
  id: string;
  courseId: string;
  percentage: number;
  letterGrade: string;
  passFail: string;
  course: { title: string };
  quiz?: { title: string };
  assignment?: { title: string };
}

interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  gateway: string;
  createdAt: string;
  course?: { title: string };
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [enrollRes, gradeRes, paymentRes] = await Promise.allSettled([
        enrollmentApi.getMyEnrollments(),
        gradeApi.getMyGrades(),
        paymentApi.getPaymentHistory(),
      ]);
      if (enrollRes.status === "fulfilled") {
        setEnrollments(enrollRes.value.data.data || []);
      }
      if (gradeRes.status === "fulfilled") {
        setGrades(gradeRes.value.data.data || []);
      }
      if (paymentRes.status === "fulfilled") {
        setPayments(paymentRes.value.data.data || []);
      }
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const activeEnrollments = enrollments.filter((e) => e.status === "active");
  const completedEnrollments = enrollments.filter((e) => e.status === "completed");
  const avgProgress = activeEnrollments.length
    ? Math.round(activeEnrollments.reduce((s, e) => s + (e.progressPercent || 0), 0) / activeEnrollments.length)
    : 0;
  const totalHours = Math.round(activeEnrollments.length * 3.5); // rough estimate

  const latestGrades = grades.slice(0, 5);
  const latestPayments = payments.slice(0, 3);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-500">
          Here's what's happening in your learning journey.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">My Courses</p>
              <p className="text-xl font-bold">{activeEnrollments.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2 text-green-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-xl font-bold">{completedEnrollments.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hours Spent</p>
              <p className="text-xl font-bold">{totalHours}h</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Progress</p>
              <p className="text-xl font-bold">{avgProgress}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Enrolled Courses */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">My Enrolled Courses</h3>
              <Link to="/my-enrollments" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {activeEnrollments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p>You haven't enrolled in any courses yet.</p>
                <Link to="/courses" className="text-primary-600 hover:underline mt-2 inline-block">
                  Browse Courses
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {activeEnrollments.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 transition">
                    <div className="w-16 h-12 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                      {e.course?.thumbnailUrl ? (
                        <img src={e.course.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-full h-full p-3 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{e.course?.title || "Course"}</p>
                      <div className="mt-1.5">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{e.progressPercent || 0}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full transition-all"
                            style={{ width: `${e.progressPercent || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/courses/${e.courseId}`}
                      className="text-primary-600 hover:text-primary-700 flex-shrink-0"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Grades */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Grades</h3>
              <Link to="/my-grades" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {latestGrades.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No grades yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {latestGrades.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        g.passFail === "pass"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {g.letterGrade || "-"}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{g.course?.title || "Course"}</p>
                        <p className="text-xs text-gray-500">
                          {g.quiz?.title || g.assignment?.title || "Assessment"}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      g.passFail === "pass" ? "text-green-600" : "text-red-600"
                    }`}>
                      {g.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold">Notifications</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-2 rounded-lg bg-blue-50">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Welcome to the course!</p>
                  <p className="text-xs text-blue-700">You have been enrolled in Finance Program.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-green-50">
                <Award className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">New grade available</p>
                  <p className="text-xs text-green-700">Your HTML Quiz has been graded: A (99%).</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900">New content available</p>
                  <p className="text-xs text-amber-700">A new module has been added to Web Development.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold">Payments</h3>
            </div>
            {latestPayments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No payment history.</p>
            ) : (
              <div className="space-y-3">
                {latestPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{p.course?.title || "Course"}</p>
                      <p className="text-xs text-gray-500">{p.gateway.replace("_", " ").toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${p.amount}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : p.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link to="/payments" className="text-sm text-primary-600 hover:underline mt-3 inline-flex items-center gap-1">
              View Payment History <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/courses"
                className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-gray-50 transition text-sm"
              >
                <BookOpen className="h-4 w-4 text-primary-600" />
                Browse Courses
              </Link>
              <Link
                to="/my-enrollments"
                className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-gray-50 transition text-sm"
              >
                <FileText className="h-4 w-4 text-primary-600" />
                My Enrollments
              </Link>
              <Link
                to="/my-grades"
                className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-gray-50 transition text-sm"
              >
                <GraduationCap className="h-4 w-4 text-primary-600" />
                My Grades
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
