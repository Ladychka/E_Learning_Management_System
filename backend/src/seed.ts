import { prisma } from "./lib/prisma";
import { hashPassword } from "./utils/password";

async function seed() {
  console.log("🌱 Seeding database...");

  // Seed admin user
  const adminPassword = await hashPassword("Admin123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@elms.edu" },
    update: {},
    create: {
      email: "admin@elms.edu",
      passwordHash: adminPassword,
      firstName: "System",
      lastName: "Administrator",
      role: "ADMIN",
      status: "ACTIVE",
      isEmailVerified: true,
      profile: { create: {} },
    },
  });
  console.log("Admin user:", admin.email);

  // Seed instructor
  const instructorPassword = await hashPassword("Instructor123!");
  const instructor = await prisma.user.upsert({
    where: { email: "instructor@elms.edu" },
    update: {},
    create: {
      email: "instructor@elms.edu",
      passwordHash: instructorPassword,
      firstName: "Demo",
      lastName: "Instructor",
      role: "INSTRUCTOR",
      status: "ACTIVE",
      isEmailVerified: true,
      profile: { create: {} },
    },
  });
  console.log("Instructor user:", instructor.email);

  // Seed student
  const studentPassword = await hashPassword("Student123!");
  const student = await prisma.user.upsert({
    where: { email: "student@elms.edu" },
    update: {},
    create: {
      email: "student@elms.edu",
      passwordHash: studentPassword,
      firstName: "Demo",
      lastName: "Student",
      role: "STUDENT",
      status: "ACTIVE",
      isEmailVerified: true,
      profile: { create: {} },
    },
  });
  console.log("Student user:", student.email);

  // Seed finance categories
  const categories = [
    { name: "Stock Trading", slug: "stock-trading", description: "Equity markets, technical analysis, and trading strategies", sortOrder: 1 },
    { name: "Cryptocurrency", slug: "cryptocurrency", description: "Blockchain, digital assets, and crypto investing", sortOrder: 2 },
    { name: "Personal Finance", slug: "personal-finance", description: "Budgeting, saving, and wealth management", sortOrder: 3 },
    { name: "Investment Strategies", slug: "investment-strategies", description: "Portfolio management and long-term investing", sortOrder: 4 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("Finance categories seeded:", categories.map((c) => c.name).join(", "));

  // Seed sample finance course
  const stockTrading = await prisma.category.findUnique({
    where: { slug: "stock-trading" },
  });
  if (stockTrading) {
    await prisma.course.upsert({
      where: { slug: "intro-to-stock-trading" },
      update: {},
      create: {
        title: "Introduction to Stock Trading",
        slug: "intro-to-stock-trading",
        description: "Learn the fundamentals of stock markets, chart reading, and risk management.",
        shortDesc: "Beginner-friendly stock trading course",
        status: "PUBLISHED",
        price: 29.99,
        currency: "USD",
        isFree: false,
        level: "BEGINNER",
        duration: 1200,
        language: "en",
        prerequisites: [],
        learningOutcomes: ["Read price charts", "Manage trading risk", "Place your first trade"],
        tags: ["stocks", "trading", "finance", "investing"],
        publishedAt: new Date(),
        instructorId: instructor.id,
        categoryId: stockTrading.id,
      },
    });
    console.log("Sample finance course seeded");
  }

  // ─── Seed Category for Digital Finance ───
  const digitalFinance = await prisma.category.upsert({
    where: { slug: "digital-finance" },
    update: {
      name: "Digital Finance & Banking",
      description: "Cambodian fintech, Bakong, KHQR, and digital payment systems",
      sortOrder: 5,
    },
    create: {
      name: "Digital Finance & Banking",
      slug: "digital-finance",
      description: "Cambodian fintech, Bakong, KHQR, and digital payment systems",
      sortOrder: 5,
    },
  });

  const courseCategory = digitalFinance || stockTrading;

  // ─── 1. Free Course: Introduction to Digital Finance in Cambodia (Free) ───
  const freeCourse = await prisma.course.upsert({
    where: { slug: "intro-to-digital-finance-cambodia-free" },
    update: {
      title: "Introduction to Digital Finance in Cambodia (Free)",
      price: 0.00,
      currency: "USD",
      isFree: true,
      status: "PUBLISHED",
      categoryId: courseCategory.id,
    },
    create: {
      title: "Introduction to Digital Finance in Cambodia (Free)",
      slug: "intro-to-digital-finance-cambodia-free",
      description: "Explore Cambodia's modern digital banking transformation, the National Bank of Cambodia (NBC) Bakong rails, and how KHQR is reshaping the Kingdom's cashless economy.",
      shortDesc: "Free foundational guide to Cambodian digital banking, NBC Bakong rails, and cashless financial technology.",
      status: "PUBLISHED",
      price: 0.00,
      currency: "USD",
      isFree: true,
      level: "BEGINNER",
      duration: 90,
      language: "en",
      prerequisites: [],
      learningOutcomes: [
        "Understand Bakong and KHQR architectural specifications",
        "Evaluate digital banking security & consumer rights in Cambodia",
        "Navigate cashless merchant workflows and wallet integrations",
      ],
      tags: ["fintech", "cambodia", "khqr", "bakong", "digital-finance", "free"],
      publishedAt: new Date(),
      instructorId: instructor.id,
      categoryId: courseCategory.id,
    },
  });

  let freeModule = await prisma.module.findFirst({
    where: { courseId: freeCourse.id, title: "Module 1: Foundations of Cambodian Digital Finance" },
  });
  if (!freeModule) {
    freeModule = await prisma.module.create({
      data: {
        courseId: freeCourse.id,
        title: "Module 1: Foundations of Cambodian Digital Finance",
        description: "Core concepts of cashless banking and fintech infrastructure in Cambodia.",
        sortOrder: 0,
        isPublished: true,
      },
    });
  }

  const freeLessons = [
    {
      title: "Lesson 1: The Cashless Transition & NBC Bakong Rails",
      description: "A deep dive into how Cambodia transitioned from cash to Bakong interoperability.",
      contentType: "video",
      contentUrl: "https://www.youtube.com/embed/UB1O30fR-EE",
      duration: 15,
      isPublished: true,
      isPreview: true,
      sortOrder: 0,
    },
    {
      title: "Lesson 2: Overview of Mobile Banking Apps & KHQR Adoption",
      description: "Practical analysis of consumer banking apps (ABA, ACLEDA, Wing) and unified QR codes.",
      contentType: "text",
      contentUrl: null,
      duration: 20,
      isPublished: true,
      isPreview: false,
      sortOrder: 1,
    },
  ];

  for (const lessonData of freeLessons) {
    const existingLesson = await prisma.lesson.findFirst({
      where: { moduleId: freeModule.id, title: lessonData.title },
    });
    if (!existingLesson) {
      await prisma.lesson.create({
        data: {
          moduleId: freeModule.id,
          ...lessonData,
        },
      });
    } else {
      await prisma.lesson.update({
        where: { id: existingLesson.id },
        data: lessonData,
      });
    }
  }
  console.log("Free course seeded:", freeCourse.title);

  // ─── 2. Payment Test Course: KHQR Payment Test Course ($0.10) ───
  const paidCourse = await prisma.course.upsert({
    where: { slug: "khqr-payment-test-course" },
    update: {
      title: "KHQR Payment Test Course",
      price: 0.10,
      currency: "USD",
      isFree: false,
      status: "PUBLISHED",
      categoryId: courseCategory.id,
    },
    create: {
      title: "KHQR Payment Test Course",
      slug: "khqr-payment-test-course",
      description: "Official sandbox testing course for verifying end-to-end KHQR dynamic payments, Bakong mobile app deeplinks, and 3-second webhook confirmation polling.",
      shortDesc: "Sandbox test course priced at 0.10 USD (≈ 410 KHR at 4,100 KHR/USD) for KHQR payment flow verification.",
      status: "PUBLISHED",
      price: 0.10,
      currency: "USD",
      isFree: false,
      level: "BEGINNER",
      duration: 45,
      language: "en",
      prerequisites: [],
      learningOutcomes: [
        "Test Bakong KHQR dynamic QR generation",
        "Verify 5-minute checkout countdown and 3-second status polling",
        "Simulate sandbox webhook transaction confirmations",
      ],
      tags: ["khqr", "payment-test", "bakong", "sandbox", "fintech"],
      publishedAt: new Date(),
      instructorId: instructor.id,
      categoryId: courseCategory.id,
    },
  });

  let paidModule = await prisma.module.findFirst({
    where: { courseId: paidCourse.id, title: "Module 1: KHQR Payment Rails & Verification" },
  });
  if (!paidModule) {
    paidModule = await prisma.module.create({
      data: {
        courseId: paidCourse.id,
        title: "Module 1: KHQR Payment Rails & Verification",
        description: "Payment integration architecture and testing procedures.",
        sortOrder: 0,
        isPublished: true,
      },
    });
  }

  const paidLessons = [
    {
      title: "Lesson 1: End-to-End KHQR Transaction Flow & Webhooks",
      description: "Understanding transaction states from pending to completed via Bakong sandbox simulation.",
      contentType: "video",
      contentUrl: "https://www.youtube.com/embed/UB1O30fR-EE",
      duration: 15,
      isPublished: true,
      isPreview: false,
      sortOrder: 0,
    },
  ];

  for (const lessonData of paidLessons) {
    const existingLesson = await prisma.lesson.findFirst({
      where: { moduleId: paidModule.id, title: lessonData.title },
    });
    if (!existingLesson) {
      await prisma.lesson.create({
        data: {
          moduleId: paidModule.id,
          ...lessonData,
        },
      });
    } else {
      await prisma.lesson.update({
        where: { id: existingLesson.id },
        data: lessonData,
      });
    }
  }
  console.log("Payment test course seeded:", paidCourse.title);

  console.log("✅ Seed completed");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });