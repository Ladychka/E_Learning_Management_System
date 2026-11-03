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
import { getMyQuizAttempts, QuizAttempt } from "../api/quizzes";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "QuizHistory">;

type AttemptWithQuiz = QuizAttempt & {
  quiz: { title: string; lessonId: string };
};

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Completed";
    case "timed_out":
      return "Timed out";
    case "in_progress":
      return "In progress";
    default:
      return status;
  }
}

export function QuizHistoryScreen({ navigation, route }: Props) {
  const { quizId } = route.params;
  const [attempts, setAttempts] = useState<AttemptWithQuiz[]>([]);
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
        const data = await getMyQuizAttempts(quizId);
        if (id !== requestId.current) return;
        setAttempts(data as AttemptWithQuiz[]);
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
    [quizId]
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

  const completed = attempts.filter(
    (attempt) => attempt.status === "completed"
  );
  const bestPercentage = completed.reduce<number | null>((best, attempt) => {
    const percentage = toNumber(attempt.percentage);
    if (percentage === null) return best;
    return best === null || percentage > best ? percentage : best;
  }, null);

  const renderAttempt = ({ item }: { item: AttemptWithQuiz }) => {
    const percentage = toNumber(item.percentage);
    const startedAt = formatDate(item.startedAt);
    const submittedAt = formatDate(item.submittedAt);
    const canViewResult =
      item.status === "completed" || item.status === "timed_out";

    return (
      <View
        testID={`quiz-history-attempt-${item.id}`}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.attemptNumber}>
            Attempt {item.attemptNumber}
          </Text>
          <View
            style={[
              styles.statusBadge,
              item.status === "completed"
                ? styles.completedBadge
                : item.status === "timed_out"
                ? styles.timedOutBadge
                : styles.inProgressBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === "completed"
                  ? styles.completedText
                  : item.status === "timed_out"
                  ? styles.timedOutText
                  : styles.inProgressText,
              ]}
            >
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreValue}>
            {percentage === null ? "—" : `${Math.round(percentage)}%`}
          </Text>
          <Text style={styles.scoreDetail}>
            {item.score} / {item.maxScore} points
          </Text>
        </View>

        <Text style={styles.dateText}>
          Started {startedAt ?? "—"}
          {submittedAt ? ` · Submitted ${submittedAt}` : ""}
        </Text>

        {canViewResult ? (
          <Pressable
            testID={`quiz-history-view-${item.id}`}
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("QuizResult", {
                attemptId: item.id,
                title: item.quiz.title,
              })
            }
            style={({ pressed }) => [
              styles.viewButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.viewButtonText}>View result</Text>
          </Pressable>
        ) : (
          <Text style={styles.inProgressNote}>
            This attempt has not been submitted yet.
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          testID="quiz-history-back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Quizzes</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Attempt history</Text>
        <Text testID="quiz-history-title" style={styles.title}>
          {route.params.title ?? "Past attempts"}
        </Text>
        <Text style={styles.subtitle}>
          {attempts.length} attempt{attempts.length === 1 ? "" : "s"}
          {bestPercentage === null
            ? ""
            : ` · Best ${Math.round(bestPercentage)}%`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading attempts...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load attempts</Text>
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
          testID="quiz-history-list"
          data={attempts}
          keyExtractor={(attempt) => attempt.id}
          renderItem={renderAttempt}
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
              <Text style={styles.errorTitle}>No attempts yet</Text>
              <Text style={styles.centerText}>
                Start this quiz to see your attempt history here.
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
  title: { color: "#10233f", fontSize: 24, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#5b677a", fontSize: 13, marginTop: 6 },
  listContent: { padding: 20, paddingTop: 14, gap: 14, flexGrow: 1 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  attemptNumber: { color: "#10233f", fontSize: 15, fontWeight: "800" },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  completedBadge: { backgroundColor: "#ecfdf5" },
  timedOutBadge: { backgroundColor: "#fffbeb" },
  inProgressBadge: { backgroundColor: "#eef2f6" },
  statusText: { fontSize: 10, fontWeight: "800" },
  completedText: { color: "#047857" },
  timedOutText: { color: "#b45309" },
  inProgressText: { color: "#64748b" },
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 12 },
  scoreValue: { color: "#10233f", fontSize: 24, fontWeight: "800" },
  scoreDetail: { color: "#7a8699", fontSize: 12, fontWeight: "600" },
  dateText: { color: "#94a3b8", fontSize: 11, marginTop: 6 },
  viewButton: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingVertical: 10,
    alignItems: "center",
  },
  viewButtonText: { color: "#0f766e", fontSize: 13, fontWeight: "800" },
  inProgressNote: {
    color: "#7a8699",
    fontSize: 11,
    marginTop: 12,
    fontStyle: "italic",
  },
  buttonPressed: { opacity: 0.75 },
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
});
