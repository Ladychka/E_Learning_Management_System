import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("../../api/courses", () => ({
  getCategories: jest.fn(),
  getCourses: jest.fn(),
  getCourse: jest.fn(),
  getMyEnrollments: jest.fn(),
  selfEnroll: jest.fn(),
  hasActiveEnrollment: (
    enrollments: { courseId: string; status: string }[],
    courseId?: string
  ) =>
    Boolean(
      courseId &&
        enrollments.some(
          (enrollment) =>
            enrollment.courseId === courseId &&
            (enrollment.status === "active" ||
              enrollment.status === "completed")
        )
    ),
}));

jest.mock("../../api/payments", () => ({
  createCourseCheckout: jest.fn(),
}));

jest.mock("../../api/lessons", () => ({
  getLesson: jest.fn(),
  completeLesson: jest.fn(),
}));

jest.mock("../../api/comments", () => ({
  getLessonComments: jest.fn().mockResolvedValue([]),
  createLessonComment: jest.fn(),
  deleteLessonComment: jest.fn(),
}));

jest.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "student-1",
      email: "student@elms.edu",
      firstName: "Sokha",
      lastName: "Student",
      role: "STUDENT",
    },
  }),
}));

import { CourseCatalogScreen } from "../CourseCatalogScreen";
import { CourseDetailScreen } from "../CourseDetailScreen";
import { LessonViewerScreen } from "../LessonViewerScreen";
import {
  getCategories,
  getCourse,
  getCourses,
  getMyEnrollments,
  selfEnroll,
} from "../../api/courses";
import { createCourseCheckout } from "../../api/payments";
import { completeLesson, getLesson } from "../../api/lessons";

const instructor = { id: "instructor-1", firstName: "Rina", lastName: "Sok" };

const freeCourse = {
  id: "course-free",
  title: "Digital Finance Basics",
  slug: "digital-finance-basics",
  description: "Learn the foundations of digital finance.",
  shortDesc: "Digital finance foundations.",
  isFree: true,
  price: 0,
  currency: "USD",
  level: "BEGINNER",
  duration: 60,
  status: "PUBLISHED",
  instructor,
  category: { id: "cat-1", name: "FinTech", slug: "fintech" },
  _count: { enrollments: 12, modules: 1 },
  modules: [],
};

const paidCourse = {
  ...freeCourse,
  id: "course-paid",
  title: "Crypto Trading",
  slug: "crypto-trading",
  isFree: false,
  price: 39.99,
};

const lesson = {
  id: "lesson-1",
  moduleId: "module-1",
  title: "What is digital finance?",
  description: "A short reading lesson.",
  contentType: "text",
  isPublished: true,
  isPreview: false,
  isCompleted: false,
  module: {
    id: "module-1",
    title: "Foundations",
    isPublished: true,
    course: {
      id: freeCourse.id,
      title: freeCourse.title,
      modules: [
        {
          id: "module-1",
          title: "Foundations",
          isPublished: true,
          lessons: [
            {
              id: "lesson-1",
              title: "What is digital finance?",
              isPublished: true,
              isPreview: false,
              contentType: "text",
            },
            {
              id: "lesson-2",
              title: "Payments",
              isPublished: true,
              isPreview: false,
              contentType: "text",
            },
          ],
        },
      ],
    },
  },
  courseProgress: {
    completedLessons: 1,
    totalLessons: 2,
    progressPercent: 50,
  },
};

function makeNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    popToTop: jest.fn(),
    getParent: jest.fn(() => ({ navigate: jest.fn() })),
  } as any;
}

describe("course and lesson flows", () => {
  beforeEach(() => {
    (getCategories as jest.Mock).mockResolvedValue([]);
    (getCourses as jest.Mock).mockResolvedValue({
      courses: [freeCourse],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    (getMyEnrollments as jest.Mock).mockResolvedValue({
      enrollments: [],
      meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
  });

  it("browses the catalog and opens a course", async () => {
    const navigation = makeNavigation();
    await render(
      <CourseCatalogScreen
        navigation={navigation}
        route={{ key: "catalog", name: "CourseCatalog" } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("course-card-digital-finance-basics")).toBeTruthy()
    );

    await fireEvent.press(screen.getByTestId("course-card-digital-finance-basics"));

    expect(navigation.navigate).toHaveBeenCalledWith("CourseDetail", {
      courseId: freeCourse.id,
      title: freeCourse.title,
    });
  });

  it("enrolls in a free course and shows the enrolled state", async () => {
    const navigation = makeNavigation();
    (getCourse as jest.Mock).mockResolvedValue(freeCourse);
    (selfEnroll as jest.Mock).mockResolvedValue({
      id: "enrollment-1",
      courseId: freeCourse.id,
      status: "active",
      progressPercent: 0,
      enrolledAt: new Date().toISOString(),
    });

    await render(
      <CourseDetailScreen
        navigation={navigation}
        route={{ key: "detail", name: "CourseDetail", params: { courseId: freeCourse.id } } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("course-detail-title")).toHaveTextContent(
        freeCourse.title
      )
    );

    await fireEvent.press(screen.getByTestId("enroll-button"));

    await waitFor(() =>
      expect(screen.getByTestId("enrollment-status")).toHaveTextContent(/You're enrolled/)
    );
    expect(selfEnroll).toHaveBeenCalledWith(freeCourse.id);
  });

  it("creates a paid checkout and navigates to the payment screen", async () => {
    const navigation = makeNavigation();
    (getCourse as jest.Mock).mockResolvedValue(paidCourse);
    (createCourseCheckout as jest.Mock).mockResolvedValue({
      payment: {
        id: "payment-1",
        amount: "39.99",
        currency: "USD",
        gateway: "khqr",
      },
      checkout: { expiresInSeconds: 300 },
    });

    await render(
      <CourseDetailScreen
        navigation={navigation}
        route={{ key: "detail", name: "CourseDetail", params: { courseId: paidCourse.id } } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("buy-course-button")).toBeTruthy()
    );

    await fireEvent.press(screen.getByTestId("buy-course-button"));

    await waitFor(() =>
      expect(createCourseCheckout).toHaveBeenCalledWith(paidCourse.id, "khqr")
    );
    expect(navigation.navigate).toHaveBeenCalledWith("Checkout", {
      paymentId: "payment-1",
      courseId: paidCourse.id,
      courseTitle: paidCourse.title,
      amount: 39.99,
      currency: "USD",
      gateway: "khqr",
      expiresInSeconds: 300,
    });
  });

  it("opens a lesson, marks it complete, and updates progress", async () => {
    const navigation = makeNavigation();
    (getLesson as jest.Mock).mockResolvedValue(lesson);
    (completeLesson as jest.Mock).mockResolvedValue({
      lessonId: lesson.id,
      isCompleted: true,
      completedLessons: 2,
      totalLessons: 2,
      progressPercent: 100,
    });

    await render(
      <LessonViewerScreen
        navigation={navigation}
        route={{ key: "lesson", name: "LessonViewer", params: { lessonId: lesson.id } } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("lesson-viewer-title")).toHaveTextContent(
        lesson.title
      )
    );

    await fireEvent.press(screen.getByTestId("lesson-complete-button"));

    await waitFor(() =>
      expect(screen.getByTestId("lesson-completed-status")).toBeTruthy()
    );
    expect(completeLesson).toHaveBeenCalledWith(lesson.id);
    expect(screen.getByTestId("lesson-progress-value")).toHaveTextContent(/2 of 2/);
  });
});
