import { prisma } from "./lib/prisma";
import { hashPassword } from "./utils/password";

type AnyRecord = Record<string, any>;

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

const letterGrade = (percentage: number) => {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
};

const upsertUser = async (
  email: string,
  password: string,
  data: AnyRecord
) => {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      status: "ACTIVE",
      isEmailVerified: true,
      emailVerifiedAt: daysAgo(180),
      lastLoginAt: daysAgo(1),
      deactivatedAt: null,
    },
    create: {
      email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      status: "ACTIVE",
      isEmailVerified: true,
      emailVerifiedAt: daysAgo(180),
      lastLoginAt: daysAgo(1),
    },
  });
};

const upsertProfile = async (userId: string, data: AnyRecord) =>
  prisma.profile.upsert({
    where: { userId },
    update: data as any,
    create: { userId, ...data } as any,
  });

const upsertCategory = async (data: AnyRecord) =>
  prisma.category.upsert({
    where: { slug: data.slug },
    update: data as any,
    create: data as any,
  });

const upsertCourse = async (data: AnyRecord) =>
  prisma.course.upsert({
    where: { slug: data.slug },
    update: data as any,
    create: data as any,
  });

const upsertModule = async (courseId: string, data: AnyRecord) => {
  const existing = await prisma.module.findFirst({
    where: { courseId, title: data.title },
  });
  if (existing) {
    return prisma.module.update({
      where: { id: existing.id },
      data: { ...data, courseId },
    });
  }
    return prisma.module.create({ data: { courseId, ...data } as any });
};

const upsertLesson = async (moduleId: string, data: AnyRecord) => {
  const existing = await prisma.lesson.findFirst({
    where: { moduleId, title: data.title },
  });
  if (existing) {
    return prisma.lesson.update({
      where: { id: existing.id },
      data: { ...data, moduleId },
    });
  }
    return prisma.lesson.create({ data: { moduleId, ...data } as any });
};

const upsertLessonVersion = async (
  lessonId: string,
  version: number,
  content: string,
  createdBy: string
) => {
  const existing = await prisma.lessonVersion.findFirst({
    where: { lessonId, version },
  });
  if (existing) {
    return prisma.lessonVersion.update({
      where: { id: existing.id },
      data: { content, createdBy },
    });
  }
  return prisma.lessonVersion.create({
    data: { lessonId, version, content, createdBy },
  });
};

const upsertQuiz = async (lessonId: string, data: AnyRecord) =>
  prisma.quiz.upsert({
    where: { lessonId },
    update: data as any,
    create: { lessonId, ...data } as any,
  });

const upsertQuestion = async (quizId: string, data: AnyRecord) => {
  const existing = await prisma.question.findFirst({
    where: { quizId, sortOrder: data.sortOrder },
  });
  if (existing) {
    return prisma.question.update({
      where: { id: existing.id },
      data: { ...data, quizId },
    });
  }
  return prisma.question.create({ data: { quizId, ...data } as any });
};

const seedQuiz = async (
  lessonId: string,
  data: AnyRecord,
  questions: AnyRecord[]
) => {
  const quiz = await upsertQuiz(lessonId, data);
  for (const question of questions) {
    await upsertQuestion(quiz.id, question);
  }
  const fullQuiz = await prisma.quiz.findUnique({
    where: { id: quiz.id },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  if (!fullQuiz) throw new Error(`Quiz not found after seed: ${quiz.id}`);
  return fullQuiz;
};

const upsertEnrollment = async (
  userId: string,
  courseId: string,
  data: AnyRecord
) =>
  prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: data as any,
    create: { userId, courseId, ...data } as any,
  });

const seedLessonCompletions = async ({
  userId,
  courseId,
  lessonIds,
  status,
  completedAt = null,
}: {
  userId: string;
  courseId: string;
  lessonIds: string[];
  status: "active" | "completed" | "expired";
  completedAt?: Date | null;
}) => {
  // Remove stale completions so re-running the seed always converges on the
  // planned set instead of accumulating records.
  await prisma.lessonCompletion.deleteMany({
    where: {
      userId,
      courseId,
      ...(lessonIds.length > 0 ? { lessonId: { notIn: lessonIds } } : {}),
    },
  });

  for (const [index, lessonId] of lessonIds.entries()) {
    await prisma.lessonCompletion.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { courseId },
      create: {
        userId,
        lessonId,
        courseId,
        completedAt: completedAt ?? daysAgo(Math.max(1, 12 - index)),
      },
    });
  }

  const totalLessons = await prisma.lesson.count({
    where: { isPublished: true, module: { courseId, isPublished: true } },
  });
  const progressPercent =
    totalLessons > 0
      ? Math.min(100, Math.round((lessonIds.length / totalLessons) * 100))
      : 0;
  const finalStatus =
    progressPercent >= 100
      ? "completed"
      : status === "completed"
      ? "active"
      : status;

  await prisma.enrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: {
      progressPercent,
      status: finalStatus,
      completedAt: finalStatus === "completed" ? completedAt ?? daysAgo(30) : null,
    },
  });

  console.log(
    `Lesson completions: ${lessonIds.length}/${totalLessons} (${progressPercent}%) status=${finalStatus}`
  );
};

const upsertWaitlist = async (
  userId: string,
  courseId: string,
  data: AnyRecord
) =>
  prisma.waitlist.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: data as any,
    create: { userId, courseId, ...data } as any,
  });

const upsertCertificate = async (
  certificateNumber: string,
  data: AnyRecord
) =>
  prisma.certificate.upsert({
    where: { certificateNumber },
    update: data as any,
    create: { certificateNumber, ...data } as any,
  });

const upsertGradeCategory = async (
  courseId: string,
  name: string,
  weight: number,
  sortOrder: number
) =>
  prisma.gradeCategory.upsert({
    where: { courseId_name: { courseId, name } },
    update: { weight, sortOrder },
    create: { courseId, name, weight, sortOrder },
  });

const upsertAssignment = async (courseId: string, data: AnyRecord) => {
  const existing = await prisma.assignment.findFirst({
    where: { courseId, title: data.title },
  });
  if (existing) {
    return prisma.assignment.update({
      where: { id: existing.id },
      data: { ...data, courseId },
    });
  }
  return prisma.assignment.create({ data: { courseId, ...data } as any });
};

const upsertRubric = async (assignmentId: string, data: AnyRecord) =>
  prisma.rubric.upsert({
    where: { assignmentId },
    update: data as any,
    create: { assignmentId, ...data } as any,
  });

const upsertCriterion = async (rubricId: string, data: AnyRecord) => {
  const existing = await prisma.rubricCriterion.findFirst({
    where: { rubricId, title: data.title },
  });
  if (existing) {
    return prisma.rubricCriterion.update({
      where: { id: existing.id },
      data: { ...data, rubricId },
    });
  }
  return prisma.rubricCriterion.create({ data: { rubricId, ...data } as any });
};

const upsertCriterionLevel = async (
  criterionId: string,
  data: AnyRecord
) => {
  const existing = await prisma.rubricCriterionLevel.findFirst({
    where: { criterionId, title: data.title },
  });
  if (existing) {
    return prisma.rubricCriterionLevel.update({
      where: { id: existing.id },
      data: { ...data, criterionId },
    });
  }
  return prisma.rubricCriterionLevel.create({
    data: { criterionId, ...data } as any,
  });
};

const upsertSubmission = async (
  assignmentId: string,
  studentId: string,
  data: AnyRecord
) => {
  const existing = await prisma.submission.findFirst({
    where: { assignmentId, studentId },
  });
  if (existing) {
    return prisma.submission.update({
      where: { id: existing.id },
      data: { ...data, assignmentId, studentId },
    });
  }
  return prisma.submission.create({
    data: { assignmentId, studentId, ...data } as any,
  });
};

const upsertGrade = async (data: AnyRecord) => {
  const where: AnyRecord = {
    studentId: data.studentId,
    courseId: data.courseId,
  };
  if (data.assignmentId) where.assignmentId = data.assignmentId;
  else if (data.quizId) where.quizId = data.quizId;
  else {
    where.assignmentId = null;
    where.quizId = null;
  }
  const existing = await prisma.grade.findFirst({ where });
  if (existing) {
    return prisma.grade.update({ where: { id: existing.id }, data });
  }
  return prisma.grade.create({ data: data as any });
};

const upsertRubricGrade = async (
  gradeId: string,
  criterionId: string,
  data: AnyRecord
) =>
  prisma.rubricGrade.upsert({
    where: { gradeId_criterionId: { gradeId, criterionId } },
    update: data as any,
    create: { gradeId, criterionId, ...data } as any,
  });

const upsertGradeAppeal = async (id: string, data: AnyRecord) =>
  prisma.gradeAppeal.upsert({
    where: { id },
    update: data as any,
    create: { id, ...data } as any,
  });

const upsertCoupon = async (data: AnyRecord) =>
  prisma.coupon.upsert({
    where: { code: data.code },
    update: data as any,
    create: data as any,
  });

const upsertSubscriptionPlan = async (data: AnyRecord) => {
  const existing = await prisma.subscriptionPlan.findFirst({
    where: { name: data.name },
  });
  if (existing) {
    return prisma.subscriptionPlan.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.subscriptionPlan.create({ data: data as any });
};

const upsertPayment = async (gatewayRef: string, data: AnyRecord) => {
  const existing = await prisma.payment.findFirst({ where: { gatewayRef } });
  if (existing) {
    return prisma.payment.update({
      where: { id: existing.id },
      data: { ...data, gatewayRef },
    });
  }
  return prisma.payment.create({ data: { gatewayRef, ...data } as any });
};

const upsertPayout = async (id: string, data: AnyRecord) =>
  prisma.instructorPayout.upsert({
    where: { id },
    update: data as any,
    create: { id, ...data } as any,
  });

const upsertNotification = async (id: string, data: AnyRecord) =>
  prisma.notification.upsert({
    where: { id },
    update: data as any,
    create: { id, ...data } as any,
  });

const upsertComment = async (id: string, data: AnyRecord) =>
  prisma.comment.upsert({
    where: { id },
    update: data as any,
    create: { id, ...data } as any,
  });

const upsertAnnouncement = async (id: string, data: AnyRecord) =>
  prisma.announcement.upsert({
    where: { id },
    update: data as any,
    create: { id, ...data } as any,
  });

const upsertAnnouncementRead = async (
  announcementId: string,
  userId: string,
  readAt: Date
) =>
  prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId, userId } },
    update: { readAt },
    create: { announcementId, userId, readAt },
  });

const upsertSetting = async (
  key: string,
  value: string,
  data: AnyRecord
) =>
  prisma.setting.upsert({
    where: { key },
    update: { value, ...data },
    create: { key, value, ...data },
  });

const upsertAuditLog = async (id: string, data: AnyRecord) =>
  prisma.auditLog.upsert({
    where: { id },
    update: data as any,
    create: { id, ...data } as any,
  });

