import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/*
  ELMS Bulk Course Upload Script
  ──────────────────────────────
  Usage:
    1. Create/edit "course-manifest.json" next to this file
    2. Put your video files in the folder referenced by "videoFolder"
    3. Run: npx tsx scripts/upload-course.ts
    4. Re-run anytime after adding more videos — it skips already-uploaded items.

  The script maintains state in ".upload-state.json" so it is safe to re-run.
*/

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = process.argv[2] || path.join(__dirname, "course-manifest.json");
const STATE_PATH = path.join(__dirname, ".upload-state.json");

// ─── Types ─────────────────────────────────────────────────

interface Manifest {
  baseUrl: string;
  credentials: { email: string; password: string };
  category?: { useExistingId?: string | null; createIfNotExists?: CreateCategoryPayload };
  course: CreateCoursePayload;
  videoFolder: string;
  modules: ManifestModule[];
}

interface ManifestModule {
  title: string;
  description?: string;
  lessons: ManifestLesson[];
}

interface ManifestLesson {
  title: string;
  description?: string;
  videoFile?: string; // filename inside videoFolder (e.g. "01-intro.mp4")
  contentType?: "video" | "pdf" | "text" | "quiz";
  duration?: number; // seconds
  isPreview?: boolean;
  isPublished?: boolean;
}

interface State {
  token?: string;
  categoryId?: string;
  courseId?: string;
  modules?: Record<string, ModuleState>; // key = module title
}

interface ModuleState {
  id: string;
  lessons: Record<string, LessonState>; // key = lesson title
}

interface LessonState {
  id: string;
  videoUrl?: string;
  uploaded?: boolean;
}

interface CreateCategoryPayload {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
}

interface CreateCoursePayload {
  title: string;
  description?: string;
  shortDesc?: string;
  categoryId?: string;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  price?: number;
  currency?: string;
  isFree?: boolean;
  duration?: number;
  language?: string;
  prerequisites?: string[];
  learningOutcomes?: string[];
  tags?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────

function log(section: string, message: string) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] [${section}] ${message}`);
}

function loadManifest(): Manifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found: ${MANIFEST_PATH}\nCreate it from the example first.`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8")) as Manifest;
}

function loadState(): State {
  if (!fs.existsSync(STATE_PATH)) return {};
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")) as State;
}

function saveState(state: State) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function request(baseUrl: string, token: string | null, endpoint: string, init: RequestInit = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = (data as any)?.message || text || `HTTP ${res.status}`;
    throw new Error(`API error (${res.status}) on ${endpoint}: ${msg}`);
  }

  return data as any;
}

// ─── Steps ─────────────────────────────────────────────────

