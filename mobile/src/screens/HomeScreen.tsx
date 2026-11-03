import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useAuth } from "../auth/AuthContext";
import type { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Dashboard</Text>
        <Text testID="home-title" style={styles.title}>
          Welcome back, {user?.firstName ?? "Student"}
        </Text>
        <Text style={styles.body}>
          Explore the course catalog, enroll in free courses, and pick up where
          you left off from My Courses.
        </Text>

        <Pressable
          testID="browse-courses-button"
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate("Browse", { screen: "CourseCatalog" })
          }
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Browse courses</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("My Courses")}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>View my courses</Text>
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
