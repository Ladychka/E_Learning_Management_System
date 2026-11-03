import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { GradesScreen } from "../screens/GradesScreen";
import { MyCoursesScreen } from "../screens/MyCoursesScreen";
import { CoursesStack } from "./CoursesStack";
import { HomeStack } from "./HomeStack";
import { ProfileStack } from "./ProfileStack";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<
  keyof MainTabParamList,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  Home: { active: "home", inactive: "home-outline" },
  Browse: { active: "compass", inactive: "compass-outline" },
  "My Courses": { active: "school", inactive: "school-outline" },
  Grades: { active: "ribbon", inactive: "ribbon-outline" },
  Profile: { active: "person", inactive: "person-outline" },
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as keyof MainTabParamList];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Browse" component={CoursesStack} />
      <Tab.Screen name="My Courses" component={MyCoursesScreen} />
      <Tab.Screen name="Grades" component={GradesScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
