import { prisma } from "./lib/prisma";
import fs from "fs";
import path from "path";

const DOCS_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "documents");
const VIDEOS_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "videos");

// Ensure upload directories exist
if (!fs.existsSync(DOCS_UPLOAD_DIR)) {
  fs.mkdirSync(DOCS_UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(VIDEOS_UPLOAD_DIR)) {
  fs.mkdirSync(VIDEOS_UPLOAD_DIR, { recursive: true });
}

// Candidates for finding source files
const possiblePdfSourceDirs = [
  path.resolve(process.cwd(), "..", "..", "pdf_lessons", "video_lessons", "pdf_lessons"),
  path.resolve(process.cwd(), "..", "pdf_lessons", "video_lessons", "pdf_lessons"),
  path.resolve(process.cwd(), "uploads", "documents"),
];

const possibleVideoSourceFiles = [
  path.resolve(process.cwd(), "..", "..", "pdf_lessons", "video_lessons", "Video 1(Chapter01).mp4"),
  path.resolve(process.cwd(), "..", "pdf_lessons", "video_lessons", "Video 1(Chapter01).mp4"),
  path.resolve(VIDEOS_UPLOAD_DIR, "video-chapter01-1788262335.mp4"),
  path.resolve(VIDEOS_UPLOAD_DIR, "1785382622793-650226514.mp4"),
];

// Map filenames to friendly titles with clear Chapter numbers
const pdfFiles = [
  { file: "FIN 202_merged.pdf", title: "Chapter 02: FIN 202 - Financial Accounting" },
  { file: "FIN 207_merged.pdf", title: "Chapter 03: FIN 207 - Corporate Finance" },
  { file: "FIN 310_merged.pdf", title: "Chapter 04: FIN 310 - Investment Analysis" },
  { file: "FIN 311_merged.pdf", title: "Chapter 05: FIN 311 - Portfolio Management" },
  { file: "FIN 312_merged.pdf", title: "Chapter 06: FIN 312 - Risk Management" },
  { file: "FIN 406_merged.pdf", title: "Chapter 07: FIN 406 - International Finance" },
  { file: "FIN 414_merged.pdf", title: "Chapter 08: FIN 414 - Financial Modeling" },
  { file: "FIN 420_merged.pdf", title: "Chapter 09: FIN 420 - Derivatives & Options" },
  { file: "FIN 422_merged (2).pdf", title: "Chapter 10: FIN 422 - Fixed Income Securities" },
  { file: "FIN 423_merged.pdf", title: "Chapter 11: FIN 423 - Alternative Investments" },
];

function findPdfFile(filename: string): string | null {
  for (const dir of possiblePdfSourceDirs) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) return fullPath;
    const safeName = filename.replace(/\s+/g, "_");
    const safePath = path.join(dir, safeName);
    if (fs.existsSync(safePath)) return safePath;
  }
  return null;
}

