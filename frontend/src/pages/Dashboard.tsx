import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  BookOpen, Award, Clock, TrendingUp, Bell,
  CreditCard, FileText, CheckCircle, AlertCircle,
  ChevronRight, GraduationCap, Megaphone, Calculator,
  Trophy
} from "lucide-react";
import { Link } from "react-router-dom";
import { enrollmentApi, gradeApi, paymentApi, announcementApi } from "@/lib/api";
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
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [enrollRes, gradeRes, paymentRes, announceRes] = await Promise.allSettled([
        enrollmentApi.getMyEnrollments(),
        gradeApi.getMyGrades(),
        paymentApi.getPaymentHistory(),
        announcementApi.getMyAnnouncements(),
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
      if (announceRes.status === "fulfilled") {
        setAnnouncements(announceRes.value.data.data || []);
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

      {/* Announcements Broadcast Banner (US-064) */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.slice(0, 2).map((a) => (
            <div
              key={a.id}
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                a.priority === "urgent"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : a.priority === "high"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-blue-50 border-blue-200 text-blue-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <Megaphone className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  a.priority === "urgent" ? "text-red-600" : "text-blue-600"
                }`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{a.title}</span>
                    {a.course && (
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-white/70 border border-current">
                        {a.course.title}
                      </span>
                    )}
                    <span className="text-xs opacity-75">
                      • {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs mt-1 opacity-90 leading-relaxed">{a.content}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await announcementApi.markRead(a.id);
                    setAnnouncements((prev) => prev.filter((item) => item.id !== a.id));
                  } catch (err) {
                    console.error("Failed to dismiss announcement:", err);
                  }
                }}
                className="text-xs font-semibold opacity-70 hover:opacity-100 flex-shrink-0 px-2 py-1 rounded hover:bg-black/5"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Continue Learning Hero Card (B1) */}
      {activeEnrollments.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" />
                Resume Where You Left Off
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {activeEnrollments[0].course?.title || "Active Course"}
              </h2>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Pick up right where you paused your last video or textbook. Keep your daily streak going!
              </p>

              {/* Progress bar */}
              <div className="pt-2">
                <div className="flex justify-between text-xs font-medium text-emerald-200 mb-1">
                  <span>Course Progress</span>
                  <span>{activeEnrollments[0].progressPercent || 0}% Completed</span>
                </div>
                <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${activeEnrollments[0].progressPercent || 15}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <Link
                to={`/courses/${activeEnrollments[0].courseId}`}
                className="btn-primary inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-md transition"
              >
                Resume Course <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards & Gamification Streak (B5) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50/30 dark:from-amber-950/20 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 font-bold text-lg">
              🔥
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Study Streak</p>
              <p className="text-xl font-extrabold text-amber-900 dark:text-amber-100">5 Days Active</p>
            </div>
          </div>
        </div>
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
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
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

          {/* Financial Literacy Badges & Gamification Showcase (B5 / US-100) */}
          <div className="card border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/20 to-slate-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Fintech Badges & Achievements</h3>
                  <p className="text-xs text-gray-500">Earn recognition for consistent learning and assessment excellence</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Level 2 Scholar • 450 XP
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 flex flex-col items-center text-center">
                <span className="text-2xl mb-1">🎓</span>
                <span className="text-xs font-bold text-emerald-950">Fintech Pioneer</span>
                <span className="text-[10px] text-emerald-700 font-medium mt-0.5">Enrolled in 1st Course</span>
                <span className="mt-2 text-[9px] font-bold text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
                  UNLOCKED
                </span>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 flex flex-col items-center text-center">
                <span className="text-2xl mb-1">🔥</span>
                <span className="text-xs font-bold text-amber-950">5-Day Streak</span>
                <span className="text-[10px] text-amber-700 font-medium mt-0.5">Daily study habit</span>
                <span className="mt-2 text-[9px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                  UNLOCKED
                </span>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 flex flex-col items-center text-center">
                <span className="text-2xl mb-1">⚡</span>
                <span className="text-xs font-bold text-blue-950">KHQR Savvy</span>
                <span className="text-[10px] text-blue-700 font-medium mt-0.5">Bakong QR Checkout</span>
                <span className="mt-2 text-[9px] font-bold text-blue-800 bg-blue-200/70 px-2 py-0.5 rounded-full">
                  UNLOCKED
                </span>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 flex flex-col items-center text-center">
                <span className="text-2xl mb-1">🧮</span>
                <span className="text-xs font-bold text-purple-950">Model Builder</span>
                <span className="text-[10px] text-purple-700 font-medium mt-0.5">EMI / Budget Tools</span>
                <span className="mt-2 text-[9px] font-bold text-purple-800 bg-purple-200/70 px-2 py-0.5 rounded-full">
                  UNLOCKED
                </span>
              </div>

              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 flex flex-col items-center text-center">
                <span className="text-2xl mb-1">🎯</span>
                <span className="text-xs font-bold text-teal-950">Quiz Ace</span>
                <span className="text-[10px] text-teal-700 font-medium mt-0.5">Scored 90%+ in Quiz</span>
                <span className="mt-2 text-[9px] font-bold text-teal-800 bg-teal-200/70 px-2 py-0.5 rounded-full">
                  UNLOCKED
                </span>
              </div>

              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-3 flex flex-col items-center text-center opacity-75">
                <span className="text-2xl mb-1 grayscale">🏆</span>
                <span className="text-xs font-bold text-gray-700">QR Certified</span>
                <span className="text-[10px] text-gray-500 font-medium mt-0.5">Complete 1st Course</span>
                <span className="mt-2 text-[9px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                  LOCKED
                </span>
              </div>
            </div>
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

          {/* Finance Tools Shortcut Card (B3) */}
          <div className="card bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-5 w-5 text-emerald-700" />
              <h3 className="text-base font-bold text-emerald-950">Fintech Tools</h3>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed mb-3">
              Simulate loan EMI, compound interest, 50/30/20 budget, and live NBC USD ↔ KHR currency exchange.
            </p>
            <Link
              to="/finance-tools"
              className="btn-primary w-full py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
            >
              Open Interactive Tools <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mandatory Regulatory & Educational Disclaimer (US requirement) */}
      <div className="pt-4 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
          <strong>Mandatory Notice:</strong> All course materials, financial calculators, and payment simulations provided in FinTech ELMS are exclusively for academic education and personal financial literacy training, and do not constitute professional or licensed financial investment advice under the laws of the Kingdom of Cambodia.
        </p>
      </div>
    </div>
  );
};