async function login(baseUrl: string, credentials: Manifest["credentials"]): Promise<string> {
  log("AUTH", `Logging in as ${credentials.email} ...`);
  const res = await request(baseUrl, null, "/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const token = res.data?.accessToken as string;
  if (!token) throw new Error("Login response missing accessToken");
  log("AUTH", "Login successful.");
  return token;
}

async function ensureCategory(baseUrl: string, token: string, categoryCfg: Manifest["category"]): Promise<string | undefined> {
  if (!categoryCfg) return undefined;

  if (categoryCfg.useExistingId) {
    log("CAT", `Using existing category ${categoryCfg.useExistingId}`);
    return categoryCfg.useExistingId;
  }

  if (!categoryCfg.createIfNotExists) return undefined;

  const payload = categoryCfg.createIfNotExists;
  log("CAT", `Creating category "${payload.name}" ...`);
  try {
    const res = await request(baseUrl, token, "/api/v1/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    log("CAT", `Category created: ${res.data.id}`);
    return res.data.id as string;
  } catch (err: any) {
    // If it already exists (409), try to fetch it
    if (err.message.includes("409") || err.message.includes("already exists")) {
      log("CAT", "Category already exists, fetching by slug...");
      const list = await request(baseUrl, token, "/api/v1/categories", { method: "GET" });
      const found = list.data?.find((c: any) => c.slug === payload.slug || c.name === payload.name);
      if (found) {
        log("CAT", `Found existing category: ${found.id}`);
        return found.id as string;
      }
    }
    throw err;
  }
}

async function ensureCourse(baseUrl: string, token: string, payload: CreateCoursePayload, categoryId?: string): Promise<string> {
  log("COURSE", `Creating course "${payload.title}" ...`);
  const body = { ...payload };
  if (categoryId) body.categoryId = categoryId;

  const res = await request(baseUrl, token, "/api/v1/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const courseId = res.data.id as string;
  log("COURSE", `Course created: ${courseId}`);
  return courseId;
}

async function createModule(baseUrl: string, token: string, courseId: string, mod: ManifestModule): Promise<string> {
  log("MODULE", `Creating module "${mod.title}" ...`);
  const res = await request(baseUrl, token, `/api/v1/courses/${courseId}/modules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: mod.title, description: mod.description || "" }),
  });
  const moduleId = res.data.id as string;
  log("MODULE", `Module created: ${moduleId}`);
  return moduleId;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
  };
  return map[ext] || "application/octet-stream";
}

async function uploadVideo(baseUrl: string, token: string, filePath: string): Promise<string> {
  const fileName = path.basename(filePath);
  log("UPLOAD", `Uploading "${fileName}" ...`);

  const buffer = fs.readFileSync(filePath);
  const mimeType = getMimeType(filePath);
  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.append("file", blob as any, fileName);

  const res = await request(baseUrl, token, "/api/v1/upload/videos", {
    method: "POST",
    body: form as any,
  });

  const url = res.data?.url as string;
  log("UPLOAD", `Upload complete: ${url}`);
  return url;
}

async function createLesson(
  baseUrl: string,
  token: string,
  courseId: string,
  moduleId: string,
  lesson: ManifestLesson,
  videoUrl?: string
): Promise<string> {
  log("LESSON", `Creating lesson "${lesson.title}" ...`);
  const body: any = {
    title: lesson.title,
    description: lesson.description || "",
    contentType: lesson.contentType || "video",
    contentUrl: videoUrl || null,
    duration: lesson.duration || null,
    isPublished: lesson.isPublished ?? false,
    isPreview: lesson.isPreview ?? false,
  };

  const res = await request(baseUrl, token, `/api/v1/courses/${courseId}/modules/${moduleId}/lessons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const lessonId = res.data.id as string;
  log("LESSON", `Lesson created: ${lessonId}`);
  return lessonId;
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  const manifest = loadManifest();
  const state = loadState();

  const { baseUrl, credentials, course, modules: manifestModules, videoFolder } = manifest;

  // 1. Login
  if (!state.token) {
    state.token = await login(baseUrl, credentials);
    saveState(state);
  }
  const token = state.token!;

  // 2. Category
  if (!state.categoryId && manifest.category) {
    state.categoryId = await ensureCategory(baseUrl, token, manifest.category);
    saveState(state);
  }

  // 3. Course
  if (!state.courseId) {
    state.courseId = await ensureCourse(baseUrl, token, course, state.categoryId);
    saveState(state);
  }
  const courseId = state.courseId!;

  // 4. Modules & Lessons
  if (!state.modules) state.modules = {};

  for (let mIdx = 0; mIdx < manifestModules.length; mIdx++) {
    const modManifest = manifestModules[mIdx];
    const modKey = modManifest.title;
    let modState = state.modules[modKey];

    // Create module if missing
    if (!modState) {
      const moduleId = await createModule(baseUrl, token, courseId, modManifest);
      modState = { id: moduleId, lessons: {} };
      state.modules[modKey] = modState;
      saveState(state);
    }

    const moduleId = modState.id;

    for (let lIdx = 0; lIdx < modManifest.lessons.length; lIdx++) {
      const lesManifest = modManifest.lessons[lIdx];
      const lesKey = lesManifest.title;

      if (modState.lessons[lesKey]) {
        log("SKIP", `Lesson "${lesKey}" already exists, skipping.`);
        continue;
      }

      let videoUrl: string | undefined;
      if (lesManifest.videoFile) {
        const videoPath = path.resolve(videoFolder, lesManifest.videoFile);
        if (fs.existsSync(videoPath)) {
          videoUrl = await uploadVideo(baseUrl, token, videoPath);
        } else {
          log("WARN", `Video not found: ${videoPath}. Creating lesson without video.`);
        }
      }

      const lessonId = await createLesson(baseUrl, token, courseId, moduleId, lesManifest, videoUrl);
      modState.lessons[lesKey] = { id: lessonId, videoUrl, uploaded: !!videoUrl };
      saveState(state);
    }
  }

  log("DONE", "Upload complete! Summary:");
  console.log(`  Course ID : ${courseId}`);
  console.log(`  Modules   : ${Object.keys(state.modules).length}`);
  const totalLessons = Object.values(state.modules).reduce((sum, m) => sum + Object.keys(m.lessons).length, 0);
  console.log(`  Lessons   : ${totalLessons}`);
}

main().catch((err) => {
  console.error("\n❌ Upload failed:", err.message);
  process.exit(1);
});
