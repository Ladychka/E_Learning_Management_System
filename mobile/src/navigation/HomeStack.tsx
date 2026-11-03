import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AnnouncementsScreen } from "../screens/AnnouncementsScreen";
import { FinanceToolsScreen } from "../screens/FinanceToolsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import type { HomeStackParamList } from "./types";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#f5f7fb" },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="FinanceTools" component={FinanceToolsScreen} />
    </Stack.Navigator>
  );
}
