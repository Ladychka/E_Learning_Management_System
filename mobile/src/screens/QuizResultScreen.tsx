import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApiErrorMessage } from "../api/client";
import { getQuizResults, QuizResult } from "../api/quizzes";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "QuizResult">;

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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
      return "Submitted";
    case "timed_out":
      return "Timed out";
    case "in_progress":
      return "In progress";
    default:
      return status;
  }
}

function answerStatus(
  isCorrect: boolean | null,
  type: string
): { label: string; tone: "correct" | "incorrect" | "pending" } {
  if (isCorrect === true) return { label: "Correct", tone: "correct" };
  if (isCorrect === false) return { label: "Incorrect", tone: "incorrect" };
  if (type === "SHORT_ANSWER") {
    return { label: "Pending manual grading", tone: "pending" };
  }
  return { label: "Not graded", tone: "pending" };
}

export function QuizResultScreen({ navigation, route }: Props) {
  const { attemptId } = route.params;
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQuizResults(attemptId);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !result) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load results</Text>
          <Text style={styles.centerText}>
            {error ?? "The attempt could not be found."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={load}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.textButton}
          >
            <Text style={styles.textButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const percentage = toNumber(result.percentage);
  const passingScore = result.quiz.passingScore ?? 0;
  const passed =
    result.status === "completed" && percentage >= passingScore;
  const correctCount = result.answers.filter(
    (answer) => answer.isCorrect === true
  ).length;
  const incorrectCount = result.answers.filter(
    (answer) => answer.isCorrect === false
  ).length;
  const pendingCount = result.answers.filter(
    (answer) => answer.isCorrect === null
  ).length;
  const submittedAt = formatDate(result.submittedAt);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          testID="quiz-result-back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.eyebrow}>Quiz result</Text>
        <Text testID="quiz-result-title" style={styles.title}>
          {result.quiz.title}
        </Text>
        <Text style={styles.subtitle}>
          Attempt {result.attemptNumber}
          {submittedAt ? ` · ${submittedAt}` : ""}
        </Text>

        <View style={styles.scoreCard}>
          <Text testID="quiz-result-percentage" style={styles.percentage}>
            {Math.round(percentage)}%
          </Text>
          <Text style={styles.scoreLine}>
            {result.score} / {result.maxScore} points
          </Text>
          <View
            testID="quiz-result-status"
            style={[
              styles.resultBadge,
              passed
                ? styles.passBadge
                : result.status === "timed_out"
                ? styles.timedOutBadge
                : styles.failBadge,
            ]}
          >
            <Text
              style={[
                styles.resultBadgeText,
                passed
                  ? styles.passText
                  : result.status === "timed_out"
                  ? styles.timedOutText
                  : styles.failText,
              ]}
            >
              {result.status === "timed_out"
                ? "Timed out"
                : passed
                ? "Passed"
                : "Not passed"}
            </Text>
          </View>
          <Text style={styles.passingText}>
            Passing score: {passingScore}% · Status:{" "}
            {statusLabel(result.status)}
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{correctCount}</Text>
              <Text style={styles.summaryLabel}>Correct</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{incorrectCount}</Text>
              <Text style={styles.summaryLabel}>Incorrect</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{pendingCount}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Answer review</Text>

        {result.answers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No answers recorded</Text>
            <Text style={styles.emptyText}>
              This attempt was submitted without saved answers.
            </Text>
          </View>
        ) : (
          result.answers.map((answer, index) => {
            const status = answerStatus(
              answer.isCorrect,
              answer.question.type
            );
            return (
              <View
                key={answer.id}
                testID={`quiz-result-question-${answer.id}`}
                style={styles.questionCard}
              >
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNumber}>
                    Question {index + 1}
                  </Text>
                  <View
                    style={[
                      styles.answerBadge,
                      status.tone === "correct"
                        ? styles.correctBadge
                        : status.tone === "incorrect"
                        ? styles.incorrectBadge
                        : styles.pendingBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.answerBadgeText,
                        status.tone === "correct"
                          ? styles.correctText
                          : status.tone === "incorrect"
                          ? styles.incorrectText
                          : styles.pendingText,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.questionText}>
                  {answer.question.question}
                </Text>

                <Text style={styles.answerLabel}>Your answer</Text>
                <Text style={styles.answerValue}>
                  {answer.answer?.trim() ? answer.answer : "(no answer)"}
                </Text>

                {answer.question.correctAnswer ? (
                  <>
                    <Text style={styles.answerLabel}>Correct answer</Text>
                    <Text style={styles.correctAnswerValue}>
                      {answer.question.correctAnswer}
                    </Text>
                  </>
                ) : null}

                <Text style={styles.pointsText}>
                  {answer.pointsEarned} / {answer.question.points} points
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
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
  subtitle: { color: "#5b677a", fontSize: 13, marginTop: 4 },
  scoreCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 20,
    alignItems: "center",
  },
  percentage: { color: "#10233f", fontSize: 46, fontWeight: "900" },
  scoreLine: { color: "#5b677a", fontSize: 13, fontWeight: "600", marginTop: 2 },
  resultBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12,
  },
  passBadge: { backgroundColor: "#ecfdf5" },
  failBadge: { backgroundColor: "#fef3f2" },
  timedOutBadge: { backgroundColor: "#fffbeb" },
  resultBadgeText: { fontSize: 13, fontWeight: "800" },
  passText: { color: "#047857" },
  failText: { color: "#b42318" },
  timedOutText: { color: "#b45309" },
  passingText: { color: "#7a8699", fontSize: 11, marginTop: 10 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eef1f6",
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { color: "#10233f", fontSize: 20, fontWeight: "800" },
  summaryLabel: { color: "#7a8699", fontSize: 11, marginTop: 2 },
  sectionTitle: {
    color: "#10233f",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  questionNumber: { color: "#0f766e", fontSize: 11, fontWeight: "800" },
  answerBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  correctBadge: { backgroundColor: "#ecfdf5" },
  incorrectBadge: { backgroundColor: "#fef3f2" },
  pendingBadge: { backgroundColor: "#fffbeb" },
  answerBadgeText: { fontSize: 10, fontWeight: "800" },
  correctText: { color: "#047857" },
  incorrectText: { color: "#b42318" },
  pendingText: { color: "#b45309" },
  questionText: {
    color: "#10233f",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 8,
  },
  answerLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
  },
  answerValue: { color: "#334155", fontSize: 13, lineHeight: 20, marginTop: 3 },
  correctAnswerValue: {
    color: "#047857",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 3,
    fontWeight: "600",
  },
  pointsText: {
    color: "#7a8699",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: { color: "#10233f", fontSize: 15, fontWeight: "800" },
  emptyText: {
    color: "#7a8699",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  centerText: {
    color: "#5b677a",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  errorTitle: { color: "#10233f", fontSize: 18, fontWeight: "800" },
  primaryButton: {
    marginTop: 14,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  buttonPressed: { opacity: 0.75 },
  textButton: { paddingVertical: 8 },
  textButtonText: { color: "#5b677a", fontSize: 13, fontWeight: "700" },
});
