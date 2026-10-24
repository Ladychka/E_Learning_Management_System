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