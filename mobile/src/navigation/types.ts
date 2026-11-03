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
};

export type MainTabParamList = {
  Home: undefined;
  Browse: NavigatorScreenParams<CoursesStackParamList> | undefined;
  "My Courses": undefined;
  Profile: undefined;
};