const upsertQuizAttempt = async (
  quiz: AnyRecord,
  userId: string,
  attemptNumber: number,
  correctCount: number,
  startedAt: Date,
  status = "completed"
) => {
  const existing = await prisma.quizAttempt.findFirst({
    where: { quizId: quiz.id, userId, attemptNumber },
  });

  const maxScore = quiz.questions.reduce(
    (sum: number, question: AnyRecord) => sum + question.points,
    0
  );

  let score = 0;
  const answers = quiz.questions.map(
    (question: AnyRecord, index: number) => {
      const isCorrect = index < correctCount;
      const options = Array.isArray(question.options)
        ? (question.options as string[])
        : [];
      const fallbackAnswer = question.correctAnswer || "Sample response";
      const wrongAnswer =
        options.find((option) => option !== question.correctAnswer) ||
        "Incomplete answer";
      const earned = isCorrect ? question.points : 0;
      score += earned;
      return {
        questionId: question.id,
        answer: isCorrect ? fallbackAnswer : wrongAnswer,
        isCorrect,
        pointsEarned: earned,
      };
    }
  );

  const percentage =
    maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;

  const attemptData = {
    quizId: quiz.id,
    userId,
    startedAt,
    submittedAt: status === "completed" ? new Date(startedAt.getTime() + 18 * 60 * 1000) : null,
    score,
    maxScore,
    percentage,
    status,
    attemptNumber,
    timeLimit: quiz.timeLimit,
  };

  const attempt = existing
    ? await prisma.quizAttempt.update({
        where: { id: existing.id },
        data: attemptData,
      })
    : await prisma.quizAttempt.create({ data: attemptData });

  for (const answer of answers) {
    await prisma.quizAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: attempt.id,
          questionId: answer.questionId,
        },
      },
      update: {
        answer: answer.answer,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
      },
      create: { attemptId: attempt.id, ...answer },
    });
  }

  return attempt;
};

