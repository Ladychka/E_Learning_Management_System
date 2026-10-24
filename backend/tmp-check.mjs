import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const mods = await prisma.module.findMany({
    where: { courseId: "f51958e9-4787-4336-b47d-095723a3349d" },
    select: { id: true, title: true, isPublished: true, sortOrder: true },
  });
  console.log(JSON.stringify(mods, null, 2));
  const lessons = await prisma.lesson.findMany({
    where: { moduleId: { in: mods.map(m => m.id) } },
    select: { id: true, title: true, moduleId: true, isPublished: true, contentType: true, contentUrl: true },
  });
  console.log("LESSONS:", JSON.stringify(lessons, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
