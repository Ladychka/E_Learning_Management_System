import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { courseApi, moduleApi, lessonApi, uploadApi } from "@/lib/api";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  FileText,
  Video,
  HelpCircle,
  Eye,
  Loader2,
  Save,
  CheckCircle,
  ArrowLeft,
  Settings,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LessonItem {
  id: string;
  title: string;
  description?: string;
  contentType: string;
  contentUrl?: string;
  isPublished: boolean;
  isPreview: boolean;
  sortOrder: number;
  duration?: number;
  quiz?: { id: string; title: string } | null;
}

interface ModuleItem {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  isPublished: boolean;
  lessons: LessonItem[];
}

function SortableModuleRow({
  mod,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddLesson,
  children,
}: {
  mod: ModuleItem;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  children?: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mod.id, data: { type: "module" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="card overflow-hidden p-0 mb-3">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <button onClick={onToggle} className="text-gray-500">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <button
          className="cursor-grab text-gray-300 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex-1 font-semibold">{mod.title}</span>
        {mod.isPublished ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <EyeOff className="h-4 w-4 text-gray-400" />
        )}
        <button
          onClick={onAddLesson}
          className="rounded p-1 text-gray-500 hover:bg-gray-200"
          title="Add Lesson"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={onEdit}
          className="rounded p-1 text-gray-500 hover:bg-gray-200"
          title="Edit Module"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-red-500 hover:bg-red-50"
          title="Delete Module"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {expanded && <div className="divide-y divide-gray-100">{children}</div>}
    </div>
  );
}

