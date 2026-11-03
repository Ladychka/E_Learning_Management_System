import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { getApiErrorMessage } from "../api/client";
import { getMyEnrollments, MyEnrollment } from "../api/courses";
import { CourseThumbnail } from "../components/CourseThumbnail";
import type { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "My Courses">;

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Completed";
    case "active":
      return "In progress";
    case "expired":
      return "Expired";
    case "dropped":
      return "Dropped";
    default:
      return status;
  }
}

export function MyCoursesScreen({ navigation }: Props) {
  const [enrollments, setEnrollments] = useState<MyEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const requestId = useRef(0);

  const load = useCallback(async (showSpinner: boolean) => {
    const id = ++requestId.current;
    if (showSpinner) setLoading(true);
    setError(null);

    try {
      const result = await getMyEnrollments();
      if (id !== requestId.current) return;
      setEnrollments(result.enrollments);
      hasLoaded.current = true;
    } catch (err) {
      if (id !== requestId.current) return;
      setError(getApiErrorMessage(err));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(!hasLoaded.current);
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const openCourse = (courseId: string, title: string) => {
    navigation.navigate("Browse", {
      screen: "CourseContent",
      params: { courseId, title },
    });
  };

  const browseCourses = () => {
    navigation.navigate("Browse", { screen: "CourseCatalog" });
  };

  const renderEnrollment = ({ item }: { item: MyEnrollment }) => {
    const enrolledAt = formatDate(item.enrolledAt);
    const isCompleted = item.status === "completed";

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.thumbWrap}>
            <CourseThumbnail
              title={item.course.title}
              thumbnailUrl={item.course.thumbnailUrl}
              height={72}
            />
          </View>
          <View style={styles.cardInfo}>
            <View
              style={[
                styles.statusBadge,
                isCompleted
                  ? styles.statusCompleted
                  : item.status === "active"
                  ? styles.statusActive
                  : styles.statusMuted,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isCompleted
                    ? styles.statusCompletedText
                    : item.status === "active"
                    ? styles.statusActiveText
                    : styles.statusMutedText,
                ]}
              >
                {statusLabel(item.status)}
              </Text>
            </View>
            <Text numberOfLines={2} style={styles.courseTitle}>
              {item.course.title}
            </Text>
            {item.course.instructor ? (
              <Text style={styles.instructor}>
                {item.course.instructor.firstName}{" "}
                {item.course.instructor.lastName}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Course progress</Text>
          <Text style={styles.progressValue}>{item.progressPercent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, Math.max(0, item.progressPercent))}%`,
              },
            ]}
          />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.enrolledAt}>
            {enrolledAt ? `Enrolled ${enrolledAt}` : ""}
          </Text>
          <Pressable
            testID={`my-course-open-${item.course.id}`}
            accessibilityRole="button"
            onPress={() => openCourse(item.course.id, item.course.title)}
            style={({ pressed }) => [
              styles.openButton,
              pressed && styles.openButtonPressed,
            ]}
          >
            <Text style={styles.openButtonText}>
              {isCompleted ? "Review course" : "Continue"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Learning</Text>
        <Text style={styles.title}>My courses</Text>
        <Text style={styles.subtitle}>
          Track the courses you're enrolled in and pick up where you left off.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading your courses...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load your courses</Text>
          <Text style={styles.centerText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => load(true)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          testID="my-courses-list"
          data={enrollments}
          keyExtractor={(item) => item.id}
          renderItem={renderEnrollment}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0f766e"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.errorTitle}>No enrollments yet</Text>
              <Text style={styles.centerText}>
                Browse the catalog and enroll in a free course to get started.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={browseCourses}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Browse courses</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: { color: "#10233f", fontSize: 26, fontWeight: "800", marginTop: 6 },
  subtitle: {
    color: "#5b677a",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  listContent: { padding: 20, paddingTop: 12, gap: 14, flexGrow: 1 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  cardTop: { flexDirection: "row", gap: 12 },
  thumbWrap: {
    width: 96,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardInfo: { flex: 1 },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 6,
  },
  statusActive: { backgroundColor: "#e6f4f1" },
  statusCompleted: { backgroundColor: "#ecfdf5" },
  statusMuted: { backgroundColor: "#eef2f6" },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  statusActiveText: { color: "#0f766e" },
  statusCompletedText: { color: "#047857" },
  statusMutedText: { color: "#64748b" },
  courseTitle: {
    color: "#10233f",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  instructor: { color: "#7a8699", fontSize: 12, marginTop: 4 },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  progressLabel: { color: "#7a8699", fontSize: 11, fontWeight: "700" },
  progressValue: { color: "#0f766e", fontSize: 12, fontWeight: "800" },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#eef2f6",
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#0f766e",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  enrolledAt: { color: "#94a3b8", fontSize: 11 },
  openButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  openButtonPressed: { opacity: 0.8 },
  openButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 10,
  },
  centerText: {
    color: "#5b677a",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  errorTitle: { color: "#10233f", fontSize: 17, fontWeight: "800" },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonPressed: { opacity: 0.8 },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
});
