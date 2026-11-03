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
import { CourseQuiz, getCourseQuizzes } from "../api/quizzes";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "QuizList">;

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

function attemptLabel(status?: string) {
  switch (status) {
    case "completed":
      return "Completed";
    case "timed_out":
      return "Timed out";
    case "in_progress":
      return "In progress";
    default:
      return status ?? "";
  }
}

export function QuizListScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const [quizzes, setQuizzes] = useState<CourseQuiz[]>([]);
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
        const data = await getCourseQuizzes(courseId);
        if (id !== requestId.current) return;
        setQuizzes(data);
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

  const renderQuiz = ({ item }: { item: CourseQuiz }) => {
    const best = toNumber(item.bestPercentage);
    const lastPercentage = toNumber(item.lastAttempt?.percentage);
    const noAttemptsLeft =
      item.remainingAttempts !== null && item.remainingAttempts <= 0;
    const disabled = noAttemptsLeft || item.questionCount === 0;
    const lastAttemptDate = formatDate(item.lastAttempt?.submittedAt);

    return (
      <View testID={`quiz-card-${item.id}`} style={styles.card}>
        <Text style={styles.moduleName}>
          {item.lesson.moduleTitle} · {item.lesson.title}
        </Text>
        <Text style={styles.quizTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statText}>
              {item.questionCount} question{item.questionCount === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statText}>
              {item.timeLimit ? `${item.timeLimit} min` : "No time limit"}
            </Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statText}>
              {item.remainingAttempts === null
                ? "Unlimited attempts"
                : `${item.remainingAttempts} of ${
                    item.maxAttempts ?? 0
                  } attempts left`}
            </Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>
            Best score: {best === null ? "—" : `${Math.round(best)}%`}
          </Text>
          {item.lastAttempt ? (
            <Text style={styles.scoreText}>
              Last: {attemptLabel(item.lastAttempt.status)}
              {lastPercentage === null
                ? ""
                : ` · ${Math.round(lastPercentage)}%`}
              {lastAttemptDate ? ` · ${lastAttemptDate}` : ""}
            </Text>
          ) : (
            <Text style={styles.scoreText}>No attempts yet</Text>
          )}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            testID={`quiz-start-${item.id}`}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() =>
              navigation.navigate("QuizTake", {
                quizId: item.id,
                lessonId: item.lessonId,
                title: item.title,
              })
            }
            style={({ pressed }) => [
              styles.startButton,
              (pressed || disabled) && styles.buttonPressed,
              disabled && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.startButtonText}>
              {item.questionCount === 0
                ? "No questions yet"
                : noAttemptsLeft
                ? "No attempts left"
                : item.completedAttempts > 0
                ? "Retake quiz"
                : "Start quiz"}
            </Text>
          </Pressable>

          <Pressable
            testID={`quiz-history-${item.id}`}
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("QuizHistory", {
                quizId: item.id,
                title: item.title,
              })
            }
            style={({ pressed }) => [
              styles.historyButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.historyButtonText}>History</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          testID="quiz-list-back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Assessments</Text>
        <Text testID="quiz-list-title" style={styles.title}>
          Quizzes
        </Text>
        <Text style={styles.subtitle}>
          {route.params.title ? `${route.params.title} · ` : ""}
          Review available quizzes, attempt limits, and your past results.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading quizzes...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load quizzes</Text>
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
          testID="quiz-list"
          data={quizzes}
          keyExtractor={(quiz) => quiz.id}
          renderItem={renderQuiz}
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
              <Text style={styles.errorTitle}>No quizzes yet</Text>
              <Text style={styles.centerText}>
                This course does not have any published quizzes.
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
  title: {
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
  moduleName: {
    color: "#0f766e",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  quizTitle: {
    color: "#10233f",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 6,
  },
  description: {
    color: "#5b677a",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },
  statPill: {
    backgroundColor: "#eef2f6",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statText: { color: "#5b677a", fontSize: 10, fontWeight: "700" },
  scoreRow: { marginTop: 12, gap: 4 },
  scoreText: { color: "#7a8699", fontSize: 11, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  startButton: {
    flex: 1,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  startButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  historyButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingVertical: 12,
    alignItems: "center",
  },
  historyButtonText: { color: "#0f766e", fontSize: 13, fontWeight: "800" },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { backgroundColor: "#cbd5e1" },
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
