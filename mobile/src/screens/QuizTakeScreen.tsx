import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApiErrorMessage } from "../api/client";
import {
  getQuizForLesson,
  getQuizStatus,
  QuizAttempt,
  QuizForLesson,
  QuizQuestion,
  QuizStatus,
  startQuizAttempt,
  submitQuizAttempt,
} from "../api/quizzes";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "QuizTake">;

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function typeLabel(type: string) {
  switch (type) {
    case "MCQ":
      return "Multiple choice";
    case "TRUE_FALSE":
      return "True / false";
    case "SHORT_ANSWER":
      return "Short answer";
    default:
      return type;
  }
}

function optionsFor(question: QuizQuestion) {
  if (question.type === "TRUE_FALSE") {
    return question.options && question.options.length > 0
      ? question.options
      : ["True", "False"];
  }
  return question.options ?? [];
}

export function QuizTakeScreen({ navigation, route }: Props) {
  const { quizId, lessonId } = route.params;
  const [quiz, setQuiz] = useState<QuizForLesson | null>(null);
  const [status, setStatus] = useState<QuizStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const answersRef = useRef<Record<string, string>>({});
  const attemptRef = useRef<QuizAttempt | null>(null);
  const submittingRef = useRef(false);
  const submittedRef = useRef(false);
  const autoSubmitTriggered = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [quizData, statusData] = await Promise.all([
        getQuizForLesson(lessonId),
        getQuizStatus(quizId),
      ]);
      setQuiz(quizData);
      setStatus(statusData);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [quizId, lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    if (!quiz) return;
    if (quiz.questions.length === 0) {
      setStartError("This quiz does not have any questions yet.");
      return;
    }
    if (
      status &&
      status.remainingAttempts !== null &&
      status.remainingAttempts <= 0
    ) {
      setStartError("You have no attempts left for this quiz.");
      return;
    }

    setStarting(true);
    setStartError(null);
    try {
      const result = await startQuizAttempt(quiz.id);
      const startedQuestions =
        result.questions && result.questions.length > 0
          ? result.questions
          : quiz.questions;
      const initialAnswers: Record<string, string> = {};
      for (const question of startedQuestions) initialAnswers[question.id] = "";

      setAttempt(result.attempt);
      attemptRef.current = result.attempt;
      setQuestions(startedQuestions);
      setAnswers(initialAnswers);
      answersRef.current = initialAnswers;
      setSubmitError(null);
      submittedRef.current = false;
      submittingRef.current = false;
      autoSubmitTriggered.current = false;

      if (result.attempt.timeLimit) {
        const startedAt = new Date(result.attempt.startedAt).getTime();
        const elapsedSeconds = Math.max(
          0,
          Math.floor((Date.now() - startedAt) / 1000)
        );
        setRemainingSeconds(
          Math.max(0, result.attempt.timeLimit * 60 - elapsedSeconds)
        );
      } else {
        setRemainingSeconds(null);
      }
    } catch (err) {
      setStartError(getApiErrorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const submitCurrentAttempt = useCallback(async () => {
    const currentAttempt = attemptRef.current;
    if (!currentAttempt || submittingRef.current || submittedRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = questions.map((question) => ({
        questionId: question.id,
        answer: answersRef.current[question.id] ?? "",
      }));
      const result = await submitQuizAttempt(currentAttempt.id, payload);
      submittedRef.current = true;
      navigation.replace("QuizResult", {
        attemptId: result.id ?? currentAttempt.id,
        title: quiz?.title,
      });
    } catch (err) {
      const message = getApiErrorMessage(err);
      if (/expired/i.test(message)) {
        submittedRef.current = true;
        navigation.replace("QuizResult", {
          attemptId: currentAttempt.id,
          title: quiz?.title,
        });
      } else {
        setSubmitError(message);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [navigation, questions, quiz?.title]);

  useEffect(() => {
    if (!attempt || remainingSeconds === null) return;

    if (remainingSeconds <= 0) {
      if (!autoSubmitTriggered.current) {
        autoSubmitTriggered.current = true;
        submitCurrentAttempt();
      }
      return;
    }

    const timer = setTimeout(() => {
      setRemainingSeconds((current) =>
        current === null ? null : Math.max(0, current - 1)
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [attempt, remainingSeconds, submitCurrentAttempt]);

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((current) => {
      const next = { ...current, [questionId]: value };
      answersRef.current = next;
      return next;
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !quiz) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load this quiz</Text>
          <Text style={styles.centerText}>
            {error ?? "The quiz could not be found."}
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
            <Text style={styles.textButtonText}>Back to quizzes</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const remainingAttempts = status?.remainingAttempts ?? null;
  const noAttemptsLeft =
    remainingAttempts !== null && remainingAttempts <= 0;
  const answeredCount = questions.filter(
    (question) => (answers[question.id] ?? "").trim().length > 0
  ).length;
  const timerIsUrgent =
    remainingSeconds !== null && remainingSeconds <= 60;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            testID="quiz-take-back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹ Quizzes</Text>
          </Pressable>
          <Text style={styles.eyebrow}>Quiz</Text>
          <Text testID="quiz-take-title" style={styles.title}>
            {quiz.title}
          </Text>
          {!attempt ? (
            <Text style={styles.subtitle}>
              {quiz.description ?? "Answer every question, then submit."}
            </Text>
          ) : null}
        </View>

        {!attempt ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <View style={styles.statGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{quiz.questions.length}</Text>
                  <Text style={styles.statLabel}>Questions</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {quiz.timeLimit ? `${quiz.timeLimit}m` : "—"}
                  </Text>
                  <Text style={styles.statLabel}>Time limit</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {remainingAttempts === null
                      ? "∞"
                      : remainingAttempts}
                  </Text>
                  <Text style={styles.statLabel}>Attempts left</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {quiz.passingScore ?? 0}%
                  </Text>
                  <Text style={styles.statLabel}>Passing score</Text>
                </View>
              </View>

              {noAttemptsLeft ? (
                <Text style={styles.warningText}>
                  You have used all available attempts for this quiz.
                </Text>
              ) : null}
              {startError ? (
                <Text style={styles.errorText}>{startError}</Text>
              ) : null}

              <Pressable
                testID="quiz-start-attempt"
                accessibilityRole="button"
                disabled={starting || noAttemptsLeft || quiz.questions.length === 0}
                onPress={handleStart}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || starting) && styles.buttonPressed,
                  (noAttemptsLeft || quiz.questions.length === 0) &&
                    styles.buttonDisabled,
                ]}
              >
                {starting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {noAttemptsLeft
                      ? "No attempts left"
                      : quiz.questions.length === 0
                      ? "No questions available"
                      : "Start attempt"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate("QuizHistory", {
                    quizId: quiz.id,
                    title: quiz.title,
                  })
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>View past attempts</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.attemptBar}>
              <Text style={styles.attemptText}>
                Attempt {attempt.attemptNumber}
              </Text>
              {remainingSeconds !== null ? (
                <Text
                  testID="quiz-timer"
                  style={[
                    styles.timerText,
                    timerIsUrgent && styles.timerUrgent,
                  ]}
                >
                  Time left {formatClock(remainingSeconds)}
                </Text>
              ) : (
                <Text style={styles.timerText}>No time limit</Text>
              )}
            </View>

            <Text style={styles.answeredText}>
              {answeredCount} of {questions.length} answered
            </Text>

            {questions.map((question, index) => (
              <View
                key={question.id}
                testID={`quiz-question-${question.id}`}
                style={styles.questionCard}
              >
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNumber}>
                    Question {index + 1}
                  </Text>
                  <Text style={styles.questionType}>
                    {typeLabel(question.type)} · {question.points} pt
                    {question.points === 1 ? "" : "s"}
                  </Text>
                </View>
                <Text style={styles.questionText}>{question.question}</Text>

                {question.type === "SHORT_ANSWER" ? (
                  <TextInput
                    testID={`quiz-answer-${question.id}`}
                    value={answers[question.id] ?? ""}
                    onChangeText={(value) => setAnswer(question.id, value)}
                    placeholder="Type your answer"
                    placeholderTextColor="#94a3b8"
                    multiline
                    style={styles.answerInput}
                  />
                ) : (
                  optionsFor(question).map((option, optionIndex) => {
                    const selected = answers[question.id] === option;
                    return (
                      <Pressable
                        key={`${question.id}-${optionIndex}`}
                        testID={`quiz-option-${question.id}-${optionIndex}`}
                        accessibilityRole="button"
                        onPress={() => setAnswer(question.id, option)}
                        style={({ pressed }) => [
                          styles.optionRow,
                          selected && styles.optionRowSelected,
                          pressed && styles.optionPressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.radio,
                            selected && styles.radioSelected,
                          ]}
                        >
                          {selected ? <View style={styles.radioDot} /> : null}
                        </View>
                        <Text
                          style={[
                            styles.optionText,
                            selected && styles.optionTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            ))}

            {submitError ? (
              <Text style={styles.errorText}>{submitError}</Text>
            ) : null}

            <Pressable
              testID="quiz-submit"
              accessibilityRole="button"
              disabled={submitting}
              onPress={submitCurrentAttempt}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || submitting) && styles.buttonPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Submit quiz</Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  flex: { flex: 1 },
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
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statItem: {
    flexGrow: 1,
    minWidth: "44%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
  },
  statValue: { color: "#10233f", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#7a8699", fontSize: 11, fontWeight: "700", marginTop: 2 },
  warningText: {
    color: "#92400e",
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  errorText: {
    color: "#b42318",
    backgroundColor: "#fff5f4",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#0f766e", fontSize: 14, fontWeight: "800" },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { backgroundColor: "#cbd5e1" },
  textButton: { paddingVertical: 8 },
  textButtonText: { color: "#5b677a", fontSize: 13, fontWeight: "700" },
  attemptBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 14,
  },
  attemptText: { color: "#10233f", fontSize: 13, fontWeight: "800" },
  timerText: { color: "#0f766e", fontSize: 13, fontWeight: "800" },
  timerUrgent: { color: "#b42318" },
  answeredText: {
    color: "#7a8699",
    fontSize: 11,
    fontWeight: "700",
    marginTop: -4,
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
  questionType: { color: "#94a3b8", fontSize: 10, fontWeight: "600" },
  questionText: {
    color: "#10233f",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: "#ffffff",
  },
  optionRowSelected: {
    borderColor: "#0f766e",
    backgroundColor: "#ecfdf5",
  },
  optionPressed: { opacity: 0.75 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: "#0f766e" },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0f766e",
  },
  optionText: { flex: 1, color: "#334155", fontSize: 13, lineHeight: 19 },
  optionTextSelected: { color: "#065f56", fontWeight: "700" },
  answerInput: {
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 12,
    backgroundColor: "#fbfcfe",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#10233f",
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: "top",
    marginTop: 8,
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
});
