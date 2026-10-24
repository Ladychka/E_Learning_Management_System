import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { courseApi, uploadApi } from "@/lib/api";
import {
  ArrowLeft,
  Save,
  Loader2,
  Image,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

export const CourseSettings = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    shortDesc: "",
    status: "DRAFT",
    price: "",
    currency: "USD",
    isFree: false,
    level: "BEGINNER",
    duration: "",
    language: "en",
    prerequisites: "",
    learningOutcomes: "",
    tags: "",
    scheduledAt: "",
    thumbnailUrl: "",
  });

  const fetchCourse = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await courseApi.getCourse(courseId);
      const c = res.data.data;
      setCourse(c);
      setForm({
        title: c.title || "",
        description: c.description || "",
        shortDesc: c.shortDesc || "",
        status: c.status || "DRAFT",
        price: c.price ? String(c.price) : "",
        currency: c.currency || "USD",
        isFree: c.isFree || false,
        level: c.level || "BEGINNER",
        duration: c.duration ? String(c.duration) : "",
        language: c.language || "en",
        prerequisites: Array.isArray(c.prerequisites)
          ? c.prerequisites.join(", ")
          : "",
        learningOutcomes: Array.isArray(c.learningOutcomes)
          ? c.learningOutcomes.join(", ")
          : "",
        tags: Array.isArray(c.tags) ? c.tags.join(", ") : "",
        scheduledAt: c.scheduledAt
          ? new Date(c.scheduledAt).toISOString().slice(0, 16)
          : "",
        thumbnailUrl: c.thumbnailUrl || "",
      });
    } catch {
      toast.error("Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadFile("thumbnails", file, (p) => {
        // Could show progress here
        console.log(`Upload progress: ${p}%`);
      });
      setForm((prev) => ({ ...prev, thumbnailUrl: res.data.data.url }));
      toast.success("Thumbnail uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        shortDesc: form.shortDesc || undefined,
        status: form.status,
        price: form.isFree ? undefined : parseFloat(form.price || "0"),
        currency: form.currency,
        isFree: form.isFree,
        level: form.level,
        duration: form.duration ? parseInt(form.duration) : undefined,
        language: form.language,
        prerequisites: form.prerequisites
          ? form.prerequisites.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        learningOutcomes: form.learningOutcomes
          ? form.learningOutcomes.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        tags: form.tags
          ? form.tags.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        scheduledAt: form.scheduledAt || undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
      };
      await courseApi.updateCourse(courseId, payload);
      toast.success("Course settings saved");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/courses")} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Course Settings</h1>
            <p className="text-sm text-gray-500">{course?.title}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Thumbnail */}
        <div>
          <label className="block text-sm font-medium">Thumbnail</label>
          <div className="mt-2 flex items-center gap-4">
            {form.thumbnailUrl ? (
              <div className="relative h-32 w-56 overflow-hidden rounded-lg border">
                <img
                  src={form.thumbnailUrl}
                  alt="Thumbnail"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, thumbnailUrl: "" }))}
                  className="absolute right-1 top-1 rounded bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-500 hover:bg-primary-50"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                ) : (
                  <>
                    <Image className="h-8 w-8 text-gray-400" />
                    <span className="mt-2 text-xs text-gray-500">Click to upload thumbnail</span>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleThumbnailUpload}
            />
          </div>
        </div>

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
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Short Description</label>
            <input
              value={form.shortDesc}
              onChange={(e) => setForm({ ...form, shortDesc: e.target.value })}
              className="input mt-1"
              maxLength={500}
            />
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
            <label className="block text-sm font-medium">Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={form.isFree}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="input mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="input mt-1"
            >
              <option value="USD">USD</option>
              <option value="KHR">KHR</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isFree"
              checked={form.isFree}
              onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
            />
            <label htmlFor="isFree" className="text-sm">Free course</label>
          </div>

          <div>
            <label className="block text-sm font-medium">Duration (minutes)</label>
            <input
              type="number"
              min="0"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="input mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Language</label>
            <input
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="input mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Prerequisites (comma-separated)</label>
            <input
              value={form.prerequisites}
              onChange={(e) => setForm({ ...form, prerequisites: e.target.value })}
              className="input mt-1"
              placeholder="Basic programming, HTML knowledge"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Learning Outcomes (comma-separated)</label>
            <input
              value={form.learningOutcomes}
              onChange={(e) => setForm({ ...form, learningOutcomes: e.target.value })}
              className="input mt-1"
              placeholder="Build a website, Understand CSS"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="input mt-1"
              placeholder="web, javascript, css"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Scheduled Publish Date</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              className="input mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Save Settings
          </button>
          <button
            type="button"
            onClick={() => navigate(`/courses/${courseId}/builder`)}
            className="btn-secondary"
          >
            Go to Builder
          </button>
        </div>
      </form>
    </div>
  );
};
