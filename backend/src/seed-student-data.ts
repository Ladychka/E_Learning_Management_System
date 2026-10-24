import { prisma } from "./lib/prisma";

async function seedStudentData() {
  console.log("🌱 Creating realistic student learning data...");

  const student = await prisma.user.findUnique({ where: { email: "student@elms.edu" } });
  if (!student) {
    console.error("No student user found (student@elms.edu). Please run npm run db:seed first.");
    process.exit(1);
  }
  const STUDENT_ID = student.id;

  // ─── 1. ENROLLMENTS ───
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, isFree: true, price: true },
  });

  const enrollments = [];
  for (const course of courses) {
    const enrolledAt = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)); // 0-30 days ago
    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: STUDENT_ID, courseId: course.id } },
      update: {},
      create: {
        userId: STUDENT_ID,
        courseId: course.id,
        status: "active",
        progressPercent: Math.floor(Math.random() * 100),
        enrolledAt,
        enrolledBy: STUDENT_ID,
      },
    });
    enrollments.push({ ...enrollment, courseTitle: course.title });
    console.log(`✅ Enrolled in: ${course.title}`);
  }

  // ─── 2. QUIZ ATTEMPTS ───
  const quizzes = await prisma.quiz.findMany({
    where: { isPublished: true },
    include: {
      questions: true,
      lesson: { select: { id: true, title: true } },
    },
  });

  const quizAttempts = [];
  for (const quiz of quizzes) {
    if (quiz.questions.length === 0) continue;

    const attemptsCount = Math.floor(Math.random() * 2) + 1; // 1-2 attempts
    for (let i = 0; i < attemptsCount; i++) {
      const score = Math.floor(Math.random() * 40) + 60; // 60-100%
      const maxScore = quiz.questions.reduce((s, q) => s + q.points, 0);
      const earnedScore = Math.floor((score / 100) * maxScore);

      const attempt = await prisma.quizAttempt.create({
        data: {
          quizId: quiz.id,
          userId: STUDENT_ID,
          startedAt: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000),
          submittedAt: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
          score: earnedScore,
          maxScore,
          percentage: score,
          status: "completed",
          attemptNumber: i + 1,
          answers: {
            create: quiz.questions.map((q) => {
              const isCorrect = Math.random() > 0.3; // 70% chance correct
              return {
                questionId: q.id,
                answer: isCorrect ? q.correctAnswer || "True" : "Wrong Answer",
                isCorrect,
                pointsEarned: isCorrect ? q.points : 0,
              };
            }),
          },
        },
      });
      quizAttempts.push({ ...attempt, quizTitle: quiz.title });
      console.log(`✅ Quiz attempt: ${quiz.title} — ${score}%`);
    }
  }

  // ─── 3. GRADES ───
  // Create grades for quiz attempts
  for (const attempt of quizAttempts) {
    const quiz = quizzes.find((q) => q.id === attempt.quizId);
    if (!quiz) continue;

    const course = await prisma.course.findFirst({
      where: { modules: { some: { lessons: { some: { id: quiz.lessonId } } } } },
    });
    if (!course) continue;

    const percentage = Number(attempt.percentage || 0);
    const letterGrade = percentage >= 90 ? "A" : percentage >= 80 ? "B" : percentage >= 70 ? "C" : percentage >= 60 ? "D" : "F";

    await prisma.grade.upsert({
      where: {
        // We need a unique constraint; since we don't have one for grade by quiz, we'll use updateMany pattern
        // Actually let's just create it if it doesn't exist
        id: `grade-${attempt.id}`,
      },
      update: {},
      create: {
        id: `grade-${attempt.id}`,
        studentId: STUDENT_ID,
        courseId: course.id,
        quizId: quiz.id,
        points: attempt.score,
        maxPoints: attempt.maxScore,
        percentage,
        letterGrade,
        passFail: percentage >= 60 ? "pass" : "fail",
        feedback: percentage >= 80
          ? "Excellent work! You demonstrated strong understanding of the material."
          : percentage >= 60
          ? "Good effort. Review the topics you missed and try again."
          : "Please review the course materials before retaking the quiz.",
        isPublished: true,
        publishedAt: new Date(),
      },
    });
    console.log(`✅ Grade: ${course.title} — ${letterGrade} (${percentage}%)`);
  }

  // ─── 4. ASSIGNMENTS & SUBMISSIONS ───
  const assignments = await prisma.assignment.findMany({
    where: { isPublished: true },
    select: { id: true, title: true, courseId: true, maxPoints: true },
  });

  for (const assignment of assignments) {
    const score = Math.floor(Math.random() * 40) + 60;
    await prisma.submission.upsert({
      where: {
        // Use a composite check via findFirst since there's no unique constraint
        id: `sub-${STUDENT_ID}-${assignment.id}`,
      },
      update: {},
      create: {
        id: `sub-${STUDENT_ID}-${assignment.id}`,
        assignmentId: assignment.id,
        studentId: STUDENT_ID,
        content: "Here is my submission for this assignment. I have completed all the required tasks and included my analysis.",
        fileUrls: [],
        submittedAt: new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)),
        isLate: Math.random() > 0.8,
      },
    });

    // Create grade for assignment
    const percentage = score;
    const letterGrade = percentage >= 90 ? "A" : percentage >= 80 ? "B" : percentage >= 70 ? "C" : percentage >= 60 ? "D" : "F";
    await prisma.grade.create({
      data: {
        studentId: STUDENT_ID,
        courseId: assignment.courseId,
        assignmentId: assignment.id,
        points: Math.floor((score / 100) * assignment.maxPoints),
        maxPoints: assignment.maxPoints,
        percentage,
        letterGrade,
        passFail: percentage >= 60 ? "pass" : "fail",
        feedback: "Well done on your submission. Keep up the good work!",
        isPublished: true,
        publishedAt: new Date(),
      },
    });
    console.log(`✅ Assignment submitted: ${assignment.title} — ${letterGrade}`);
  }

  // ─── 5. PAYMENTS ───
  const paidCourse = courses.find((c) => !c.isFree && c.price && Number(c.price) > 0);
  if (paidCourse) {
    await prisma.payment.create({
      data: {
        userId: STUDENT_ID,
        courseId: paidCourse.id,
        amount: Number(paidCourse.price),
        currency: "USD",
        status: "completed",
        gateway: "aba_payway",
        gatewayRef: `ABA-${Date.now()}`,
        paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✅ Payment: ${paidCourse.title} — $${paidCourse.price}`);
  }

  // ─── 6. NOTIFICATIONS ───
  const notificationTypes = [
    { type: "ENROLLMENT_APPROVED", title: "Welcome to the course!", message: "You have been successfully enrolled in the course." },
    { type: "GRADE_PUBLISHED", title: "New grade available", message: "Your quiz has been graded. Check your grades page." },
    { type: "ASSIGNMENT_GRADED", title: "Assignment graded", message: "Your submission has been reviewed and graded." },
    { type: "COURSE_UPDATE", title: "New content available", message: "A new module has been added to your course." },
    { type: "PAYMENT_CONFIRMED", title: "Payment confirmed", message: "Your payment has been received and confirmed." },
  ];

  for (const notif of notificationTypes) {
    await prisma.notification.create({
      data: {
        userId: STUDENT_ID,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: Math.random() > 0.5,
      },
    });
    console.log(`✅ Notification: ${notif.title}`);
  }

  // ─── 7. CERTIFICATES ───
  const completedCourse = courses.find((c) => c.isFree);
  const enrollment = enrollments.find((e) => e.courseId === completedCourse?.id);
  if (completedCourse && enrollment) {
    await prisma.certificate.create({
      data: {
        userId: STUDENT_ID,
        courseId: completedCourse.id,
        enrollmentId: enrollment.id,
        certificateNumber: `CERT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        issuedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✅ Certificate issued for: ${completedCourse.title}`);
  }

  // ─── 8. COMMENTS ───
  const lessons = await prisma.lesson.findMany({
    where: { isPublished: true },
    take: 3,
    select: { id: true, title: true },
  });

  for (const lesson of lessons) {
    await prisma.comment.create({
      data: {
        userId: STUDENT_ID,
        lessonId: lesson.id,
        content: `Great lesson on ${lesson.title}! The explanations were very clear and helpful.`,
      },
    });
    console.log(`✅ Comment on: ${lesson.title}`);
  }

  console.log("\n🎉 All student data seeded successfully!");
  console.log("\n📊 Summary:");
  console.log(`   • Enrollments: ${courses.length}`);
  console.log(`   • Quiz Attempts: ${quizAttempts.length}`);
  console.log(`   • Assignments Submitted: ${assignments.length}`);
  console.log(`   • Notifications: ${notificationTypes.length}`);
  console.log("\n👉 Log in as student@elms.edu / Student123!");
  console.log("   Dashboard: http://localhost:5175/");
}

seedStudentData()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
