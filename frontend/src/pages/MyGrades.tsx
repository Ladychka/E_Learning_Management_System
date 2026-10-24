import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Award, TrendingUp, AlertCircle, BookOpen } from "lucide-react";
import { gradeApi } from "@/lib/api";

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
  course: { id: string; title: string };
  assignment?: { title: string };
  quiz?: { title: string };
  grader?: { firstName: string; lastName: string };
}

export function MyGrades() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState("");

  useEffect(() => {
    loadGrades();
  }, [courseFilter]);

  const loadGrades = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (courseFilter) params.courseId = courseFilter;
      const res = await gradeApi.getMyGrades(params);
      setGrades(res.data.data || []);
    } catch {
      toast.error("Failed to load grades");
    } finally {
      setLoading(false);
    }
  };

  const courses = Array.from(
    new Map(grades.map((g) => [g.course.id, g.course])).values()
  );

  const filteredGrades = courseFilter
    ? grades.filter((g) => g.course.id === courseFilter)
    : grades;

  const overallAverage =
    filteredGrades.length > 0
      ? (
          filteredGrades.reduce((sum, g) => sum + Number(g.percentage), 0) /
          filteredGrades.length
        ).toFixed(2)
      : "0";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Grades</h1>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Average</span>
          </div>
          <div className="text-2xl font-bold">{overallAverage}%</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Passed</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {filteredGrades.filter((g) => g.passFail === "pass").length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-gray-600">Failed</span>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {filteredGrades.filter((g) => g.passFail === "fail").length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : filteredGrades.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No grades available yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Course</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Assessment</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Score</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Grade</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredGrades.map((grade) => (
                <tr key={grade.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <Link
                      to={`/courses/${grade.course.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {grade.course.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {grade.assignment?.title || grade.quiz?.title || "Overall"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {grade.points} / {grade.maxPoints}
                    </span>
                    <span className="text-gray-500 ml-1">({grade.percentage}%)</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        grade.passFail === "pass"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {grade.letterGrade || grade.passFail}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {grade.feedback || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
