import type { NavigatorScreenParams } from "@react-navigation/native";

export type CoursesStackParamList = {
  CourseCatalog: undefined;
  CourseDetail: { courseId: string; title?: string };
  CourseContent: { courseId: string; title?: string };
  LessonViewer: { lessonId: string; courseId?: string; title?: string };
  QuizList: { courseId: string; title?: string };
  QuizTake: { quizId: string; lessonId: string; title?: string };
  QuizResult: { attemptId: string; title?: string };
  QuizHistory: { quizId: string; title?: string };
  AssignmentList: { courseId: string; title?: string };
  AssignmentDetail: { assignmentId: string; title?: string };
  AssignmentSubmit: { assignmentId: string; title?: string };
  Checkout: {
    paymentId: string;
    courseId: string;
    courseTitle?: string;
    amount?: number;
    currency?: string;
    gateway?: string;
    expiresInSeconds?: number;
  };
  PaymentDetail: { paymentId: string; title?: string };
};

export type HomeStackParamList = {
  Home: undefined;
  Notifications: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
};

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Browse: NavigatorScreenParams<CoursesStackParamList> | undefined;
  "My Courses": undefined;
  Grades: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
