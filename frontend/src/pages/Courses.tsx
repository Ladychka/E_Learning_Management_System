import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { courseApi, categoryApi } from "@/lib/api";
import {
  Search,
  Filter,
  BookOpen,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc: string;
  thumbnailUrl: string;
  price: string;
  isFree: boolean;
  level: string;
  status: string;
  instructor: { firstName: string; lastName: string };
  category: { name: string } | null;
  _count: { enrollments: number };
}

export const Courses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [level, setLevel] = useState("");

  useEffect(() => {
    fetchCourses();
    categoryApi.getCategories().then((res) => setCategories(res.data.data));
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      if (level) params.level = level;
      const res = await courseApi.getCourses(params);
      setCourses(res.data.data);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">All Courses</h1>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchCourses()}
              className="input pl-9"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input"
          >
            <option value="">All Topics</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="input"
          >
            <option value="">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
          <button onClick={fetchCourses} className="btn-primary">
            <Filter className="mr-1 h-4 w-4" /> Filter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      ) : courses.length === 0 ? (
        <div className="py-12 text-center text-gray-500">No courses found.</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
            >
              {/* Thumbnail */}
              <Link to={`/courses/${course.id}`} className="block">
                <div className="flex h-44 items-center justify-center bg-gray-100">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-12 w-12 text-gray-300" />
                  )}
                </div>
              </Link>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <Link to={`/courses/${course.id}`}>
                  <h3 className="font-semibold text-gray-900 text-base group-hover:text-primary-600 transition-colors">
                    {course.title}
                  </h3>
                </Link>
                <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">
                  {course.shortDesc || course.description}
                </p>
                <p className="mt-3 text-xs text-gray-400">
                  {course.instructor.firstName} {course.instructor.lastName}
                </p>

                {/* Action */}
                <div className="mt-auto pt-4">
                  {course.isFree ? (
                    <Link
                      to={`/courses/${course.id}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Enroll Free
                    </Link>
                  ) : (
                    <button
                      onClick={() => navigate(`/checkout/${course.id}`)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
                    >
                      <CreditCard className="h-4 w-4" />
                      Buy Now — ${course.price}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