function SortableLessonRow({
  lesson,
  moduleId,
  onTogglePreview,
  onEdit,
  onDelete,
}: {
  lesson: LessonItem;
  moduleId: string;
  onTogglePreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id, data: { type: "lesson", moduleId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const contentTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "quiz":
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50"
    >
      <button
        className="cursor-grab text-gray-300 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-gray-500">{contentTypeIcon(lesson.contentType)}</span>
      <span className="flex-1 text-sm">{lesson.title}</span>
      {lesson.isPreview && (
        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
          Preview
        </span>
      )}
      {lesson.quiz && (
        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
          Quiz
        </span>
      )}
      {lesson.duration && (
        <span className="text-xs text-gray-400">{lesson.duration}m</span>
      )}
      {lesson.contentType === "quiz" && (
        <Link
          to={`/lessons/${lesson.id}/quiz`}
          className="rounded p-1 text-purple-600 hover:bg-purple-50"
          title="Quiz Builder"
        >
          <HelpCircle className="h-4 w-4" />
        </Link>
      )}
      <button
        onClick={onTogglePreview}
        className={`rounded p-1 ${lesson.isPreview ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
        title="Toggle Preview"
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        onClick={onEdit}
        className="rounded p-1 text-gray-500 hover:bg-gray-200"
        title="Edit Lesson"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={onDelete}
        className="rounded p-1 text-red-500 hover:bg-red-50"
        title="Delete Lesson"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export const CourseBuilder = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Module form
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });

  // Lesson form
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    contentType: "text",
    contentUrl: "",
    duration: "",
    isPreview: false,
    dripDays: "",
  });
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [courseRes, modulesRes] = await Promise.all([
        courseApi.getCourse(courseId),
        moduleApi.getModules(courseId),
      ]);
      setCourse(courseRes.data.data);
      setModules(modulesRes.data.data);
      // Auto-expand first module
      if (modulesRes.data.data.length > 0) {
        setExpandedModules(new Set([modulesRes.data.data[0].id]));
      }
    } catch {
      toast.error("Failed to load course content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  // Module CRUD
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    try {
      if (editingModuleId) {
        await moduleApi.updateModule(courseId, editingModuleId, moduleForm);
        toast.success("Module updated");
      } else {
        await moduleApi.createModule(courseId, moduleForm);
        toast.success("Module created");
      }
      setShowModuleForm(false);
      setEditingModuleId(null);
      setModuleForm({ title: "", description: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save module");
    }
  };

  const handleEditModule = (mod: ModuleItem) => {
    setEditingModuleId(mod.id);
    setModuleForm({ title: mod.title, description: mod.description || "" });
    setShowModuleForm(true);
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!courseId || !confirm("Delete this module and all its lessons?")) return;
    try {
      await moduleApi.deleteModule(courseId, moduleId);
      toast.success("Module deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete module");
    }
  };

  const handleUploadLessonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const folder = lessonForm.contentType === "video" ? "videos" : "documents";
    setUploading(true);
    try {
      const res = await uploadApi.uploadFile(folder, file);
      setLessonForm((prev) => ({ ...prev, contentUrl: res.data.data.url }));
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Lesson CRUD
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleId) return;
    try {
      const payload = {
        ...lessonForm,
        duration: lessonForm.duration ? parseInt(lessonForm.duration) : undefined,
        dripDays: lessonForm.dripDays ? parseInt(lessonForm.dripDays) : undefined,
      };
      if (editingLessonId) {
        await lessonApi.updateLesson(editingLessonId, payload);
        toast.success("Lesson updated");
      } else {
        await lessonApi.createLesson(activeModuleId, payload);
        toast.success("Lesson created");
      }
      setShowLessonForm(false);
      setEditingLessonId(null);
      setActiveModuleId(null);
      setLessonForm({
        title: "",
        description: "",
        contentType: "text",
        contentUrl: "",
        duration: "",
        isPreview: false,
        dripDays: "",
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save lesson");
    }
  };

  const handleEditLesson = (lesson: LessonItem, moduleId: string) => {
    setEditingLessonId(lesson.id);
    setActiveModuleId(moduleId);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || "",
      contentType: lesson.contentType,
      contentUrl: lesson.contentUrl || "",
      duration: lesson.duration ? String(lesson.duration) : "",
      isPreview: lesson.isPreview,
      dripDays: "",
    });
    setShowLessonForm(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Delete this lesson?")) return;
    try {
      await lessonApi.deleteLesson(lessonId);
      toast.success("Lesson deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete lesson");
    }
  };

  const handleTogglePreview = async (lesson: LessonItem) => {
    try {
      await lessonApi.updateLesson(lesson.id, { isPreview: !lesson.isPreview });
      toast.success(lesson.isPreview ? "Preview disabled" : "Preview enabled");
      fetchData();
    } catch {
      toast.error("Failed to toggle preview");
    }
  };

  // Drag and drop handlers
  const handleModuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newModules = arrayMove(modules, oldIndex, newIndex);
    setModules(newModules);

    // Persist to backend
    const orders = newModules.map((m, idx) => ({ id: m.id, sortOrder: idx }));
    try {
      await moduleApi.reorderModules(courseId!, orders);
      toast.success("Modules reordered");
    } catch {
      toast.error("Failed to save module order");
      // Optionally revert
    }
  };

  const handleLessonDragEnd = async (moduleId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const moduleIndex = modules.findIndex((m) => m.id === moduleId);
    if (moduleIndex === -1) return;

    const lessons = modules[moduleIndex].lessons;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newLessons = arrayMove(lessons, oldIndex, newIndex);
    const newModules = [...modules];
    newModules[moduleIndex] = { ...newModules[moduleIndex], lessons: newLessons };
    setModules(newModules);

    // Persist to backend
    const orders = newLessons.map((l, idx) => ({ id: l.id, sortOrder: idx }));
    try {
      await lessonApi.reorderLessons(moduleId, orders);
      toast.success("Lessons reordered");
    } catch {
      toast.error("Failed to save lesson order");
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
            <h1 className="text-2xl font-bold">{course?.title || "Course Builder"}</h1>
            <p className="text-sm text-gray-500">Build modules, lessons, and quizzes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/courses/${courseId}/settings`)}
            className="btn-secondary"
          >
            <Settings className="mr-1 h-4 w-4" />
            Settings
          </button>
          <button
            onClick={() => {
              setEditingModuleId(null);
              setModuleForm({ title: "", description: "" });
              setShowModuleForm(true);
            }}
            className="btn-primary"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Module
          </button>
        </div>
      </div>

      {/* Module Form */}
      {showModuleForm && (
        <form onSubmit={handleSaveModule} className="card space-y-3">
          <h3 className="font-semibold">{editingModuleId ? "Edit Module" : "New Module"}</h3>
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              required
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              rows={2}
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              className="input mt-1"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary"><Save className="mr-1 h-4 w-4" /> Save</button>
            <button type="button" onClick={() => setShowModuleForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Lesson Form */}
      {showLessonForm && (
        <form onSubmit={handleSaveLesson} className="card space-y-3">
          <h3 className="font-semibold">{editingLessonId ? "Edit Lesson" : "New Lesson"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Title</label>
              <input
                required
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Content Type</label>
              <select
                value={lessonForm.contentType}
                onChange={(e) => setLessonForm({ ...lessonForm, contentType: e.target.value })}
                className="input mt-1"
              >
                <option value="text">Text</option>
                <option value="video">Video</option>
                <option value="pdf">PDF / Document</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Duration (min)</label>
              <input
                type="number"
                value={lessonForm.duration}
                onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Content URL / Path</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={lessonForm.contentUrl}
                  onChange={(e) => setLessonForm({ ...lessonForm, contentUrl: e.target.value })}
                  className="input flex-1"
                  placeholder="/uploads/videos/file.mp4 or text content"
                />
                {(lessonForm.contentType === "video" || lessonForm.contentType === "pdf") && (
                  <>
                    <input
                      type="file"
                      accept={lessonForm.contentType === "video" ? "video/*" : ".pdf"}
                      className="hidden"
                      id="lesson-upload"
                      onChange={handleUploadLessonFile}
                    />
                    <label htmlFor="lesson-upload">
                      <button
                        type="button"
                        className="btn-secondary whitespace-nowrap"
                        onClick={() => document.getElementById("lesson-upload")?.click()}
                        disabled={uploading}
                      >
                        {uploading ? "Uploading..." : "Upload File"}
                      </button>
                    </label>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Drip Days (unlock after N days)</label>
              <input
                type="number"
                min="0"
                value={lessonForm.dripDays}
                onChange={(e) => setLessonForm({ ...lessonForm, dripDays: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isPreview"
                checked={lessonForm.isPreview}
                onChange={(e) => setLessonForm({ ...lessonForm, isPreview: e.target.checked })}
              />
              <label htmlFor="isPreview" className="text-sm">Free preview</label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary"><Save className="mr-1 h-4 w-4" /> Save</button>
            <button type="button" onClick={() => setShowLessonForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Modules Tree with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleModuleDragEnd}
      >
        <SortableContext
          items={modules.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {modules.length === 0 ? (
              <div className="card py-12 text-center text-gray-500">
                No modules yet. Click "Add Module" to get started.
              </div>
            ) : (
              modules.map((mod) => (
                <SortableModuleRow
                  key={mod.id}
                  mod={mod}
                  expanded={expandedModules.has(mod.id)}
                  onToggle={() => toggleModule(mod.id)}
                  onEdit={() => handleEditModule(mod)}
                  onDelete={() => handleDeleteModule(mod.id)}
                  onAddLesson={() => {
                    setActiveModuleId(mod.id);
                    setEditingLessonId(null);
                    setLessonForm({
                      title: "",
                      description: "",
                      contentType: "text",
                      contentUrl: "",
                      duration: "",
                      isPreview: false,
                      dripDays: "",
                    });
                    setShowLessonForm(true);
                  }}
                >
                  {mod.lessons.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-400">No lessons yet.</div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleLessonDragEnd(mod.id, e)}
                    >
                      <SortableContext
                        items={mod.lessons.map((l) => l.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {mod.lessons.map((lesson) => (
                          <SortableLessonRow
                            key={lesson.id}
                            lesson={lesson}
                            moduleId={mod.id}
                            onTogglePreview={() => handleTogglePreview(lesson)}
                            onEdit={() => handleEditLesson(lesson, mod.id)}
                            onDelete={() => handleDeleteLesson(lesson.id)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </SortableModuleRow>
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