async function seed() {
  console.log("Seeding comprehensive ELMS demo data...");

  const admin = await upsertUser("admin@elms.edu", "Admin123!", {
    firstName: "Sokha",
    lastName: "Chea",
    role: "ADMIN",
  });
  const instructor = await upsertUser("instructor@elms.edu", "Instructor123!", {
    firstName: "Dara",
    lastName: "Kim",
    role: "INSTRUCTOR",
  });
  const instructorTwo = await upsertUser(
    "instructor.lead@elms.edu",
    "Instructor123!",
    {
      firstName: "Vibol",
      lastName: "Chan",
      role: "INSTRUCTOR",
    }
  );
  const student = await upsertUser("student@elms.edu", "Student123!", {
    firstName: "Sreyneang",
    lastName: "Lim",
    role: "STUDENT",
  });
  const studentTwo = await upsertUser("student.anna@elms.edu", "Student123!", {
    firstName: "Anna",
    lastName: "Sok",
    role: "STUDENT",
  });
  const studentThree = await upsertUser("student.dara@elms.edu", "Student123!", {
    firstName: "Dara",
    lastName: "Prak",
    role: "STUDENT",
  });

  await upsertProfile(admin.id, {
    bio: "Platform administrator responsible for academic operations, reporting, and system settings.",
    phone: "+855 12 555 010",
    address: "Phnom Penh, Cambodia",
    dateOfBirth: new Date("1988-04-18"),
    education: "MBA, Royal University of Phnom Penh",
    occupation: "Platform Administrator",
    preferences: { language: "en", emailNotifications: true, timezone: "Asia/Phnom_Penh" },
  });
  await upsertProfile(instructor.id, {
    bio: "Finance educator focused on Cambodia's digital payment rails, capital markets, and investor education.",
    phone: "+855 17 555 220",
    address: "Toul Kork, Phnom Penh",
    dateOfBirth: new Date("1986-09-02"),
    education: "MSc Finance, National University of Management",
    occupation: "Senior Finance Instructor",
    preferences: { language: "en", emailNotifications: true, timezone: "Asia/Phnom_Penh" },
  });
  await upsertProfile(instructorTwo.id, {
    bio: "Fintech practitioner and instructor covering blockchain, crypto assets, and portfolio risk.",
    phone: "+855 92 555 331",
    address: "BKK1, Phnom Penh",
    dateOfBirth: new Date("1990-01-25"),
    education: "BSc Computer Science, Institute of Technology of Cambodia",
    occupation: "Fintech Instructor",
    preferences: { language: "en", emailNotifications: true, timezone: "Asia/Phnom_Penh" },
  });
  await upsertProfile(student.id, {
    bio: "Finance student exploring digital banking, stock trading, and personal wealth management.",
    phone: "+855 10 555 442",
    address: "Sen Sok, Phnom Penh",
    dateOfBirth: new Date("2002-06-12"),
    education: "BBA Finance, Western University",
    occupation: "Student",
    preferences: { language: "en", emailNotifications: true, theme: "light" },
  });
  await upsertProfile(studentTwo.id, {
    bio: "Accounting student interested in investment analysis and financial planning.",
    phone: "+855 11 555 553",
    address: "Chamkarmon, Phnom Penh",
    dateOfBirth: new Date("2001-11-03"),
    education: "BBA Accounting, NUM",
    occupation: "Student",
    preferences: { language: "en", emailNotifications: false, theme: "light" },
  });
  await upsertProfile(studentThree.id, {
    bio: "Economics student learning how digital payments and capital markets work in Cambodia.",
    phone: "+855 96 555 664",
    address: "Daun Penh, Phnom Penh",
    dateOfBirth: new Date("2003-02-20"),
    education: "BA Economics, RUPP",
    occupation: "Student",
    preferences: { language: "en", emailNotifications: true, theme: "dark" },
  });

  console.log("Users and profiles ready");

  const catStock = await upsertCategory({
    name: "Stock Trading",
    slug: "stock-trading",
    description: "Equity markets, technical analysis, and trading strategies",
    icon: "trending-up",
    parentId: null,
    sortOrder: 1,
    isActive: true,
  });
  const catTechnical = await upsertCategory({
    name: "Technical Analysis",
    slug: "technical-analysis",
    description: "Chart patterns, indicators, and market structure",
    icon: "bar-chart",
    parentId: catStock.id,
    sortOrder: 1,
    isActive: true,
  });
  const catCrypto = await upsertCategory({
    name: "Cryptocurrency",
    slug: "cryptocurrency",
    description: "Blockchain, digital assets, and crypto investing",
    icon: "coins",
    parentId: null,
    sortOrder: 2,
    isActive: true,
  });
  const catPersonal = await upsertCategory({
    name: "Personal Finance",
    slug: "personal-finance",
    description: "Budgeting, saving, and wealth management",
    icon: "wallet",
    parentId: null,
    sortOrder: 3,
    isActive: true,
  });
  const catInvesting = await upsertCategory({
    name: "Investment Strategies",
    slug: "investment-strategies",
    description: "Portfolio management and long-term investing",
    icon: "pie-chart",
    parentId: null,
    sortOrder: 4,
    isActive: true,
  });
  const catDigital = await upsertCategory({
    name: "Digital Finance & Banking",
    slug: "digital-finance",
    description: "Cambodian fintech, Bakong, KHQR, and digital payment systems",
    icon: "smartphone",
    parentId: null,
    sortOrder: 5,
    isActive: true,
  });

  console.log("Categories ready");

  const courseFree = await upsertCourse({
    title: "Introduction to Digital Finance in Cambodia (Free)",
    slug: "intro-to-digital-finance-cambodia-free",
    description:
      "Explore Cambodia's modern digital banking transformation, the National Bank of Cambodia Bakong rails, and how KHQR is reshaping the Kingdom's cashless economy.",
    shortDesc:
      "Free foundational guide to Cambodian digital banking, Bakong rails, and cashless financial technology.",
    thumbnailUrl: "/uploads/thumbnails/finance-program.svg",
    status: "PUBLISHED",
    price: 0,
    currency: "USD",
    isFree: true,
    instructorId: instructor.id,
    categoryId: catDigital.id,
    level: "BEGINNER",
    duration: 90,
    language: "en",
    prerequisites: [],
    learningOutcomes: [
      "Understand Bakong and KHQR architectural specifications",
      "Evaluate digital banking security and consumer rights in Cambodia",
      "Navigate cashless merchant workflows and wallet integrations",
    ],
    tags: ["fintech", "cambodia", "khqr", "bakong", "digital-finance", "free"],
    publishedAt: daysAgo(75),
    scheduledAt: null,
  });

  const courseKhqr = await upsertCourse({
    title: "KHQR Payment Test Course",
    slug: "khqr-payment-test-course",
    description:
      "Sandbox testing course for verifying end-to-end KHQR dynamic payments, Bakong mobile app deeplinks, and webhook confirmation polling.",
    shortDesc:
      "Sandbox test course priced at 0.10 USD for KHQR payment flow verification.",
    thumbnailUrl: "/uploads/thumbnails/intro-to-web-development.svg",
    status: "PUBLISHED",
    price: 0.1,
    currency: "USD",
    isFree: false,
    instructorId: instructor.id,
    categoryId: catDigital.id,
    level: "BEGINNER",
    duration: 45,
    language: "en",
    prerequisites: [],
    learningOutcomes: [
      "Test Bakong KHQR dynamic QR generation",
      "Verify checkout countdown and status polling",
      "Simulate sandbox webhook transaction confirmations",
    ],
    tags: ["khqr", "payment-test", "bakong", "sandbox", "fintech"],
    publishedAt: daysAgo(45),
    scheduledAt: null,
  });

  const courseStock = await upsertCourse({
    title: "Introduction to Stock Trading",
    slug: "intro-to-stock-trading",
    description:
      "Learn the fundamentals of stock markets, chart reading, order types, and risk management with practical examples.",
    shortDesc: "Beginner-friendly stock trading course",
    thumbnailUrl: "/uploads/thumbnails/intro-to-stock-trading.svg",
    status: "PUBLISHED",
    price: 29.99,
    currency: "USD",
    isFree: false,
    instructorId: instructor.id,
    categoryId: catTechnical.id,
    level: "BEGINNER",
    duration: 1200,
    language: "en",
    prerequisites: ["No prior trading experience required"],
    learningOutcomes: [
      "Read price charts and candlestick patterns",
      "Manage trading risk with position sizing",
      "Place your first simulated trade",
    ],
    tags: ["stocks", "trading", "finance", "investing"],
    publishedAt: daysAgo(120),
    scheduledAt: null,
  });

  const coursePersonal = await upsertCourse({
    title: "Personal Finance Mastery",
    slug: "personal-finance-mastery",
    description:
      "Build a practical budgeting system, create an emergency fund, reduce debt, and start investing for long-term goals.",
    shortDesc: "Take control of your money with a practical financial plan.",
    thumbnailUrl: "/uploads/thumbnails/personal-finance-mastery.svg",
    status: "PUBLISHED",
    price: 19.99,
    currency: "USD",
    isFree: false,
    instructorId: instructor.id,
    categoryId: catPersonal.id,
    level: "BEGINNER",
    duration: 480,
    language: "en",
    prerequisites: [],
    learningOutcomes: [
      "Build a monthly budget that works",
      "Plan a fully funded emergency fund",
      "Choose a debt payoff strategy",
      "Start a simple long-term investment plan",
    ],
    tags: ["budgeting", "saving", "debt", "personal-finance"],
    publishedAt: daysAgo(90),
    scheduledAt: null,
  });

  const courseCrypto = await upsertCourse({
    title: "Crypto Investing 101",
    slug: "crypto-investing-101",
    description:
      "Understand blockchain fundamentals, crypto wallets, custody, market risks, and responsible portfolio allocation.",
    shortDesc: "A risk-first introduction to crypto assets and blockchain.",
    thumbnailUrl: "/uploads/thumbnails/data-science-for-beginners.svg",
    status: "PUBLISHED",
    price: 39.99,
    currency: "USD",
    isFree: false,
    instructorId: instructorTwo.id,
    categoryId: catCrypto.id,
    level: "INTERMEDIATE",
    duration: 600,
    language: "en",
    prerequisites: ["Basic understanding of investing"],
    learningOutcomes: [
      "Explain how blockchain networks reach consensus",
      "Compare custodial and self-custody wallets",
      "Assess crypto volatility and allocation risk",
    ],
    tags: ["crypto", "blockchain", "investing", "risk"],
    publishedAt: daysAgo(30),
    scheduledAt: null,
  });

  const courseAdvanced = await upsertCourse({
    title: "Advanced Portfolio Management",
    slug: "advanced-portfolio-management",
    description:
      "Draft course covering asset allocation, rebalancing, factor investing, and portfolio risk attribution.",
    shortDesc: "Scheduled advanced course for experienced investors.",
    thumbnailUrl: "/uploads/thumbnails/finance-program.svg",
    status: "DRAFT",
    price: 49.99,
    currency: "USD",
    isFree: false,
    instructorId: instructor.id,
    categoryId: catInvesting.id,
    level: "ADVANCED",
    duration: 900,
    language: "en",
    prerequisites: ["Introduction to Stock Trading", "Personal Finance Mastery"],
    learningOutcomes: [
      "Design a multi-asset portfolio",
      "Rebalance with tax and cost awareness",
      "Measure factor exposures and tracking error",
    ],
    tags: ["portfolio", "asset-allocation", "risk", "advanced"],
    publishedAt: null,
    scheduledAt: daysFromNow(14),
  });

  const courseArchived = await upsertCourse({
    title: "Legacy Banking Operations",
    slug: "legacy-banking-operations",
    description:
      "Archived course covering traditional branch banking processes, reconciliation, and manual payment operations.",
    shortDesc: "Archived reference course.",
    thumbnailUrl: "/uploads/thumbnails/finance-program.svg",
    status: "ARCHIVED",
    price: 0,
    currency: "USD",
    isFree: true,
    instructorId: instructorTwo.id,
    categoryId: catDigital.id,
    level: "BEGINNER",
    duration: 240,
    language: "en",
    prerequisites: [],
    learningOutcomes: ["Review legacy reconciliation workflows"],
    tags: ["banking", "operations", "archive"],
    publishedAt: daysAgo(400),
    scheduledAt: null,
  });

  console.log("Courses ready");

  const freeModuleOne = await upsertModule(courseFree.id, {
    title: "Module 1: Foundations of Cambodian Digital Finance",
    description:
      "Core concepts of cashless banking and fintech infrastructure in Cambodia.",
    sortOrder: 0,
    isPublished: true,
  });
  const freeModuleTwo = await upsertModule(courseFree.id, {
    title: "Module 2: Consumer Protection & Security",
    description:
      "Practical guidance for safe digital banking and consumer rights.",
    sortOrder: 1,
    isPublished: true,
  });

  const freeLessonOne = await upsertLesson(freeModuleOne.id, {
    title: "The Cashless Transition & NBC Bakong Rails",
    description:
      "A deep dive into how Cambodia transitioned from cash to Bakong interoperability.",
    contentType: "video",
    contentUrl: "/uploads/videos/video-chapter01.mp4",
    duration: 15,
    isPublished: true,
    isPreview: true,
    sortOrder: 0,
    attachments: [
      { name: "Bakong overview", url: "/uploads/documents/FIN_202_merged.pdf" },
    ],
    dripDays: null,
    version: 2,
  });
  const freeLessonTwo = await upsertLesson(freeModuleOne.id, {
    title: "Mobile Banking Apps & KHQR Adoption",
    description:
      "Practical analysis of consumer banking apps such as ABA, ACLEDA, and Wing, plus unified KHQR codes.",
    contentType: "text",
    contentUrl: null,
    duration: 20,
    isPublished: true,
    isPreview: false,
    sortOrder: 1,
    attachments: [
      { name: "Digital payments report", url: "/uploads/documents/FIN_207_merged.pdf" },
    ],
    dripDays: null,
    version: 1,
  });
  const freeQuizLesson = await upsertLesson(freeModuleOne.id, {
    title: "Digital Finance Knowledge Check",
    description: "Test your understanding of Cambodian digital finance.",
    contentType: "quiz",
    contentUrl: null,
    duration: 10,
    isPublished: true,
    isPreview: false,
    sortOrder: 2,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const freeSecurityLesson = await upsertLesson(freeModuleTwo.id, {
    title: "Fraud Prevention & Consumer Rights",
    description:
      "Recognize common scams and understand how to escalate disputes with financial institutions.",
    contentType: "pdf",
    contentUrl: "/uploads/documents/FIN_311_merged.pdf",
    duration: 25,
    isPublished: true,
    isPreview: false,
    sortOrder: 0,
    attachments: [],
    dripDays: null,
    version: 1,
  });

  const khqrModule = await upsertModule(courseKhqr.id, {
    title: "Module 1: KHQR Payment Rails & Verification",
    description: "Payment integration architecture and testing procedures.",
    sortOrder: 0,
    isPublished: true,
  });
  const khqrLessonOne = await upsertLesson(khqrModule.id, {
    title: "End-to-End KHQR Transaction Flow & Webhooks",
    description:
      "Understand transaction states from pending to completed via Bakong sandbox simulation.",
    contentType: "video",
    contentUrl: "/uploads/videos/video-chapter01.mp4",
    duration: 15,
    isPublished: true,
    isPreview: true,
    sortOrder: 0,
    attachments: [],
    dripDays: null,
    version: 2,
  });
  const khqrLessonTwo = await upsertLesson(khqrModule.id, {
    title: "KHQR Merchant Integration Checklist",
    description:
      "Review the checklist for merchant onboarding, QR generation, and confirmation handling.",
    contentType: "pdf",
    contentUrl: "/uploads/documents/FIN_310_merged.pdf",
    duration: 20,
    isPublished: true,
    isPreview: false,
    sortOrder: 1,
    attachments: [],
    dripDays: 1,
    version: 1,
  });
  const khqrQuizLesson = await upsertLesson(khqrModule.id, {
    title: "KHQR Payment Verification Quiz",
    description: "Confirm your knowledge of KHQR payment states and webhooks.",
    contentType: "quiz",
    contentUrl: null,
    duration: 10,
    isPublished: true,
    isPreview: false,
    sortOrder: 2,
    attachments: [],
    dripDays: null,
    version: 1,
  });

  const stockModuleOne = await upsertModule(courseStock.id, {
    title: "Module 1: Stock Market Fundamentals",
    description: "Understanding how stock markets work.",
    sortOrder: 0,
    isPublished: true,
  });
  const stockModuleTwo = await upsertModule(courseStock.id, {
    title: "Module 2: Technical Analysis",
    description: "Reading charts and identifying patterns.",
    sortOrder: 1,
    isPublished: true,
  });
  const stockLessonOne = await upsertLesson(stockModuleOne.id, {
    title: "What is a Stock?",
    description:
      "Learn what stocks represent and how companies issue them.",
    contentType: "text",
    contentUrl: null,
    duration: 15,
    isPublished: true,
    isPreview: true,
    sortOrder: 0,
    attachments: [],
    dripDays: null,
    version: 2,
  });
  const stockLessonTwo = await upsertLesson(stockModuleOne.id, {
    title: "How Stock Markets Work",
    description: "Exchanges, brokers, and order types explained.",
    contentType: "text",
    contentUrl: null,
    duration: 20,
    isPublished: true,
    isPreview: false,
    sortOrder: 1,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const stockLessonThree = await upsertLesson(stockModuleOne.id, {
    title: "Reading Stock Quotes",
    description:
      "Understanding ticker symbols, bid/ask spreads, volume, and market cap.",
    contentType: "text",
    contentUrl: null,
    duration: 15,
    isPublished: true,
    isPreview: false,
    sortOrder: 2,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const stockQuizLesson = await upsertLesson(stockModuleOne.id, {
    title: "Stock Market Quiz",
    description: "Test your knowledge of stock market basics.",
    contentType: "quiz",
    contentUrl: null,
    duration: 10,
    isPublished: true,
    isPreview: false,
    sortOrder: 3,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const stockLessonFour = await upsertLesson(stockModuleTwo.id, {
    title: "Candlestick Patterns",
    description:
      "Learn to read candlestick charts and common reversal patterns.",
    contentType: "text",
    contentUrl: null,
    duration: 25,
    isPublished: true,
    isPreview: false,
    sortOrder: 0,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const stockLessonFive = await upsertLesson(stockModuleTwo.id, {
    title: "Support and Resistance",
    description:
      "Identifying key price levels that act as barriers for buyers and sellers.",
    contentType: "text",
    contentUrl: null,
    duration: 20,
    isPublished: true,
    isPreview: false,
    sortOrder: 1,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const stockLessonSix = await upsertLesson(stockModuleTwo.id, {
    title: "Moving Averages",
    description: "Understanding SMA, EMA, and how traders use them.",
    contentType: "video",
    contentUrl: "/uploads/videos/video-chapter01-1788262335.mp4",
    duration: 30,
    isPublished: true,
    isPreview: false,
    sortOrder: 2,
    attachments: [],
    dripDays: 3,
    version: 1,
  });

  const personalModuleOne = await upsertModule(coursePersonal.id, {
    title: "Module 1: Budgeting & Cash Flow",
    description: "Build a reliable monthly spending plan.",
    sortOrder: 0,
    isPublished: true,
  });
  const personalModuleTwo = await upsertModule(coursePersonal.id, {
    title: "Module 2: Saving, Debt & Investing",
    description: "Turn cash flow into long-term financial security.",
    sortOrder: 1,
    isPublished: true,
  });
  const personalLessonOne = await upsertLesson(personalModuleOne.id, {
    title: "Building a Zero-Based Budget",
    description:
      "Assign every dollar a job and track spending without spreadsheets.",
    contentType: "text",
    contentUrl: null,
    duration: 20,
    isPublished: true,
    isPreview: true,
    sortOrder: 0,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const personalLessonTwo = await upsertLesson(personalModuleOne.id, {
    title: "Emergency Fund Planning",
    description:
      "Determine your target emergency fund and where to keep it.",
    contentType: "text",
    contentUrl: null,
    duration: 15,
    isPublished: true,
    isPreview: false,
    sortOrder: 1,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const personalQuizLesson = await upsertLesson(personalModuleOne.id, {
    title: "Budgeting Quiz",
    description: "Check your understanding of budgeting basics.",
    contentType: "quiz",
    contentUrl: null,
    duration: 10,
    isPublished: true,
    isPreview: false,
    sortOrder: 2,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const personalLessonThree = await upsertLesson(personalModuleTwo.id, {
    title: "Understanding Compound Interest",
    description:
      "See how small, consistent contributions grow over time.",
    contentType: "video",
    contentUrl: "/uploads/videos/video-chapter01.mp4",
    duration: 18,
    isPublished: true,
    isPreview: false,
    sortOrder: 0,
    attachments: [],
    dripDays: 2,
    version: 1,
  });
  const personalLessonFour = await upsertLesson(personalModuleTwo.id, {
    title: "Debt Payoff Strategies",
    description:
      "Compare snowball and avalanche methods and choose a plan.",
    contentType: "pdf",
    contentUrl: "/uploads/documents/FIN_312_merged.pdf",
    duration: 22,
    isPublished: true,
    isPreview: false,
    sortOrder: 1,
    attachments: [],
    dripDays: null,
    version: 1,
  });

  const cryptoModule = await upsertModule(courseCrypto.id, {
    title: "Module 1: Blockchain & Digital Assets",
    description: "How crypto networks work and where risk enters.",
    sortOrder: 0,
    isPublished: true,
  });
  const cryptoLessonOne = await upsertLesson(cryptoModule.id, {
    title: "Blockchain Fundamentals",
    description:
      "Blocks, consensus, and why decentralization matters.",
    contentType: "video",
    contentUrl: "/uploads/videos/video-chapter01.mp4",
    duration: 25,
    isPublished: true,
    isPreview: true,
    sortOrder: 0,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const cryptoLessonTwo = await upsertLesson(cryptoModule.id, {
    title: "Crypto Wallets & Custody",
    description:
      "Compare exchange custody, hardware wallets, and seed phrase safety.",
    contentType: "text",
    contentUrl: null,
    duration: 20,
    isPublished: true,
    isPreview: false,
    sortOrder: 1,
    attachments: [],
    dripDays: null,
    version: 1,
  });
  const cryptoQuizLesson = await upsertLesson(cryptoModule.id, {
    title: "Crypto Risk Quiz",
    description: "Test your understanding of crypto risks and custody.",
    contentType: "quiz",
    contentUrl: null,
    duration: 10,
    isPublished: true,
    isPreview: false,
    sortOrder: 2,
    attachments: [],
    dripDays: null,
    version: 1,
  });

  await upsertModule(courseAdvanced.id, {
    title: "Module 1: Multi-Asset Allocation",
    description: "Draft module for scheduled advanced course.",
    sortOrder: 0,
    isPublished: false,
  });
  await upsertModule(courseArchived.id, {
    title: "Module 1: Legacy Reconciliation",
    description: "Archived reference material.",
    sortOrder: 0,
    isPublished: false,
  });

  console.log("Modules and lessons ready");

  const freeQuiz = await seedQuiz(
    freeQuizLesson.id,
    {
      title: "Cambodian Digital Finance Quiz",
      description: "Five questions on Bakong, KHQR, and digital banking.",
      timeLimit: 10,
      maxAttempts: 3,
      passingScore: 60,
      isPublished: true,
    },
    [
      {
        type: "MCQ",
        question: "What is Bakong?",
        options: [
          "A national payment interoperability system",
          "A commercial bank in Cambodia",
          "A mobile phone brand",
          "A credit scoring agency",
        ],
        correctAnswer: "A national payment interoperability system",
        points: 2,
        sortOrder: 0,
      },
      {
        type: "MCQ",
        question: "KHQR is best described as what?",
        options: [
          "A unified QR payment standard",
          "A stock exchange index",
          "A type of savings account",
          "A cryptocurrency wallet",
        ],
        correctAnswer: "A unified QR payment standard",
        points: 2,
        sortOrder: 1,
      },
      {
        type: "TRUE_FALSE",
        question: "Bakong allows transfers between participating banks and wallets.",
        options: ["True", "False"],
        correctAnswer: "True",
        points: 2,
        sortOrder: 2,
      },
      {
        type: "MCQ",
        question: "Which regulator oversees Cambodia's payment systems?",
        options: [
          "National Bank of Cambodia",
          "Securities and Exchange Regulator of Cambodia",
          "Ministry of Education",
          "Cambodia Chamber of Commerce",
        ],
        correctAnswer: "National Bank of Cambodia",
        points: 2,
        sortOrder: 3,
      },
      {
        type: "SHORT_ANSWER",
        question: "Name one benefit of using a unified QR payment standard.",
        options: null,
        correctAnswer: "Interoperability",
        points: 2,
        sortOrder: 4,
      },
    ]
  );

  const khqrQuiz = await seedQuiz(
    khqrQuizLesson.id,
    {
      title: "KHQR Payment Verification Quiz",
      description: "Confirm your knowledge of KHQR payment states and webhooks.",
      timeLimit: 10,
      maxAttempts: 2,
      passingScore: 70,
      isPublished: true,
    },
    [
      {
        type: "MCQ",
        question: "Which payment status should trigger course enrollment?",
        options: ["pending", "completed", "failed", "refunded"],
        correctAnswer: "completed",
        points: 2,
        sortOrder: 0,
      },
      {
        type: "TRUE_FALSE",
        question: "A webhook can confirm a payment without the student staying on the checkout page.",
        options: ["True", "False"],
        correctAnswer: "True",
        points: 2,
        sortOrder: 1,
      },
      {
        type: "SHORT_ANSWER",
        question: "What should always be verified before accepting a webhook payment?",
        options: null,
        correctAnswer: "Signature",
        points: 2,
        sortOrder: 2,
      },
      {
        type: "MCQ",
        question: "What does a dynamic KHQR contain?",
        options: [
          "A unique payment amount and reference",
          "Only a merchant logo",
          "A stock ticker",
          "A student ID only",
        ],
        correctAnswer: "A unique payment amount and reference",
        points: 2,
        sortOrder: 3,
      },
    ]
  );

  const stockQuiz = await seedQuiz(
    stockQuizLesson.id,
    {
      title: "Stock Market Basics Quiz",
      description: "Five questions on stock market fundamentals.",
      timeLimit: 10,
      maxAttempts: 3,
      passingScore: 60,
      isPublished: true,
    },
    [
      {
        type: "MCQ",
        question: "What does owning a share of stock represent?",
        options: [
          "A loan to the company",
          "Partial ownership of the company",
          "A guaranteed return",
          "A debt obligation",
        ],
        correctAnswer: "Partial ownership of the company",
        points: 2,
        sortOrder: 0,
      },
      {
        type: "MCQ",
        question: "Which is the largest stock exchange in the world by market cap?",
        options: [
          "London Stock Exchange",
          "Tokyo Stock Exchange",
          "NYSE",
          "NASDAQ",
        ],
        correctAnswer: "NYSE",
        points: 2,
        sortOrder: 1,
      },
      {
        type: "TRUE_FALSE",
        question: "A bull market means stock prices are generally falling.",
        options: ["True", "False"],
        correctAnswer: "False",
        points: 2,
        sortOrder: 2,
      },
      {
        type: "MCQ",
        question: "What is the S&P 500?",
        options: [
          "A single stock",
          "An index of 500 large US companies",
          "A government bond",
          "A cryptocurrency",
        ],
        correctAnswer: "An index of 500 large US companies",
        points: 2,
        sortOrder: 3,
      },
      {
        type: "SHORT_ANSWER",
        question: "What does IPO stand for?",
        options: null,
        correctAnswer: "Initial Public Offering",
        points: 2,
        sortOrder: 4,
      },
    ]
  );

  const personalQuiz = await seedQuiz(
    personalQuizLesson.id,
    {
      title: "Budgeting Fundamentals Quiz",
      description: "Five questions on budgeting and cash flow.",
      timeLimit: 10,
      maxAttempts: 3,
      passingScore: 60,
      isPublished: true,
    },
    [
      {
        type: "MCQ",
        question: "What is the first step in a zero-based budget?",
        options: [
          "List expected income",
          "Open a credit card",
          "Buy stocks",
          "Ignore small expenses",
        ],
        correctAnswer: "List expected income",
        points: 2,
        sortOrder: 0,
      },
      {
        type: "TRUE_FALSE",
        question: "An emergency fund should generally cover three to six months of essential expenses.",
        options: ["True", "False"],
        correctAnswer: "True",
        points: 2,
        sortOrder: 1,
      },
      {
        type: "MCQ",
        question: "Which expense is usually considered essential?",
        options: ["Rent", "Streaming subscription", "Luxury watch", "Concert tickets"],
        correctAnswer: "Rent",
        points: 2,
        sortOrder: 2,
      },
      {
        type: "MCQ",
        question: "What does compound interest do over time?",
        options: [
          "Grows earnings on previous earnings",
          "Reduces your principal",
          "Only applies to debt",
          "Stops after one year",
        ],
        correctAnswer: "Grows earnings on previous earnings",
        points: 2,
        sortOrder: 3,
      },
      {
        type: "SHORT_ANSWER",
        question: "Name one way to reduce monthly spending.",
        options: null,
        correctAnswer: "Cancel unused subscriptions",
        points: 2,
        sortOrder: 4,
      },
    ]
  );

  const cryptoQuiz = await seedQuiz(
    cryptoQuizLesson.id,
    {
      title: "Crypto Risk & Custody Quiz",
      description: "Check your understanding of crypto risks and custody.",
      timeLimit: 10,
      maxAttempts: 2,
      passingScore: 70,
      isPublished: true,
    },
    [
      {
        type: "MCQ",
        question: "What is a seed phrase used for?",
        options: [
          "Recovering access to a crypto wallet",
          "Paying taxes",
          "Setting a stock limit order",
          "Opening a bank account",
        ],
        correctAnswer: "Recovering access to a crypto wallet",
        points: 2,
        sortOrder: 0,
      },
      {
        type: "TRUE_FALSE",
        question: "Keeping a seed phrase in a screenshot is a safe backup method.",
        options: ["True", "False"],
        correctAnswer: "False",
        points: 2,
        sortOrder: 1,
      },
      {
        type: "MCQ",
        question: "Which risk is especially high for crypto assets?",
        options: ["Price volatility", "Zero inflation risk", "Guaranteed liquidity", "Fixed returns"],
        correctAnswer: "Price volatility",
        points: 2,
        sortOrder: 2,
      },
      {
        type: "SHORT_ANSWER",
        question: "What is one way to reduce crypto custody risk?",
        options: null,
        correctAnswer: "Use a hardware wallet",
        points: 2,
        sortOrder: 3,
      },
    ]
  );

  for (const lesson of [
    freeLessonOne,
    freeLessonTwo,
    freeSecurityLesson,
    khqrLessonOne,
    khqrLessonTwo,
    stockLessonOne,
    stockLessonTwo,
    stockLessonThree,
    stockLessonFour,
    stockLessonFive,
    stockLessonSix,
    personalLessonOne,
    personalLessonTwo,
    personalLessonThree,
    personalLessonFour,
    cryptoLessonOne,
    cryptoLessonTwo,
  ]) {
    await upsertLessonVersion(
      lesson.id,
      1,
      `Initial draft for ${lesson.title}.`,
      instructor.id
    );
    await upsertLessonVersion(
      lesson.id,
      2,
      `Reviewed content for ${lesson.title} with updated Cambodian market examples.`,
      instructor.id
    );
  }

  console.log("Quizzes and lesson versions ready");

  const stockQuizzesCategory = await upsertGradeCategory(
    courseStock.id,
    "Quizzes",
    30,
    0
  );
  const stockAssignmentsCategory = await upsertGradeCategory(
    courseStock.id,
    "Assignments",
    50,
    1
  );
  await upsertGradeCategory(courseStock.id, "Participation", 20, 2);
  const personalQuizzesCategory = await upsertGradeCategory(
    coursePersonal.id,
    "Quizzes",
    40,
    0
  );
  const personalAssignmentsCategory = await upsertGradeCategory(
    coursePersonal.id,
    "Assignments",
    60,
    1
  );
  const digitalQuizzesCategory = await upsertGradeCategory(
    courseFree.id,
    "Quizzes",
    40,
    0
  );
  const digitalAssignmentsCategory = await upsertGradeCategory(
    courseFree.id,
    "Assignments",
    60,
    1
  );
  await upsertGradeCategory(courseKhqr.id, "Quizzes", 100, 0);
  const cryptoAssignmentsCategory = await upsertGradeCategory(
    courseCrypto.id,
    "Assignments",
    50,
    0
  );
  await upsertGradeCategory(courseCrypto.id, "Quizzes", 50, 1);

  await prisma.quiz.update({
    where: { id: stockQuiz.id },
    data: { categoryId: stockQuizzesCategory.id },
  });
  await prisma.quiz.update({
    where: { id: personalQuiz.id },
    data: { categoryId: personalQuizzesCategory.id },
  });
  await prisma.quiz.update({
    where: { id: freeQuiz.id },
    data: { categoryId: digitalQuizzesCategory.id },
  });
  await prisma.quiz.update({
    where: { id: khqrQuiz.id },
    data: { categoryId: digitalQuizzesCategory.id },
  });
  await prisma.quiz.update({
    where: { id: cryptoQuiz.id },
    data: { categoryId: cryptoAssignmentsCategory.id },
  });

  const stockAssignmentOne = await upsertAssignment(courseStock.id, {
    createdBy: instructor.id,
    title: "Portfolio Construction Project",
    description:
      "Build a diversified portfolio for a hypothetical investor and justify each allocation.",
    instructions:
      "Select at least five assets across three asset classes. Explain expected return, risk, and rebalancing rules in 600 to 900 words.",
    maxPoints: 100,
    dueDate: daysAgo(12),
    allowLate: true,
    attachments: [
      { name: "Portfolio template", url: "/uploads/documents/FIN_406_merged.pdf" },
    ],
    isPublished: true,
    categoryId: stockAssignmentsCategory.id,
  });
  const stockAssignmentTwo = await upsertAssignment(courseStock.id, {
    createdBy: instructor.id,
    title: "Technical Analysis Report",
    description:
      "Analyze a publicly traded company using support, resistance, and moving averages.",
    instructions:
      "Include one daily chart and one weekly chart. Identify entry, stop-loss, and target levels.",
    maxPoints: 50,
    dueDate: daysFromNow(7),
    allowLate: false,
    attachments: [],
    isPublished: true,
    categoryId: stockAssignmentsCategory.id,
  });
  const personalAssignment = await upsertAssignment(coursePersonal.id, {
    createdBy: instructor.id,
    title: "Monthly Budget Plan",
    description:
      "Create a realistic monthly budget for a first-year university student in Phnom Penh.",
    instructions:
      "Include income, fixed expenses, variable expenses, savings, and a short reflection.",
    maxPoints: 100,
    dueDate: daysAgo(5),
    allowLate: true,
    attachments: [
      { name: "Budget worksheet", url: "/uploads/documents/FIN_414_merged.pdf" },
    ],
    isPublished: true,
    categoryId: personalAssignmentsCategory.id,
  });
  const digitalAssignment = await upsertAssignment(courseFree.id, {
    createdBy: instructor.id,
    title: "KHQR Merchant Onboarding Plan",
    description:
      "Outline the steps a small coffee shop should follow to accept KHQR payments.",
    instructions:
      "Cover merchant registration, bank selection, staff training, reconciliation, and customer support.",
    maxPoints: 100,
    dueDate: daysFromNow(10),
    allowLate: true,
    attachments: [],
    isPublished: true,
    categoryId: digitalAssignmentsCategory.id,
  });
  const cryptoAssignment = await upsertAssignment(courseCrypto.id, {
    createdBy: instructorTwo.id,
    title: "Crypto Risk Assessment",
    description:
      "Assess the risks of adding a small crypto allocation to a balanced portfolio.",
    instructions:
      "Discuss volatility, custody, regulation, liquidity, and a suitable allocation range.",
    maxPoints: 100,
    dueDate: daysFromNow(5),
    allowLate: false,
    attachments: [],
    isPublished: true,
    categoryId: cryptoAssignmentsCategory.id,
  });
  await upsertAssignment(courseStock.id, {
    createdBy: instructor.id,
    title: "Draft: Options Trading Case Study",
    description: "Unpublished draft assignment for a future module.",
    instructions: "Draft instructions only.",
    maxPoints: 100,
    dueDate: daysFromNow(30),
    allowLate: false,
    attachments: [],
    isPublished: false,
    categoryId: stockAssignmentsCategory.id,
  });

  const rubric = await upsertRubric(stockAssignmentOne.id, {
    title: "Portfolio Construction Rubric",
    description: "Assessment rubric for portfolio design and justification.",
    totalMaxPoints: 100,
  });
  const criterionDiversification = await upsertCriterion(rubric.id, {
    title: "Diversification",
    description: "Allocation across assets and asset classes.",
    maxPoints: 40,
    sortOrder: 0,
  });
  const criterionRisk = await upsertCriterion(rubric.id, {
    title: "Risk Management",
    description: "Position sizing, stop-loss logic, and risk controls.",
    maxPoints: 30,
    sortOrder: 1,
  });
  const criterionRationale = await upsertCriterion(rubric.id, {
    title: "Investment Rationale",
    description: "Quality of evidence and reasoning.",
    maxPoints: 30,
    sortOrder: 2,
  });
  const diversificationExcellent = await upsertCriterionLevel(
    criterionDiversification.id,
    {
      title: "Excellent",
      points: 40,
      description: "Five or more assets across three asset classes with clear weights.",
      sortOrder: 0,
    }
  );
  const diversificationGood = await upsertCriterionLevel(
    criterionDiversification.id,
    {
      title: "Good",
      points: 30,
      description: "Diversified but missing one asset class.",
      sortOrder: 1,
    }
  );
  await upsertCriterionLevel(criterionRisk.id, {
    title: "Excellent",
    points: 30,
    description: "Clear risk controls and realistic position sizing.",
    sortOrder: 0,
  });
  const riskGood = await upsertCriterionLevel(criterionRisk.id, {
    title: "Good",
    points: 22,
    description: "Basic risk controls with minor gaps.",
    sortOrder: 1,
  });
  const rationaleExcellent = await upsertCriterionLevel(
    criterionRationale.id,
    {
      title: "Excellent",
      points: 30,
      description: "Strong evidence and coherent investment thesis.",
      sortOrder: 0,
    }
  );
  const rationaleGood = await upsertCriterionLevel(criterionRationale.id, {
    title: "Good",
    points: 24,
    description: "Reasonable rationale with limited supporting evidence.",
    sortOrder: 1,
  });
  await prisma.assignment.update({
    where: { id: stockAssignmentOne.id },
    data: { rubricId: rubric.id },
  });
  await prisma.assignment.update({
    where: { id: stockAssignmentTwo.id },
    data: { categoryId: stockAssignmentsCategory.id },
  });

  console.log("Assignments, grade categories, and rubrics ready");

  const enrollmentFree = await upsertEnrollment(student.id, courseFree.id, {
    status: "completed",
    progressPercent: 100,
    enrolledAt: daysAgo(60),
    enrolledBy: student.id,
    completedAt: daysAgo(50),
    expiresAt: null,
    certificateUrl: null,
  });
  await upsertEnrollment(student.id, courseStock.id, {
    status: "active",
    progressPercent: 71,
    enrolledAt: daysAgo(35),
    enrolledBy: student.id,
    completedAt: null,
    expiresAt: daysFromNow(330),
    certificateUrl: null,
  });
  await upsertEnrollment(student.id, courseKhqr.id, {
    status: "completed",
    progressPercent: 100,
    enrolledAt: daysAgo(45),
    enrolledBy: student.id,
    completedAt: daysAgo(42),
    expiresAt: null,
    certificateUrl: null,
  });
  const enrollmentPersonal = await upsertEnrollment(student.id, coursePersonal.id, {
    status: "active",
    progressPercent: 40,
    enrolledAt: daysAgo(20),
    enrolledBy: student.id,
    completedAt: null,
    expiresAt: daysFromNow(345),
    certificateUrl: null,
  });
  const enrollmentFreeTwo = await upsertEnrollment(studentTwo.id, courseFree.id, {
    status: "completed",
    progressPercent: 100,
    enrolledAt: daysAgo(70),
    enrolledBy: studentTwo.id,
    completedAt: daysAgo(55),
    expiresAt: null,
    certificateUrl: null,
  });
  await upsertEnrollment(studentTwo.id, courseStock.id, {
    status: "active",
    progressPercent: 43,
    enrolledAt: daysAgo(28),
    enrolledBy: studentTwo.id,
    completedAt: null,
    expiresAt: daysFromNow(337),
    certificateUrl: null,
  });
  await upsertEnrollment(studentTwo.id, courseCrypto.id, {
    status: "active",
    progressPercent: 33,
    enrolledAt: daysAgo(12),
    enrolledBy: studentTwo.id,
    completedAt: null,
    expiresAt: daysFromNow(353),
    certificateUrl: null,
  });
  await upsertEnrollment(studentThree.id, courseStock.id, {
    status: "active",
    progressPercent: 57,
    enrolledAt: daysAgo(22),
    enrolledBy: studentThree.id,
    completedAt: null,
    expiresAt: daysFromNow(343),
    certificateUrl: null,
  });
  await upsertEnrollment(studentThree.id, coursePersonal.id, {
    status: "active",
    progressPercent: 40,
    enrolledAt: daysAgo(8),
    enrolledBy: studentThree.id,
    completedAt: null,
    expiresAt: daysFromNow(357),
    certificateUrl: null,
  });
  await upsertEnrollment(studentThree.id, courseArchived.id, {
    status: "expired",
    progressPercent: 0,
    enrolledAt: daysAgo(200),
    enrolledBy: studentThree.id,
    completedAt: null,
    expiresAt: daysAgo(100),
    certificateUrl: null,
  });

  // Lesson-level completions are the source of truth for course progress.
  // These plans are idempotent and keep the enrollment percentages above in
  // sync with the actual completed lesson count.
  await seedLessonCompletions({
    userId: student.id,
    courseId: courseFree.id,
    lessonIds: [
      freeLessonOne.id,
      freeLessonTwo.id,
      freeQuizLesson.id,
      freeSecurityLesson.id,
    ],
    status: "completed",
    completedAt: daysAgo(50),
  });
  await seedLessonCompletions({
    userId: student.id,
    courseId: courseStock.id,
    lessonIds: [
      stockLessonOne.id,
      stockLessonTwo.id,
      stockLessonThree.id,
      stockQuizLesson.id,
      stockLessonFour.id,
    ],
    status: "active",
  });
  await seedLessonCompletions({
    userId: student.id,
    courseId: courseKhqr.id,
    lessonIds: [khqrLessonOne.id, khqrLessonTwo.id, khqrQuizLesson.id],
    status: "completed",
    completedAt: daysAgo(42),
  });
  await seedLessonCompletions({
    userId: student.id,
    courseId: coursePersonal.id,
    lessonIds: [personalLessonOne.id, personalLessonTwo.id],
    status: "active",
  });

  await seedLessonCompletions({
    userId: studentTwo.id,
    courseId: courseFree.id,
    lessonIds: [
      freeLessonOne.id,
      freeLessonTwo.id,
      freeQuizLesson.id,
      freeSecurityLesson.id,
    ],
    status: "completed",
    completedAt: daysAgo(55),
  });
  await seedLessonCompletions({
    userId: studentTwo.id,
    courseId: courseStock.id,
    lessonIds: [stockLessonOne.id, stockLessonTwo.id, stockLessonThree.id],
    status: "active",
  });
  await seedLessonCompletions({
    userId: studentTwo.id,
    courseId: courseCrypto.id,
    lessonIds: [cryptoLessonOne.id],
    status: "active",
  });

  await seedLessonCompletions({
    userId: studentThree.id,
    courseId: courseStock.id,
    lessonIds: [
      stockLessonOne.id,
      stockLessonTwo.id,
      stockLessonThree.id,
      stockQuizLesson.id,
    ],
    status: "active",
  });
  await seedLessonCompletions({
    userId: studentThree.id,
    courseId: coursePersonal.id,
    lessonIds: [personalLessonOne.id, personalLessonTwo.id],
    status: "active",
  });
  await seedLessonCompletions({
    userId: studentThree.id,
    courseId: courseArchived.id,
    lessonIds: [],
    status: "expired",
  });

  console.log("Lesson completions ready");

  const waitlistOne = await upsertWaitlist(studentThree.id, courseAdvanced.id, {
    status: "pending",
    requestedAt: daysAgo(6),
    processedAt: null,
    processedBy: null,
    notes: "Interested in the scheduled cohort.",
  });
  await upsertWaitlist(studentTwo.id, courseAdvanced.id, {
    status: "approved",
    requestedAt: daysAgo(10),
    processedAt: daysAgo(7),
    processedBy: instructor.id,
    notes: "Approved for early access when the course opens.",
  });
  await upsertWaitlist(student.id, courseCrypto.id, {
    status: "converted",
    requestedAt: daysAgo(40),
    processedAt: daysAgo(38),
    processedBy: instructorTwo.id,
    notes: "Converted to a paid enrollment in a previous cohort.",
  });

  const certificateOne = await upsertCertificate("ELMS-SEED-2026-0001", {
    id: "seed-certificate-0001",
    userId: student.id,
    courseId: courseFree.id,
    enrollmentId: enrollmentFree.id,
    templateUrl: "/uploads/documents/Project_Proposal_--_ELMS.pdf",
    issuedAt: daysAgo(50),
    downloadedAt: daysAgo(49),
  });
  const certificateTwo = await upsertCertificate("ELMS-SEED-2026-0002", {
    id: "seed-certificate-0002",
    userId: studentTwo.id,
    courseId: courseFree.id,
    enrollmentId: enrollmentFreeTwo.id,
    templateUrl: "/uploads/documents/Project_Proposal_--_ELMS.pdf",
    issuedAt: daysAgo(55),
    downloadedAt: null,
  });
  await prisma.enrollment.update({
    where: { id: enrollmentFree.id },
    data: { certificateUrl: `/api/v1/certificates/${certificateOne.id}` },
  });
  await prisma.enrollment.update({
    where: { id: enrollmentFreeTwo.id },
    data: { certificateUrl: `/api/v1/certificates/${certificateTwo.id}` },
  });

  console.log("Enrollments, waitlists, and certificates ready");

  await upsertQuizAttempt(
    stockQuiz,
    student.id,
    1,
    4,
    daysAgo(18),
    "completed"
  );
  const stockAttemptTwo = await upsertQuizAttempt(
    stockQuiz,
    student.id,
    2,
    5,
    daysAgo(16),
    "completed"
  );
  await upsertQuizAttempt(stockQuiz, studentTwo.id, 1, 3, daysAgo(14));
  const personalAttempt = await upsertQuizAttempt(
    personalQuiz,
    student.id,
    1,
    5,
    daysAgo(10)
  );
  const personalAttemptThree = await upsertQuizAttempt(
    personalQuiz,
    studentThree.id,
    1,
    2,
    daysAgo(4)
  );
  const freeAttempt = await upsertQuizAttempt(
    freeQuiz,
    student.id,
    1,
    4,
    daysAgo(55)
  );
  const khqrAttempt = await upsertQuizAttempt(
    khqrQuiz,
    student.id,
    1,
    4,
    daysAgo(43)
  );
  const cryptoAttempt = await upsertQuizAttempt(
    cryptoQuiz,
    studentTwo.id,
    1,
    3,
    daysAgo(9)
  );
  await upsertQuizAttempt(stockQuiz, student.id, 3, 2, daysAgo(15), "timed_out");
  await upsertQuizAttempt(freeQuiz, studentThree.id, 1, 1, daysAgo(3), "in_progress");

  await upsertGrade({
    studentId: student.id,
    courseId: courseStock.id,
    quizId: stockQuiz.id,
    points: stockAttemptTwo.score,
    maxPoints: stockAttemptTwo.maxScore,
    percentage: Number(stockAttemptTwo.percentage),
    letterGrade: letterGrade(Number(stockAttemptTwo.percentage)),
    passFail: Number(stockAttemptTwo.percentage) >= 60 ? "pass" : "fail",
    feedback: "Excellent recovery on the retake. Continue reviewing position sizing.",
    isPublished: true,
    publishedAt: daysAgo(15),
    gradedBy: instructor.id,
  });
  await upsertGrade({
    studentId: studentTwo.id,
    courseId: courseStock.id,
    quizId: stockQuiz.id,
    points: 6,
    maxPoints: 10,
    percentage: 60,
    letterGrade: "D",
    passFail: "pass",
    feedback: "You passed. Review market indices and IPO terminology before the next attempt.",
    isPublished: true,
    publishedAt: daysAgo(13),
    gradedBy: instructor.id,
  });
  const personalGrade = await upsertGrade({
    studentId: student.id,
    courseId: coursePersonal.id,
    quizId: personalQuiz.id,
    points: personalAttempt.score,
    maxPoints: personalAttempt.maxScore,
    percentage: Number(personalAttempt.percentage),
    letterGrade: letterGrade(Number(personalAttempt.percentage)),
    passFail: "pass",
    feedback: "Strong understanding of budgeting fundamentals.",
    isPublished: true,
    publishedAt: daysAgo(9),
    gradedBy: instructor.id,
  });
  await upsertGrade({
    studentId: studentThree.id,
    courseId: coursePersonal.id,
    quizId: personalQuiz.id,
    points: personalAttemptThree.score,
    maxPoints: personalAttemptThree.maxScore,
    percentage: Number(personalAttemptThree.percentage),
    letterGrade: letterGrade(Number(personalAttemptThree.percentage)),
    passFail: "fail",
    feedback: "Review essential expenses and emergency fund targets, then retake the quiz.",
    isPublished: true,
    publishedAt: daysAgo(3),
    gradedBy: instructor.id,
  });
  await upsertGrade({
    studentId: student.id,
    courseId: courseFree.id,
    quizId: freeQuiz.id,
    points: freeAttempt.score,
    maxPoints: freeAttempt.maxScore,
    percentage: Number(freeAttempt.percentage),
    letterGrade: letterGrade(Number(freeAttempt.percentage)),
    passFail: "pass",
    feedback: "Good grasp of Bakong and KHQR fundamentals.",
    isPublished: true,
    publishedAt: daysAgo(54),
    gradedBy: instructor.id,
  });
  await upsertGrade({
    studentId: student.id,
    courseId: courseKhqr.id,
    quizId: khqrQuiz.id,
    points: khqrAttempt.score,
    maxPoints: khqrAttempt.maxScore,
    percentage: Number(khqrAttempt.percentage),
    letterGrade: letterGrade(Number(khqrAttempt.percentage)),
    passFail: "pass",
    feedback: "Payment states and webhook verification are clear.",
    isPublished: true,
    publishedAt: daysAgo(42),
    gradedBy: instructor.id,
  });
  await upsertGrade({
    studentId: studentTwo.id,
    courseId: courseCrypto.id,
    quizId: cryptoQuiz.id,
    points: cryptoAttempt.score,
    maxPoints: cryptoAttempt.maxScore,
    percentage: Number(cryptoAttempt.percentage),
    letterGrade: letterGrade(Number(cryptoAttempt.percentage)),
    passFail: "pass",
    feedback: "Solid risk awareness. Keep custody best practices front of mind.",
    isPublished: true,
    publishedAt: daysAgo(8),
    gradedBy: instructorTwo.id,
  });

  const submissionOne = await upsertSubmission(stockAssignmentOne.id, student.id, {
    content:
      "I allocated 45% to global equity ETFs, 25% to Cambodian government bonds, 15% to gold, 10% to real estate, and 5% to cash. Rebalancing is annual with a 5% drift band.",
    fileUrls: ["/uploads/documents/FIN_406_merged.pdf"],
    submittedAt: daysAgo(13),
    isLate: false,
  });
  const submissionTwo = await upsertSubmission(stockAssignmentOne.id, studentTwo.id, {
    content:
      "My portfolio uses four index funds, a bond fund, and a small cash reserve. I included a risk section and a semi-annual rebalancing plan.",
    fileUrls: [],
    submittedAt: daysAgo(10),
    isLate: true,
  });
  await upsertSubmission(personalAssignment.id, student.id, {
    content:
      "My monthly budget balances tuition, rent, food, transport, savings, and a small entertainment category. I included a 10% emergency fund contribution.",
    fileUrls: ["/uploads/documents/FIN_414_merged.pdf"],
    submittedAt: daysAgo(6),
    isLate: false,
  });
  await upsertSubmission(personalAssignment.id, studentThree.id, {
    content:
      "Draft budget covering rent, food, transport, and savings. I still need to refine variable expenses.",
    fileUrls: [],
    submittedAt: daysAgo(2),
    isLate: true,
  });
  await upsertSubmission(cryptoAssignment.id, studentTwo.id, {
    content:
      "A 5% crypto allocation modestly increases expected return but raises drawdown risk. I recommend a maximum 5% allocation with hardware wallet custody.",
    fileUrls: [],
    submittedAt: daysAgo(2),
    isLate: false,
  });

  const assignmentGradeOne = await upsertGrade({
    studentId: student.id,
    courseId: courseStock.id,
    assignmentId: stockAssignmentOne.id,
    points: 88,
    maxPoints: 100,
    percentage: 88,
    letterGrade: "B",
    passFail: "pass",
    feedback:
      "Well-diversified portfolio with a clear rationale. Tighten your risk controls and document rebalancing costs.",
    isPublished: true,
    publishedAt: daysAgo(9),
    gradedBy: instructor.id,
  });
  const assignmentGradeTwo = await upsertGrade({
    studentId: studentTwo.id,
    courseId: courseStock.id,
    assignmentId: stockAssignmentOne.id,
    points: 76,
    maxPoints: 100,
    percentage: 76,
    letterGrade: "C",
    passFail: "pass",
    feedback:
      "Reasonable allocation but the risk section needs more detail and the submission was late.",
    isPublished: true,
    publishedAt: daysAgo(8),
    gradedBy: instructor.id,
  });
  await upsertGrade({
    studentId: student.id,
    courseId: coursePersonal.id,
    assignmentId: personalAssignment.id,
    points: 92,
    maxPoints: 100,
    percentage: 92,
    letterGrade: "A",
    passFail: "pass",
    feedback:
      "Practical and well-structured budget with a realistic emergency fund plan.",
    isPublished: true,
    publishedAt: daysAgo(4),
    gradedBy: instructor.id,
  });
  await upsertGrade({
    studentId: studentThree.id,
    courseId: coursePersonal.id,
    assignmentId: personalAssignment.id,
    points: 68,
    maxPoints: 100,
    percentage: 68,
    letterGrade: "D",
    passFail: "pass",
    feedback:
      "The budget is a good start, but variable expenses need more detail and the submission was late.",
    isPublished: true,
    publishedAt: daysAgo(1),
    gradedBy: instructor.id,
  });
  await upsertGrade({
    studentId: student.id,
    courseId: courseStock.id,
    assignmentId: stockAssignmentTwo.id,
    points: 45,
    maxPoints: 50,
    percentage: 90,
    letterGrade: "A",
    passFail: "pass",
    feedback: "Clear chart annotations and disciplined risk levels.",
    isPublished: false,
    publishedAt: null,
    gradedBy: instructor.id,
  });
  await upsertGrade({
    studentId: student.id,
    courseId: courseFree.id,
    assignmentId: digitalAssignment.id,
    points: 95,
    maxPoints: 100,
    percentage: 95,
    letterGrade: "A",
    passFail: "pass",
    feedback:
      "Comprehensive onboarding plan with a strong reconciliation and support section.",
    isPublished: true,
    publishedAt: daysAgo(20),
    gradedBy: instructor.id,
  });
  await upsertGrade({
    studentId: studentTwo.id,
    courseId: courseCrypto.id,
    assignmentId: cryptoAssignment.id,
    points: 82,
    maxPoints: 100,
    percentage: 82,
    letterGrade: "B",
    passFail: "pass",
    feedback: "Balanced discussion of volatility and custody risk.",
    isPublished: true,
    publishedAt: daysAgo(1),
    gradedBy: instructorTwo.id,
  });

  await upsertRubricGrade(assignmentGradeOne.id, criterionDiversification.id, {
    levelId: diversificationExcellent.id,
    pointsEarned: 38,
    feedback: "Excellent asset-class coverage with clear weights.",
  });
  await upsertRubricGrade(assignmentGradeOne.id, criterionRisk.id, {
    levelId: riskGood.id,
    pointsEarned: 24,
    feedback: "Good risk awareness, but rebalancing costs are not quantified.",
  });
  await upsertRubricGrade(assignmentGradeOne.id, criterionRationale.id, {
    levelId: rationaleExcellent.id,
    pointsEarned: 26,
    feedback: "Coherent thesis with supporting evidence.",
  });
  await upsertRubricGrade(assignmentGradeTwo.id, criterionDiversification.id, {
    levelId: diversificationGood.id,
    pointsEarned: 30,
    feedback: "Diversified but light on non-equity exposure.",
  });
  await upsertRubricGrade(assignmentGradeTwo.id, criterionRisk.id, {
    levelId: riskGood.id,
    pointsEarned: 22,
    feedback: "Basic risk controls need more detail.",
  });
  await upsertRubricGrade(assignmentGradeTwo.id, criterionRationale.id, {
    levelId: rationaleGood.id,
    pointsEarned: 24,
    feedback: "Rationale is reasonable but could cite more evidence.",
  });

  await upsertGradeAppeal("seed-appeal-001", {
    gradeId: assignmentGradeTwo.id,
    studentId: studentTwo.id,
    reason:
      "I believe the risk management section deserved more credit because I included position sizing and a stop-loss rule.",
    status: "pending",
    response: null,
  });
  await upsertGradeAppeal("seed-appeal-002", {
    gradeId: personalGrade.id,
    studentId: student.id,
    reason:
      "The quiz marked my short answer wrong, but the answer matches the lesson example.",
    status: "rejected",
    response:
      "The lesson asks for a specific action, and the submitted answer was too general. Please review the emergency fund lesson and retake the quiz.",
  });

  console.log("Quiz attempts, submissions, grades, rubrics, and appeals ready");

  const couponWelcome = await upsertCoupon({
    code: "WELCOME10",
    description: "10% off your first paid course",
    discountType: "percentage",
    discountValue: 10,
    maxUses: 100,
    usesCount: 1,
    validFrom: daysAgo(90),
    validUntil: daysFromNow(90),
    courseId: null,
    isActive: true,
  });
  await upsertCoupon({
    code: "FINANCE5",
    description: "USD 5 off Personal Finance Mastery",
    discountType: "fixed",
    discountValue: 5,
    maxUses: 50,
    usesCount: 0,
    validFrom: daysAgo(30),
    validUntil: daysFromNow(60),
    courseId: coursePersonal.id,
    isActive: true,
  });
  await upsertCoupon({
    code: "EARLYBIRD20",
    description: "Expired early-bird discount for stock trading",
    discountType: "percentage",
    discountValue: 20,
    maxUses: 25,
    usesCount: 25,
    validFrom: daysAgo(120),
    validUntil: daysAgo(1),
    courseId: courseStock.id,
    isActive: false,
  });

  await upsertSubscriptionPlan({
    name: "Starter",
    description: "Access to free courses and community announcements.",
    price: 0,
    currency: "USD",
    durationMonths: 1,
    features: ["Free courses", "Community announcements", "Basic progress tracking"],
    isActive: true,
  });
  const planPro = await upsertSubscriptionPlan({
    name: "Pro Learner",
    description: "Unlimited monthly access to paid courses and certificates.",
    price: 19.99,
    currency: "USD",
    durationMonths: 1,
    features: [
      "All published courses",
      "Certificates",
      "Priority instructor feedback",
    ],
    isActive: true,
  });
  const planAnnual = await upsertSubscriptionPlan({
    name: "Annual All-Access",
    description: "Best value for year-round learning.",
    price: 149.99,
    currency: "USD",
    durationMonths: 12,
    features: [
      "All published courses",
      "Certificates",
      "Priority instructor feedback",
      "Two months free",
    ],
    isActive: true,
  });

  const paymentKhqr = await upsertPayment("SEED-KHQR-0001", {
    userId: student.id,
    courseId: courseKhqr.id,
    subscriptionId: null,
    amount: 0.1,
    currency: "USD",
    status: "completed",
    gateway: "khqr",
    couponCode: null,
    discountAmount: null,
    metadata: { sandbox: true, bank: "Bakong" },
    paidAt: daysAgo(45),
    refundedAt: null,
    refundReason: null,
  });
  await upsertPayment("SEED-ABA-0002", {
    userId: student.id,
    courseId: courseStock.id,
    subscriptionId: null,
    amount: 26.99,
    currency: "USD",
    status: "completed",
    gateway: "aba_payway",
    couponCode: couponWelcome.code,
    discountAmount: 3,
    metadata: { checkout: "cards", sandbox: true },
    paidAt: daysAgo(35),
    refundedAt: null,
    refundReason: null,
  });
  await upsertPayment("SEED-ABA-0003", {
    userId: studentTwo.id,
    courseId: courseStock.id,
    subscriptionId: null,
    amount: 29.99,
    currency: "USD",
    status: "completed",
    gateway: "aba_payway",
    couponCode: null,
    discountAmount: null,
    metadata: { checkout: "aba_mobile" },
    paidAt: daysAgo(28),
    refundedAt: null,
    refundReason: null,
  });
  await upsertPayment("SEED-KHQR-0004", {
    userId: studentThree.id,
    courseId: coursePersonal.id,
    subscriptionId: null,
    amount: 19.99,
    currency: "USD",
    status: "pending",
    gateway: "khqr",
    couponCode: null,
    discountAmount: null,
    metadata: { sandbox: true, expiresInMinutes: 5 },
    paidAt: null,
    refundedAt: null,
    refundReason: null,
  });
  await upsertPayment("SEED-BAKONG-0005", {
    userId: studentTwo.id,
    courseId: courseCrypto.id,
    subscriptionId: null,
    amount: 39.99,
    currency: "USD",
    status: "failed",
    gateway: "bakong",
    couponCode: null,
    discountAmount: null,
    metadata: { reason: "insufficient_funds" },
    paidAt: null,
    refundedAt: null,
    refundReason: null,
  });
  await upsertPayment("SEED-REFUND-0006", {
    userId: student.id,
    courseId: coursePersonal.id,
    subscriptionId: null,
    amount: 19.99,
    currency: "USD",
    status: "refunded",
    gateway: "aba_payway",
    couponCode: "FINANCE5",
    discountAmount: 5,
    metadata: { refundRequestedBy: "student" },
    paidAt: daysAgo(25),
    refundedAt: daysAgo(18),
    refundReason: "Student switched to the annual subscription.",
  });
  await upsertPayment("SEED-SUB-0007", {
    userId: student.id,
    courseId: null,
    subscriptionId: planPro.id,
    amount: 19.99,
    currency: "USD",
    status: "completed",
    gateway: "aba_payway",
    couponCode: null,
    discountAmount: null,
    metadata: { plan: planPro.name, period: "monthly" },
    paidAt: daysAgo(5),
    refundedAt: null,
    refundReason: null,
  });
  await upsertPayment("SEED-SUB-0008", {
    userId: studentTwo.id,
    courseId: null,
    subscriptionId: planAnnual.id,
    amount: 149.99,
    currency: "USD",
    status: "completed",
    gateway: "khqr",
    couponCode: null,
    discountAmount: null,
    metadata: { plan: planAnnual.name, period: "annual" },
    paidAt: daysAgo(2),
    refundedAt: null,
    refundReason: null,
  });

  await upsertPayout("seed-payout-001", {
    instructorId: instructor.id,
    amount: 425.75,
    currency: "USD",
    status: "pending",
    periodStart: daysAgo(40),
    periodEnd: daysAgo(10),
    processedAt: null,
    transactionRef: null,
    notes: "Pending monthly payout for paid course sales.",
  });
  await upsertPayout("seed-payout-002", {
    instructorId: instructor.id,
    amount: 380,
    currency: "USD",
    status: "processed",
    periodStart: daysAgo(70),
    periodEnd: daysAgo(40),
    processedAt: daysAgo(38),
    transactionRef: "SEED-POUT-2026-0002",
    notes: "Processed via ABA Bank transfer.",
  });
  await upsertPayout("seed-payout-003", {
    instructorId: instructorTwo.id,
    amount: 112.5,
    currency: "USD",
    status: "pending",
    periodStart: daysAgo(30),
    periodEnd: daysAgo(1),
    processedAt: null,
    transactionRef: null,
    notes: "Crypto course launch payout.",
  });

  console.log("Payments, coupons, subscriptions, and payouts ready");

  await upsertNotification("seed-notif-001", {
    userId: student.id,
    type: "GRADE_PUBLISHED",
    title: "New grade available",
    message: "Your Portfolio Construction Project has been graded. You earned 88%.",
    entityType: "Grade",
    entityId: assignmentGradeOne.id,
    isRead: false,
    readAt: null,
    createdAt: daysAgo(9),
  });
  await upsertNotification("seed-notif-002", {
    userId: student.id,
    type: "ENROLLMENT_APPROVED",
    title: "Welcome to Personal Finance Mastery",
    message: "You are enrolled and can continue from your current progress.",
    entityType: "Enrollment",
    entityId: enrollmentPersonal.id,
    isRead: true,
    readAt: daysAgo(19),
    createdAt: daysAgo(20),
  });
  await upsertNotification("seed-notif-003", {
    userId: student.id,
    type: "PAYMENT_CONFIRMED",
    title: "Payment confirmed",
    message: "Your KHQR payment of USD 0.10 has been confirmed.",
    entityType: "Payment",
    entityId: paymentKhqr.id,
    isRead: true,
    readAt: daysAgo(44),
    createdAt: daysAgo(45),
  });
  await upsertNotification("seed-notif-004", {
    userId: student.id,
    type: "QUIZ_GRADED",
    title: "Quiz graded",
    message: "Your Stock Market Basics Quiz retake scored 100%.",
    entityType: "QuizAttempt",
    entityId: stockAttemptTwo.id,
    isRead: false,
    readAt: null,
    createdAt: daysAgo(15),
  });
  await upsertNotification("seed-notif-005", {
    userId: student.id,
    type: "COURSE_UPDATE",
    title: "New lesson added",
    message: "A new lesson on fraud prevention was added to your digital finance course.",
    entityType: "Lesson",
    entityId: freeSecurityLesson.id,
    isRead: false,
    readAt: null,
    createdAt: daysAgo(12),
  });
  await upsertNotification("seed-notif-006", {
    userId: studentTwo.id,
    type: "GRADE_PUBLISHED",
    title: "Grade published",
    message: "Your Portfolio Construction Project grade is now available.",
    entityType: "Grade",
    entityId: assignmentGradeTwo.id,
    isRead: false,
    readAt: null,
    createdAt: daysAgo(8),
  });
  await upsertNotification("seed-notif-007", {
    userId: instructor.id,
    type: "SUBMISSION_RECEIVED",
    title: "New assignment submission",
    message: "Sreyneang Lim submitted the Portfolio Construction Project.",
    entityType: "Submission",
    entityId: submissionOne.id,
    isRead: false,
    readAt: null,
    createdAt: daysAgo(13),
  });
  await upsertNotification("seed-notif-008", {
    userId: instructor.id,
    type: "PAYOUT_PROCESSED",
    title: "Payout processed",
    message: "Your previous monthly payout of USD 380.00 was processed.",
    entityType: "InstructorPayout",
    entityId: "seed-payout-002",
    isRead: true,
    readAt: daysAgo(37),
    createdAt: daysAgo(38),
  });
  await upsertNotification("seed-notif-009", {
    userId: instructorTwo.id,
    type: "SUBMISSION_RECEIVED",
    title: "New crypto risk assessment",
    message: "Anna Sok submitted the Crypto Risk Assessment.",
    entityType: "Submission",
    entityId: submissionTwo.id,
    isRead: false,
    readAt: null,
    createdAt: daysAgo(2),
  });
  await upsertNotification("seed-notif-010", {
    userId: admin.id,
    type: "SYSTEM_ALERT",
    title: "Seed data loaded",
    message: "The demo dataset has been loaded for all platform roles.",
    entityType: "System",
    entityId: null,
    isRead: false,
    readAt: null,
    createdAt: daysAgo(1),
  });
  await upsertNotification("seed-notif-011", {
    userId: studentThree.id,
    type: "WAITLIST_APPROVED",
    title: "Waitlist update",
    message: "Your waitlist request for Advanced Portfolio Management is still pending.",
    entityType: "Waitlist",
    entityId: waitlistOne.id,
    isRead: false,
    readAt: null,
    createdAt: daysAgo(5),
  });

  const announcementGlobal = await upsertAnnouncement("seed-announcement-001", {
    title: "Welcome to the FinTech ELMS demo",
    content:
      "Explore courses, quizzes, assignments, certificates, payments, and reports using the seeded accounts.",
    courseId: null,
    createdBy: admin.id,
    isActive: true,
    priority: "normal",
    createdAt: daysAgo(30),
  });
  const announcementStock = await upsertAnnouncement("seed-announcement-002", {
    title: "Live Q&A: Portfolio Review",
    content:
      "Join the instructor this Friday at 6 PM for a live portfolio review session. Bring one chart and one question.",
    courseId: courseStock.id,
    createdBy: instructor.id,
    isActive: true,
    priority: "high",
    createdAt: daysAgo(11),
  });
  await upsertAnnouncement("seed-announcement-003", {
    title: "New budgeting worksheet available",
    content:
      "The monthly budget worksheet has been updated with a Cambodian student expense template.",
    courseId: coursePersonal.id,
    createdBy: instructor.id,
    isActive: true,
    priority: "normal",
    createdAt: daysAgo(7),
  });
  await upsertAnnouncement("seed-announcement-004", {
    title: "Archived: Branch reconciliation schedule",
    content: "This announcement is retained for reference only.",
    courseId: courseArchived.id,
    createdBy: instructorTwo.id,
    isActive: false,
    priority: "low",
    createdAt: daysAgo(150),
  });
  await upsertAnnouncementRead(announcementGlobal.id, student.id, daysAgo(29));
  await upsertAnnouncementRead(announcementGlobal.id, studentTwo.id, daysAgo(25));
  await upsertAnnouncementRead(announcementStock.id, student.id, daysAgo(10));

  const commentOne = await upsertComment("seed-comment-001", {
    userId: student.id,
    lessonId: stockLessonOne.id,
    content:
      "The distinction between ownership and debt really helped. Does a share's value depend only on the company's profit?",
    parentId: null,
    createdAt: daysAgo(20),
  });
  await upsertComment("seed-comment-002", {
    userId: instructor.id,
    lessonId: stockLessonOne.id,
    content:
      "Great question. Profit matters, but valuation also depends on growth expectations, risk, and market sentiment.",
    parentId: commentOne.id,
    createdAt: daysAgo(19),
  });
  await upsertComment("seed-comment-003", {
    userId: studentTwo.id,
    lessonId: freeLessonTwo.id,
    content:
      "The comparison of ABA, ACLEDA, and Wing was very practical. I did not realize KHQR works across all of them.",
    parentId: null,
    createdAt: daysAgo(18),
  });
  await upsertComment("seed-comment-004", {
    userId: studentThree.id,
    lessonId: stockLessonFour.id,
    content:
      "Could we get a downloadable cheat sheet for the most common candlestick patterns?",
    parentId: null,
    createdAt: daysAgo(6),
  });

  console.log("Notifications, announcements, and comments ready");

  const publicSettings: Array<[string, string, AnyRecord]> = [
    [
      "site_name",
      "FinTech ELMS",
      {
        type: "string",
        group: "branding",
        label: "Site name",
        description: "Public platform name",
        isPublic: true,
      },
    ],
    [
      "site_logo",
      "/uploads/thumbnails/finance-program.svg",
      {
        type: "string",
        group: "branding",
        label: "Site logo",
        description: "Public logo URL",
        isPublic: true,
      },
    ],
    [
      "maintenance_mode",
      "false",
      {
        type: "boolean",
        group: "system",
        label: "Maintenance mode",
        description: "When true, the public site shows a maintenance notice",
        isPublic: true,
      },
    ],
    [
      "default_currency",
      "USD",
      {
        type: "string",
        group: "payments",
        label: "Default currency",
        description: "Default currency for course prices",
        isPublic: true,
      },
    ],
    [
      "contact_email",
      "support@fintechelms.com",
      {
        type: "string",
        group: "general",
        label: "Contact email",
        description: "Public support email",
        isPublic: true,
      },
    ],
    [
      "enrollment_auto_approve",
      "true",
      {
        type: "boolean",
        group: "enrollment",
        label: "Auto-approve enrollments",
        description: "Automatically approve self-enrollments for free courses",
        isPublic: false,
      },
    ],
    [
      "max_upload_size_mb",
      "25",
      {
        type: "number",
        group: "uploads",
        label: "Maximum upload size",
        description: "Maximum upload size in megabytes",
        isPublic: false,
      },
    ],
    [
      "certificate_template",
      "default",
      {
        type: "string",
        group: "certificates",
        label: "Certificate template",
        description: "Template used for issued certificates",
        isPublic: false,
      },
    ],
    [
      "payment_gateway",
      "aba_payway",
      {
        type: "string",
        group: "payments",
        label: "Default payment gateway",
        description: "Gateway used for new checkouts",
        isPublic: false,
      },
    ],
    [
      "support_hours",
      "Mon-Fri 08:00-17:00 ICT",
      {
        type: "string",
        group: "general",
        label: "Support hours",
        description: "Staffed support hours",
        isPublic: true,
      },
    ],
  ];
  for (const [key, value, data] of publicSettings) {
    await upsertSetting(key, value, data);
  }

  await upsertAuditLog("seed-audit-001", {
    userId: admin.id,
    action: "SEED_DATABASE",
    entity: "System",
    entityId: null,
    oldValues: null,
    newValues: { users: 6, courses: 7, feature: "comprehensive seed" },
    ipAddress: "127.0.0.1",
    userAgent: "seed-script",
    createdAt: daysAgo(1),
  });
  await upsertAuditLog("seed-audit-002", {
    userId: admin.id,
    action: "CREATE_COUPON",
    entity: "Coupon",
    entityId: couponWelcome.id,
    oldValues: null,
    newValues: { code: couponWelcome.code, discountType: "percentage", discountValue: 10 },
    ipAddress: "127.0.0.1",
    userAgent: "seed-script",
    createdAt: daysAgo(30),
  });
  await upsertAuditLog("seed-audit-003", {
    userId: admin.id,
    action: "PROCESS_PAYOUT",
    entity: "InstructorPayout",
    entityId: "seed-payout-002",
    oldValues: { status: "pending" },
    newValues: { status: "processed", transactionRef: "SEED-POUT-2026-0002" },
    ipAddress: "127.0.0.1",
    userAgent: "seed-script",
    createdAt: daysAgo(38),
  });
  await upsertAuditLog("seed-audit-004", {
    userId: instructor.id,
    action: "CREATE_ASSIGNMENT",
    entity: "Assignment",
    entityId: stockAssignmentOne.id,
    oldValues: null,
    newValues: { title: stockAssignmentOne.title, maxPoints: 100 },
    ipAddress: "127.0.0.1",
    userAgent: "seed-script",
    createdAt: daysAgo(20),
  });
  await upsertAuditLog("seed-audit-005", {
    userId: admin.id,
    action: "UPDATE_SETTINGS",
    entity: "Setting",
    entityId: null,
    oldValues: { maintenance_mode: "true" },
    newValues: { maintenance_mode: "false", site_name: "FinTech ELMS" },
    ipAddress: "127.0.0.1",
    userAgent: "seed-script",
    createdAt: daysAgo(2),
  });

  await prisma.refreshToken.upsert({
    where: { token: "seed-refresh-token-student" },
    update: {
      userId: student.id,
      expiresAt: daysFromNow(20),
      revokedAt: null,
      ipAddress: "127.0.0.1",
      userAgent: "seed-script",
    },
    create: {
      userId: student.id,
      token: "seed-refresh-token-student",
      expiresAt: daysFromNow(20),
      ipAddress: "127.0.0.1",
      userAgent: "seed-script",
    },
  });
  await prisma.passwordReset.upsert({
    where: { token: "seed-password-reset-token" },
    update: {
      userId: studentTwo.id,
      expiresAt: daysAgo(4),
      usedAt: daysAgo(5),
    },
    create: {
      userId: studentTwo.id,
      token: "seed-password-reset-token",
      expiresAt: daysAgo(4),
      usedAt: daysAgo(5),
    },
  });
  await prisma.emailVerification.upsert({
    where: { token: "seed-email-verification-token" },
    update: {
      userId: studentThree.id,
      expiresAt: daysAgo(100),
      usedAt: daysAgo(101),
    },
    create: {
      userId: studentThree.id,
      token: "seed-email-verification-token",
      expiresAt: daysAgo(100),
      usedAt: daysAgo(101),
    },
  });

  await prisma.auditLog.update({
    where: { id: "seed-audit-001" },
    data: {
      newValues: {
        users: 6,
        courses: 7,
        enrollments: 11,
        assignments: 6,
        payments: 8,
        feature: "comprehensive seed",
      },
    },
  });

  console.log("Settings, audit logs, tokens, and system data ready");
  console.log(`Primary accounts:`);
  console.log(`  admin@elms.edu / Admin123!`);
  console.log(`  instructor@elms.edu / Instructor123!`);
  console.log(`  student@elms.edu / Student123!`);
  console.log(`Additional accounts:`);
  console.log(`  instructor.lead@elms.edu / Instructor123!`);
  console.log(`  student.anna@elms.edu / Student123!`);
  console.log(`  student.dara@elms.edu / Student123!`);
  console.log("Seed completed successfully");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