function findVideoFile(): string | null {
  for (const p of possibleVideoSourceFiles) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function importLessons() {
  console.log(" Starting PDF and Video import...\n");

  // 1. Find or create Finance category
  let financeCategory = await prisma.category.findUnique({
    where: { slug: "finance" },
  });

  if (!financeCategory) {
    financeCategory = await prisma.category.create({
      data: {
        name: "Finance",
        slug: "finance",
        description: "Finance, investment, and accounting courses",
        sortOrder: 0,
      },
    });
    console.log(" Created Finance category:", financeCategory.id);
  } else {
    console.log(" Using existing Finance category:", financeCategory.id);
  }

  // 2. Find instructor
  const instructor = await prisma.user.findFirst({
    where: { role: { in: ["INSTRUCTOR", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
  });

  if (!instructor) {
    throw new Error("No instructor or admin found. Run npm run db:seed first.");
  }
  console.log(" Instructor:", instructor.email, "\n");

  // 3. Create or update course
  let course = await prisma.course.findUnique({
    where: { slug: "finance-program" },
  });

  if (!course) {
    course = await prisma.course.create({
      data: {
        title: "Financial Application Design & Analysis",
        slug: "finance-program",
        description:
          "A comprehensive collection of finance lessons covering financial accounting, corporate finance, investment analysis, portfolio management, risk management, and video lectures.",
        shortDesc: "Complete Finance & FinTech Curriculum with Video and PDF materials",
        status: "PUBLISHED",
        price: 0,
        currency: "USD",
        isFree: true,
        level: "INTERMEDIATE",
        duration: 480,
        language: "en",
        prerequisites: [],
        learningOutcomes: [
          "Master financial accounting and statement analysis",
          "Apply corporate finance techniques and valuation models",
          "Evaluate investment opportunities and fixed income securities",
          "Manage portfolio risk and explore alternative investments",
        ],
        tags: ["finance", "accounting", "investment", "fintech", "corporate-finance"],
        publishedAt: new Date(),
        instructorId: instructor.id,
        categoryId: financeCategory.id,
      },
    });
    console.log(" Created course:", course.title, "\n");
  } else {
    console.log(" Using existing course:", course.title, "\n");
  }

  // 4. Import Video Lesson (Chapter 01)
  const videoSrc = findVideoFile();
  let videoContentUrl = "/uploads/videos/video-chapter01.mp4";
  if (videoSrc) {
    const destVideo = path.join(VIDEOS_UPLOAD_DIR, "video-chapter01.mp4");
    if (!fs.existsSync(destVideo) || fs.statSync(destVideo).size !== fs.statSync(videoSrc).size) {
      console.log(`Copying video from ${videoSrc} to ${destVideo}...`);
      fs.copyFileSync(videoSrc, destVideo);
    }
    videoContentUrl = "/uploads/videos/video-chapter01.mp4";
    console.log(" Video source ready:", videoContentUrl);
  }

  // Check or create Video Module
  let videoModule = await prisma.module.findFirst({
    where: { courseId: course.id, title: "Module 1: Video Lectures" },
  });

  if (!videoModule) {
    videoModule = await prisma.module.create({
      data: {
        courseId: course.id,
        title: "Module 1: Video Lectures",
        description: "Recorded video lessons and lecture recordings.",
        sortOrder: 0,
        isPublished: true,
      },
    });
  }

  // Create Video Lesson
  const existingVideoLesson = await prisma.lesson.findFirst({
    where: { moduleId: videoModule.id, title: "Chapter 01: Financial Foundations" },
  });

  if (!existingVideoLesson) {
    await prisma.lesson.create({
      data: {
        moduleId: videoModule.id,
        title: "Chapter 01: Financial Foundations",
        description: "Comprehensive video lecture on financial application design principles.",
        contentType: "video",
        contentUrl: videoContentUrl,
        duration: 45,
        isPublished: true,
        isPreview: true,
        sortOrder: 0,
      },
    });
    console.log(" Created Video Lesson: Chapter 01: Financial Foundations");
  }

  // 5. Import PDF Lessons
  for (let i = 0; i < pdfFiles.length; i++) {
    const { file, title } = pdfFiles[i];
    const sourcePath = findPdfFile(file);

    if (!sourcePath) {
      console.warn(`  Skipping missing file: ${file}`);
      continue;
    }

    const safeName = file.replace(/\s+/g, "_");
    const destPath = path.join(DOCS_UPLOAD_DIR, safeName);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(sourcePath, destPath);
    }
    const contentUrl = `/uploads/documents/${safeName}`;

    const moduleTitle = `Module ${i + 2}: ${title}`;

    // Find or create module for this topic
    let moduleRecord = await prisma.module.findFirst({
      where: {
        courseId: course.id,
        title: moduleTitle,
      },
    });

    if (!moduleRecord) {
      moduleRecord = await prisma.module.create({
        data: {
          courseId: course.id,
          title: moduleTitle,
          description: `Lecture notes and comprehensive materials for ${title}.`,
          sortOrder: i + 1,
          isPublished: true,
        },
      });
    } else {
      moduleRecord = await prisma.module.update({
        where: { id: moduleRecord.id },
        data: {
          title: moduleTitle,
          isPublished: true,
        },
      });
    }

    // Find or create lesson
    const existingLesson = await prisma.lesson.findFirst({
      where: { moduleId: moduleRecord.id, contentUrl },
    });

    if (!existingLesson) {
      await prisma.lesson.create({
        data: {
          moduleId: moduleRecord.id,
          title,
          description: `Complete textbook & curriculum notes for ${title}`,
          contentType: "pdf",
          contentUrl,
          duration: 60,
          isPublished: true,
          isPreview: false,
          sortOrder: 0,
          attachments: [],
        },
      });
      console.log(`   Lesson created: ${title} -> ${contentUrl}`);
    } else {
      await prisma.lesson.update({
        where: { id: existingLesson.id },
        data: {
          title,
          description: `Complete textbook & curriculum notes for ${title}`,
          contentUrl,
          isPublished: true,
          isPreview: false,
        },
      });
      console.log(`   Lesson updated: ${title} -> ${contentUrl}`);
    }
  }

  // 6. Import Capstone Reports & Project Proposals
  const reportFiles = [
    { file: "Sprint1_Report.pdf", title: "Capstone: Sprint 1 Report", relativeDir: "../../dialy_reports" },
    { file: "Project Proposal -- ELMS.pdf", title: "ELMS Project Proposal", relativeDir: "../.." },
    { file: "01 Topic and functionalities.pdf", title: "Agile 01: Topics & Functionalities", relativeDir: "../.." },
    { file: "02 Product backlogs.pdf", title: "Agile 02: Product Backlog", relativeDir: "../.." },
    { file: "03 Sprint planning.pdf", title: "Agile 03: Sprint Planning", relativeDir: "../.." },
    { file: "Agile.pdf", title: "Agile Development Guide", relativeDir: "../.." },
  ];

  let reportsModule = await prisma.module.findFirst({
    where: { courseId: course.id, title: "Module 12: Capstone Reports & Project Proposals" },
  });

  if (!reportsModule) {
    reportsModule = await prisma.module.create({
      data: {
        courseId: course.id,
        title: "Module 12: Capstone Reports & Project Proposals",
        description: "Official capstone sprint reports, project proposal, and Agile planning documentation.",
        sortOrder: 12,
        isPublished: true,
      },
    });
  }

  for (let r = 0; r < reportFiles.length; r++) {
    const rf = reportFiles[r];
    const srcPath = path.resolve(process.cwd(), rf.relativeDir, rf.file);
    if (!fs.existsSync(srcPath)) continue;

    const safeName = rf.file.replace(/\s+/g, "_");
    const destPath = path.join(DOCS_UPLOAD_DIR, safeName);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
    const contentUrl = `/uploads/documents/${safeName}`;

    const existingReportLesson = await prisma.lesson.findFirst({
      where: { moduleId: reportsModule.id, title: rf.title },
    });

    if (!existingReportLesson) {
      await prisma.lesson.create({
        data: {
          moduleId: reportsModule.id,
          title: rf.title,
          description: `Document: ${rf.title}`,
          contentType: "pdf",
          contentUrl,
          duration: 30,
          isPublished: true,
          isPreview: true,
          sortOrder: r,
          attachments: [],
        },
      });
      console.log(`   Report Lesson created: ${rf.title} -> ${contentUrl}`);
    }
  }

  // 7. Enroll student@elms.edu in this course
  const student = await prisma.user.findUnique({ where: { email: "student@elms.edu" } });
  if (student) {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
      update: { status: "active" },
      create: {
        userId: student.id,
        courseId: course.id,
        status: "active",
        progressPercent: 35,
        enrolledAt: new Date(),
        enrolledBy: student.id,
      },
    });
    console.log("\n Enrolled student@elms.edu in course:", course.title);
  }

  console.log("\n All PDF and Video lessons imported successfully!");
}

importLessons()
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
