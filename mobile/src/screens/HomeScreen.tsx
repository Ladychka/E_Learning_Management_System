import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getUnreadNotificationCount } from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import type { HomeStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await getUnreadNotificationCount());
    } catch {
      // Keep the last known count when the badge check fails.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );

  const openTab = (tab: string, params?: Record<string, unknown>) => {
    (navigation.getParent() as any)?.navigate(tab, params);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Dashboard</Text>
            <Text testID="home-title" style={styles.title}>
              Welcome back, {user?.firstName ?? "Student"}
            </Text>
          </View>
          <Pressable
            testID="home-notifications-button"
            accessibilityRole="button"
            accessibilityLabel={`Notifications${
              unreadCount > 0 ? `, ${unreadCount} unread` : ""
            }`}
            onPress={() => navigation.navigate("Notifications")}
            style={({ pressed }) => [
              styles.bellButton,
              pressed && styles.bellButtonPressed,
            ]}
          >
            <Ionicons name="notifications-outline" size={22} color="#0f766e" />
            {unreadCount > 0 ? (
              <View testID="home-unread-badge" style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <Text style={styles.body}>
          Explore the course catalog, enroll in free courses, and pick up where
          you left off from My Courses.
        </Text>

        <Pressable
          testID="browse-courses-button"
          accessibilityRole="button"
          onPress={() => openTab("Browse", { screen: "CourseCatalog" })}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Browse courses</Text>
        </Pressable>

        <Pressable
          testID="home-my-courses-button"
          accessibilityRole="button"
          onPress={() => openTab("My Courses")}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>View my courses</Text>
        </Pressable>

        <Pressable
          testID="home-announcements-button"
          accessibilityRole="button"
          onPress={() => navigation.navigate("Announcements")}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Announcements</Text>
        </Pressable>

        <Pressable
          testID="home-finance-tools-button"
          accessibilityRole="button"
          onPress={() => navigation.navigate("FinanceTools")}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Savings calculator</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session active</Text>
          <Text style={styles.cardBody}>
            Signed in as {user?.email ?? "student"} with the{" "}
            {user?.role?.toLowerCase() ?? "student"} role.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { flex: 1, padding: 24 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: { flex: 1 },
  eyebrow: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#10233f",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e3e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  bellButtonPressed: { opacity: 0.7 },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#f5f7fb",
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
  },
  body: {
    color: "#5b677a",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
  },
  primaryButton: {
    marginTop: 22,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonPressed: { opacity: 0.8 },
  primaryButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryButtonPressed: { opacity: 0.7 },
  secondaryButtonText: { color: "#0f766e", fontSize: 15, fontWeight: "800" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#e3e8f0",
  },
  cardTitle: { color: "#10233f", fontSize: 16, fontWeight: "700" },
  cardBody: { color: "#5b677a", fontSize: 14, lineHeight: 21, marginTop: 8 },
});
