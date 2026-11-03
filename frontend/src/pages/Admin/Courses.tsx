import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { courseApi, categoryApi } from "@/lib/api";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Wrench,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: string;
  isFree: boolean;
  level: string;
  category: { name: string } | null;
  instructor: { firstName: string; lastName: string };
  _count: { enrollments: number };
}

interface CategoryItem {
  id: string;
  name: string;
}

export const AdminCourses = () => {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    shortDesc: "",
    categoryId: "",
    level: "BEGINNER",
    price: "",
    isFree: false,
    duration: "",
    status: "DRAFT",
  });

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await courseApi.getCourses({ limit: "50" });
      setCourses(res.data.data);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoryApi.getCategories();
      setCategories(res.data.data);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchCategories();
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      shortDesc: "",
      categoryId: "",
      level: "BEGINNER",
      price: "",
      isFree: false,
      duration: "",
      status: "DRAFT",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        ...form,
        price: form.isFree ? 0 : parseFloat(form.price || "0"),
        duration: form.duration ? parseInt(form.duration) : undefined,
      };
      if (!form.categoryId) {
        delete payload.categoryId;
      }
      if (editingId) {
        await courseApi.updateCourse(editingId, payload);
        toast.success("Course updated");
      } else {
        await courseApi.createCourse(payload);
        toast.success("Course created");
      }
      resetForm();
      fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleEdit = async (course: CourseItem) => {
    setEditingId(course.id);
    // The list response omits some fields; load the full course so editing
    // never overwrites the existing description/category with blanks.
    let detail: any = course;
    try {
      const res = await courseApi.getCourse(course.id);
      detail = res.data.data;
    } catch {
      // fall back to the list row
    }
    setForm({
      title: detail.title || course.title,
      description: detail.description || "",
      shortDesc: detail.shortDesc || "",
      categoryId: detail.categoryId || detail.category?.id || "",
      level: detail.level || course.level || "BEGINNER",
      price: detail.price != null ? String(detail.price) : "",
      isFree: Boolean(detail.isFree ?? course.isFree),
      duration: detail.duration != null ? String(detail.duration) : "",
      status: detail.status || course.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    try {
      await courseApi.deleteCourse(id);
      toast.success("Course deleted");
      fetchCourses();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-700",
      PUBLISHED: "bg-green-100 text-green-700",
      ARCHIVED: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          map[status] || ""
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Course Management</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="btn-primary"
        >
          <Plus className="mr-1 h-4 w-4" />
          {showForm ? "Cancel" : "New Course"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold">
            {editingId ? "Edit Course" : "Create Course"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="input mt-1"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input mt-1"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="input mt-1"
              >
                <option value="">-- Select Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                disabled={form.isFree}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isFree"
                checked={form.isFree}
                onChange={(e) =>
                  setForm({ ...form, isFree: e.target.checked })
                }
              />
              <label htmlFor="isFree" className="text-sm">Free course</label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary">
              {editingId ? "Update" : "Create"}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Title", "Instructor", "Status", "Price", "Enrolled", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary-600" />
                </td>
              </tr>
            ) : courses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No courses found.
                </td>
              </tr>
            ) : (
              courses.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-sm">
                    {c.instructor.firstName} {c.instructor.lastName}
                  </td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3">
                    {c.isFree ? "Free" : `$${c.price}`}
                  </td>
                  <td className="px-4 py-3">{c._count.enrollments}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link
                        to={`/courses/${c.id}`}
                        className="rounded p-1 text-gray-600 hover:bg-gray-100"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/courses/${c.id}/builder`}
                        className="rounded p-1 text-purple-600 hover:bg-purple-50"
                        title="Builder"
                      >
                        <Wrench className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/courses/${c.id}/settings`}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100"
                        title="Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleEdit(c)}
                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};