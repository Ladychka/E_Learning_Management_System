import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GradesScreen } from "../screens/GradesScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MyCoursesScreen } from "../screens/MyCoursesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { CoursesStack } from "./CoursesStack";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0f766e",
        tabBarInactiveTintColor: "#7a8699",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e3e8f0",
          height: 70,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Browse" component={CoursesStack} />
      <Tab.Screen name="My Courses" component={MyCoursesScreen} />
      <Tab.Screen name="Grades" component={GradesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
