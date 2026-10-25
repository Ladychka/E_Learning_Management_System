import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { courseApi, categoryApi } from "@/lib/api";
import {
  Search,
  Filter,
  BookOpen,
  CreditCard,
  CheckCircle,
  Clock,
  Users,
  Star,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { CourseGridSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc: string;
  thumbnailUrl: string;
  price: string;
  currency: string;
  isFree: boolean;
  level: string;
  duration?: number;
  status: string;
  createdAt?: string;
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
  const [priceFilter, setPriceFilter] = useState<"ALL" | "FREE" | "PAID">("ALL");
  const [sortBy, setSortBy] = useState<"POPULAR" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC">("POPULAR");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetchCourses();
    categoryApi.getCategories().then((res) => setCategories(res.data.data));
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      if (level) params.level = level;
      const res = await courseApi.getCourses(params);
      setCourses(res.data.data || []);
    } catch {
      setHasError(true);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort courses client-side for immediate responsive experience
  const filteredAndSortedCourses = useMemo(() => {
    return courses
      .filter((c) => {
        if (priceFilter === "FREE") return c.isFree || parseFloat(c.price || "0") === 0;
        if (priceFilter === "PAID") return !c.isFree && parseFloat(c.price || "0") > 0;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "POPULAR") {
          return (b._count?.enrollments || 0) - (a._count?.enrollments || 0);
        }
        if (sortBy === "NEWEST") {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === "PRICE_ASC") {
          return parseFloat(a.price || "0") - parseFloat(b.price || "0");
        }
        if (sortBy === "PRICE_DESC") {
          return parseFloat(b.price || "0") - parseFloat(a.price || "0");
        }
        return 0;
      });
  }, [courses, priceFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Cambodian Financial Literacy Catalog
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Explore Fintech & Banking Courses
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-emerald-100/80 max-w-xl leading-relaxed">
            From Bakong KHQR architecture to NBC risk compliance and microfinance credit scoring. Learn from certified industry practitioners.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, topic, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchCourses()}
              className="input pl-9 w-full"
            />
          </div>

          {/* Dropdown filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input text-xs sm:text-sm"
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
              className="input text-xs sm:text-sm"
            >
              <option value="">All Levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>

            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as any)}
              className="input text-xs sm:text-sm"
            >
              <option value="ALL">All Prices</option>
              <option value="FREE">Free Courses</option>
              <option value="PAID">Paid / Premium</option>
            </select>

            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 bg-white">
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent py-2 text-xs sm:text-sm focus:outline-none"
              >
                <option value="POPULAR">Most Popular</option>
                <option value="NEWEST">Newest Added</option>
                <option value="PRICE_ASC">Price: Low to High</option>
                <option value="PRICE_DESC">Price: High to Low</option>
              </select>
            </div>

            <button onClick={fetchCourses} className="btn-primary text-xs sm:text-sm py-2">
              <Filter className="mr-1 h-3.5 w-3.5" /> Filter
            </button>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <CourseGridSkeleton count={6} />
      ) : hasError ? (
        <ErrorState
          title="Failed to Load Courses"
          message="We couldn't connect to the server to fetch the course catalog. Please check your connection and try again."
          onRetry={fetchCourses}
        />
      ) : filteredAndSortedCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Courses Found"
          description="We couldn't find any courses matching your selected topic, level, or price range. Try broadening your search or resetting filters."
          actionText="Reset Filters"
          onAction={() => {
            setSearch("");
            setCategoryId("");
            setLevel("");
            setPriceFilter("ALL");
          }}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedCourses.map((course) => {
            const priceUsd = parseFloat(course.price || "0");
            const priceKhr = Math.round(priceUsd * 4100).toLocaleString();
            const isFreeCourse = Boolean(course.isFree) || priceUsd === 0;

            return (
              <div
                key={course.id}
                className="group rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Thumbnail */}
                <Link to={`/courses/${course.id}`} className="block relative overflow-hidden bg-slate-900">
                  <div className="flex h-44 items-center justify-center bg-gray-100">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-gray-300" />
                    )}
                  </div>
                  {/* Badges on Thumbnail */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="rounded-full bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {course.level || "ALL LEVELS"}
                    </span>
                    {isFreeCourse && (
                      <span className="rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        Free
                      </span>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {course.category?.name || "FinTech"}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-amber-500">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.9
                    </span>
                  </div>

                  <Link to={`/courses/${course.id}`}>
                    <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-600 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                  </Link>

                  <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {course.shortDesc || course.description}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {course.duration || 120} min
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {course._count?.enrollments || 38} students
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div>
                      {isFreeCourse ? (
                        <span className="text-base font-extrabold text-emerald-700">Free</span>
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-extrabold text-gray-900">${priceUsd.toFixed(2)}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold">USD</span>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-medium">≈ {priceKhr} ៛</span>
                        </div>
                      )}
                    </div>

                    <div>
                      {isFreeCourse ? (
                        <Link
                          to={`/courses/${course.id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Enroll Free
                        </Link>
                      ) : (
                        <button
                          onClick={() => navigate(`/checkout/${course.id}`)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Enroll Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

