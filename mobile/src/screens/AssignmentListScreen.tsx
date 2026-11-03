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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApiErrorMessage } from "../api/client";
import {
  AssignmentSummary,
  getAssignments,
} from "../api/assignments";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "AssignmentList">;

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function isPastDue(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function statusFor(assignment: AssignmentSummary) {
  const grade = assignment.grade ?? assignment.submission?.grade;
  if (grade) return { label: "Graded", tone: "graded" as const };
  if (assignment.submission?.isLate) return { label: "Late", tone: "late" as const };
  if (assignment.submission) {
    return { label: "Submitted", tone: "submitted" as const };
  }
  return { label: "Not submitted", tone: "missing" as const };
}

export function AssignmentListScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const requestId = useRef(0);

  const load = useCallback(
    async (showSpinner: boolean) => {
      const id = ++requestId.current;
      if (showSpinner) setLoading(true);
      setError(null);

      try {
        const data = await getAssignments(courseId);
        if (id !== requestId.current) return;
        setAssignments(data);
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
    },
    [courseId]
  );

  useFocusEffect(
    useCallback(() => {
      load(!hasLoaded.current);
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const renderAssignment = ({ item }: { item: AssignmentSummary }) => {
    const status = statusFor(item);
    const dueDate = formatDate(item.dueDate);
    const submittedAt = formatDate(item.submission?.submittedAt);
    const grade = item.grade ?? item.submission?.grade ?? null;
    const overdue = !item.submission && isPastDue(item.dueDate);

    return (
      <Pressable
        testID={`assignment-card-${item.id}`}
        accessibilityRole="button"
        onPress={() =>
          navigation.navigate("AssignmentDetail", {
            assignmentId: item.id,
            title: item.title,
          })
        }
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.courseName}>{item.course.title}</Text>
          <View
            testID={`assignment-status-${item.id}`}
            style={[
              styles.statusBadge,
              status.tone === "graded"
                ? styles.gradedBadge
                : status.tone === "late"
                ? styles.lateBadge
                : status.tone === "submitted"
                ? styles.submittedBadge
                : styles.missingBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                status.tone === "graded"
                  ? styles.gradedText
                  : status.tone === "late"
                  ? styles.lateText
                  : status.tone === "submitted"
                  ? styles.submittedText
                  : styles.missingText,
              ]}
            >
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Max {item.maxPoints} pts</Text>
          {dueDate ? (
            <Text style={[styles.metaText, overdue && styles.overdueText]}>
              {overdue ? "Overdue · " : "Due "}
              {dueDate}
            </Text>
          ) : (
            <Text style={styles.metaText}>No due date</Text>
          )}
        </View>

        {item.submission ? (
          <Text style={styles.submissionText}>
            Submitted {submittedAt ?? "recently"}
            {item.submission.isLate ? " · Late" : ""}
          </Text>
        ) : null}

        {grade ? (
          <Text style={styles.gradeText}>
            Grade: {Number(grade.percentage).toFixed(0)}%
            {grade.letterGrade ? ` · ${grade.letterGrade}` : ""}
          </Text>
        ) : null}

        <Text style={styles.openLink}>Open assignment ›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          testID="assignment-list-back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Coursework</Text>
        <Text testID="assignment-list-title" style={styles.headerTitle}>
          Assignments
        </Text>
        <Text style={styles.subtitle}>
          {route.params.title ? `${route.params.title} · ` : ""}
          Submit work, track deadlines, and review instructor feedback.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading assignments...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load assignments</Text>
          <Text style={styles.centerText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => load(true)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          testID="assignment-list"
          data={assignments}
          keyExtractor={(assignment) => assignment.id}
          renderItem={renderAssignment}
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
              <Text style={styles.errorTitle}>No assignments yet</Text>
              <Text style={styles.centerText}>
                This course does not have any published assignments.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  header: { paddingHorizontal: 20, paddingTop: 8 },
  backButton: { alignSelf: "flex-start", paddingVertical: 4 },
  backButtonText: { color: "#0f766e", fontSize: 14, fontWeight: "800" },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 6,
  },
  headerTitle: {
    color: "#10233f",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    color: "#5b677a",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  listContent: { padding: 20, paddingTop: 14, gap: 14, flexGrow: 1 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  cardPressed: { opacity: 0.75 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  courseName: {
    flex: 1,
    color: "#0f766e",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  gradedBadge: { backgroundColor: "#ecfdf5" },
  lateBadge: { backgroundColor: "#fffbeb" },
  submittedBadge: { backgroundColor: "#eef2ff" },
  missingBadge: { backgroundColor: "#eef2f6" },
  statusText: { fontSize: 10, fontWeight: "800" },
  gradedText: { color: "#047857" },
  lateText: { color: "#b45309" },
  submittedText: { color: "#3730a3" },
  missingText: { color: "#64748b" },
  cardTitle: {
    color: "#10233f",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  metaText: { color: "#7a8699", fontSize: 11, fontWeight: "600" },
  overdueText: { color: "#b42318" },
  submissionText: { color: "#5b677a", fontSize: 11, marginTop: 8 },
  gradeText: { color: "#047857", fontSize: 12, fontWeight: "800", marginTop: 8 },
  openLink: { color: "#0f766e", fontSize: 12, fontWeight: "800", marginTop: 12 },
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
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  buttonPressed: { opacity: 0.75 },
});
