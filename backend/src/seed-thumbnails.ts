import { prisma } from "./lib/prisma";

async function seedThumbnails() {
  // Map by slug
  const bySlug = [
    { slug: "data-science-for-beginners", url: "/uploads/thumbnails/data-science-for-beginners.svg" },
    { slug: "finance-program", url: "/uploads/thumbnails/finance-program.svg" },
    { slug: "personal-finance-mastery", url: "/uploads/thumbnails/personal-finance-mastery.svg" },
    { slug: "intro-to-web-development", url: "/uploads/thumbnails/intro-to-web-development.svg" },
    { slug: "intro-to-stock-trading", url: "/uploads/thumbnails/intro-to-stock-trading.svg" },
  ];

  for (const m of bySlug) {
    const course = await prisma.course.findUnique({ where: { slug: m.slug } });
    if (course) {
      await prisma.course.update({
        where: { id: course.id },
        data: { thumbnailUrl: m.url },
      });
      console.log(`✅ Updated thumbnail for: ${course.title} (${m.slug})`);
    } else {
      console.log(`⚠️ Course not found: ${m.slug}`);
    }
  }

  // Also update the duplicate published Personal Finance by ID
  try {
    await prisma.course.update({
      where: { id: "4e15e5a3-067b-48c8-bf6d-36203c5c1680" },
      data: { thumbnailUrl: "/uploads/thumbnails/personal-finance-mastery.svg" },
    });
    console.log(`✅ Updated thumbnail for: Personal Finance Mastery (published duplicate)`);
  } catch {
    console.log(`⚠️ Could not update duplicate Personal Finance`);
  }

  console.log("Done!");
}

seedThumbnails()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
