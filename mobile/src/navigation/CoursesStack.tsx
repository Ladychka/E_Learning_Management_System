import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CourseCatalogScreen } from "../screens/CourseCatalogScreen";
import { CourseContentScreen } from "../screens/CourseContentScreen";
import { CourseDetailScreen } from "../screens/CourseDetailScreen";
import { LessonViewerScreen } from "../screens/LessonViewerScreen";
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
    </Stack.Navigator>
  );
}
