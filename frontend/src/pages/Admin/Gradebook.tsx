import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, Download, Eye, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { gradeApi, courseApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface Grade {
  id: string;
  points: number;
  maxPoints: number;
  percentage: number;
  letterGrade: string;
  passFail: string;
  feedback?: string;
  isPublished: boolean;
  createdAt: string;
  student: { firstName: string; lastName: string; email: string };
  course: { id: string; title: string };
  assignment?: { title: string };
  quiz?: { title: string };
}

interface Course {
  id: string;
  title: string;
}

export function Gradebook() {
  const { user: _user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadCourses();
    loadGrades();
  }, [courseFilter, statusFilter]);

  const loadCourses = async () => {
    try {
      const res = await courseApi.getCourses();
      setCourses(res.data.data || []);
    } catch { /* ignore */ }
  };

  const loadGrades = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (courseFilter) params.courseId = courseFilter;
      if (statusFilter) params.isPublished = statusFilter;
      const res = await gradeApi.getGrades(params);
      setGrades(res.data.data || []);
    } catch {
      toast.error("Failed to load grades");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await gradeApi.publishGrade(id);
      toast.success("Grade published");
      loadGrades();
    } catch {
      toast.error("Failed to publish grade");
    }
  };

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      if (courseFilter) params.courseId = courseFilter;
      const res = await gradeApi.exportGradebook(params);
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gradebook-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Gradebook exported");
    } catch {
      toast.error("Failed to export gradebook");
    }
  };

  const filteredGrades = grades.filter((g) =>
    `${g.student.firstName} ${g.student.lastName} ${g.student.email} ${g.course.title}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gradebook</h1>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student, email, or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="true">Published</option>
            <option value="false">Unpublished</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Student</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Course</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Assessment</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Score</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Grade</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No grades found.
                  </td>
                </tr>
              ) : (
                filteredGrades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {grade.student.firstName} {grade.student.lastName}
                      </div>
                      <div className="text-gray-500 text-xs">{grade.student.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/courses/${grade.course.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {grade.course.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {grade.assignment?.title || grade.quiz?.title || "Overall"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {grade.points} / {grade.maxPoints}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{grade.percentage}%</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          grade.passFail === "pass"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {grade.passFail === "pass" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {grade.letterGrade || grade.passFail}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          grade.isPublished
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {grade.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!grade.isPublished && (
                          <button
                            onClick={() => handlePublish(grade.id)}
                            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                          >
                            Publish
                          </button>
                        )}
                        <Link
                          to={`/grades/${grade.id}`}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
