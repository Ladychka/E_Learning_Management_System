import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AssignmentDetailScreen } from "../screens/AssignmentDetailScreen";
import { AssignmentListScreen } from "../screens/AssignmentListScreen";
import { AssignmentSubmitScreen } from "../screens/AssignmentSubmitScreen";
import { CheckoutScreen } from "../screens/CheckoutScreen";
import { CourseCatalogScreen } from "../screens/CourseCatalogScreen";
import { CourseContentScreen } from "../screens/CourseContentScreen";
import { CourseDetailScreen } from "../screens/CourseDetailScreen";
import { LessonViewerScreen } from "../screens/LessonViewerScreen";
import { QuizHistoryScreen } from "../screens/QuizHistoryScreen";
import { QuizListScreen } from "../screens/QuizListScreen";
import { QuizResultScreen } from "../screens/QuizResultScreen";
import { QuizTakeScreen } from "../screens/QuizTakeScreen";
import type { CoursesStackParamList } from "./types";

const Stack = createNativeStackNavigator<CoursesStackParamList>();

export function CoursesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#f5f7fb" },
      }}
    >
      <Stack.Screen name="CourseCatalog" component={CourseCatalogScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="CourseContent" component={CourseContentScreen} />
      <Stack.Screen name="LessonViewer" component={LessonViewerScreen} />
      <Stack.Screen name="QuizList" component={QuizListScreen} />
      <Stack.Screen name="QuizTake" component={QuizTakeScreen} />
      <Stack.Screen name="QuizResult" component={QuizResultScreen} />
      <Stack.Screen name="QuizHistory" component={QuizHistoryScreen} />
      <Stack.Screen name="AssignmentList" component={AssignmentListScreen} />
      <Stack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} />
      <Stack.Screen name="AssignmentSubmit" component={AssignmentSubmitScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
    </Stack.Navigator>
  );
}
