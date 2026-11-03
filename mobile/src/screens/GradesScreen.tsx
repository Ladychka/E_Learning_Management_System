import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { getApiErrorMessage } from "../api/client";
import {
  CertificateSummary,
  getMyCertificates,
} from "../api/certificates";
import {
  CourseProgress,
  getCourse,
  getMyEnrollments,
  MyEnrollment,
} from "../api/courses";
import { getMyGrades, Grade } from "../api/grades";
import type { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "Grades">;

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

function percentageOf(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return "In progress";
    case "completed":
      return "Completed";
    case "expired":
      return "Expired";
    case "dropped":
      return "Dropped";
    default:
      return status;
  }
}

export function GradesScreen(_props: Props) {
  const [enrollments, setEnrollments] = useState<MyEnrollment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [certificates, setCertificates] = useState<CertificateSummary[]>([]);
  const [courseProgress, setCourseProgress] = useState<
    Record<string, CourseProgress | null>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] =
    useState<CertificateSummary | null>(null);
  const hasLoaded = useRef(false);
  const requestId = useRef(0);

  const load = useCallback(async (showSpinner: boolean) => {
    const id = ++requestId.current;
    if (showSpinner) setLoading(true);
    setError(null);

    try {
      const [enrollmentResult, gradeResult, certificateResult] =
        await Promise.all([
          getMyEnrollments(),
          getMyGrades(),
          getMyCertificates(),
        ]);

      const progressEntries = await Promise.all(
        enrollmentResult.enrollments.map(async (enrollment) => {
          try {
            const course = await getCourse(enrollment.course.id);
            return [enrollment.course.id, course.progress ?? null] as const;
          } catch {
            return [enrollment.course.id, null] as const;
          }
        })
      );

      if (id !== requestId.current) return;
      setEnrollments(enrollmentResult.enrollments);
      setGrades(gradeResult);
      setCertificates(certificateResult);
      setCourseProgress(Object.fromEntries(progressEntries));
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading progress and grades...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load your records</Text>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0f766e"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Learning record</Text>
        <Text testID="grades-screen-title" style={styles.title}>
          Progress & grades
        </Text>
        <Text style={styles.subtitle}>
          Course progress, published assessment grades, and certificates in one
          place.
        </Text>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Course progress</Text>
          <Text style={styles.sectionCount}>
            {enrollments.length} course{enrollments.length === 1 ? "" : "s"}
          </Text>
        </View>

        {enrollments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No enrolled courses</Text>
            <Text style={styles.emptyText}>
              Enroll in a course to start tracking progress.
            </Text>
          </View>
        ) : (
          enrollments.map((enrollment) => {
            const progress = courseProgress[enrollment.course.id];
            const quizGrades = grades.filter(
              (grade) =>
                grade.quizId &&
                (grade.course?.id === enrollment.course.id ||
                  grade.courseId === enrollment.course.id)
            );
            const percentage = Math.min(
              100,
              Math.max(0, enrollment.progressPercent)
            );

            return (
              <View
                key={enrollment.id}
                testID={`course-progress-${enrollment.course.id}`}
                style={styles.progressCard}
              >
                <View style={styles.progressHeader}>
                  <Text style={styles.courseTitle}>
                    {enrollment.course.title}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {statusLabel(enrollment.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressValueRow}>
                  <Text
                    testID={`course-progress-percent-${enrollment.course.id}`}
                    style={styles.progressValue}
                  >
                    {percentage}%
                  </Text>
                  <Text style={styles.progressMeta}>
                    {progress
                      ? `${progress.completedLessons} of ${progress.totalLessons} lessons completed`
                      : "Lesson progress unavailable"}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${percentage}%` }]}
                  />
                </View>

                <Text style={styles.quizHeading}>Quiz scores</Text>
                {quizGrades.length > 0 ? (
                  quizGrades.map((grade) => (
                    <View key={grade.id} style={styles.quizRow}>
                      <Text numberOfLines={1} style={styles.quizName}>
                        {grade.quiz?.title ?? "Quiz"}
                      </Text>
                      <Text style={styles.quizScore}>
                        {percentageOf(grade.percentage).toFixed(0)}%
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.mutedText}>No quiz grades yet.</Text>
                )}
              </View>
            );
          })
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Grades overview</Text>
          <Text style={styles.sectionCount}>
            {grades.length} grade{grades.length === 1 ? "" : "s"}
          </Text>
        </View>

        {grades.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No published grades yet</Text>
            <Text style={styles.emptyText}>
              Quiz and assignment grades will appear here after they are
              published.
            </Text>
          </View>
        ) : (
          grades.map((grade) => (
            <View key={grade.id} testID={`grade-card-${grade.id}`} style={styles.gradeCard}>
              <View style={styles.gradeHeader}>
                <View style={styles.gradeTitleWrap}>
                  <Text style={styles.gradeCourse}>
                    {grade.course?.title ?? "Course"}
                  </Text>
                  <Text style={styles.gradeTitle}>
                    {grade.assignment?.title ??
                      grade.quiz?.title ??
                      "Assessment"}
                  </Text>
                </View>
                <Text style={styles.gradePercentage}>
                  {percentageOf(grade.percentage).toFixed(0)}%
                </Text>
              </View>
              <Text style={styles.gradeMeta}>
                {Number(grade.points)} / {Number(grade.maxPoints)} points
                {grade.letterGrade ? ` · ${grade.letterGrade}` : ""}
                {grade.passFail ? ` · ${grade.passFail}` : ""}
                {grade.quizId ? " · Quiz" : grade.assignmentId ? " · Assignment" : ""}
              </Text>
              {grade.feedback ? (
                <Text style={styles.feedbackText}>{grade.feedback}</Text>
              ) : null}
              {grade.grader ? (
                <Text style={styles.graderText}>
                  Graded by {grade.grader.firstName} {grade.grader.lastName}
                </Text>
              ) : null}
            </View>
          ))
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Certificates</Text>
          <Text style={styles.sectionCount}>
            {certificates.length}
          </Text>
        </View>

        {certificates.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No certificates yet</Text>
            <Text style={styles.emptyText}>
              Complete a course to receive a verifiable certificate.
            </Text>
          </View>
        ) : (
          certificates.map((certificate) => (
            <View
              key={certificate.id}
              testID={`certificate-card-${certificate.id}`}
              style={styles.certificateCard}
            >
              <Text style={styles.certificateCourse}>
                {certificate.course.title}
              </Text>
              <Text style={styles.certificateNumber}>
                {certificate.certificateNumber}
              </Text>
              <Text style={styles.certificateDate}>
                Issued {formatDate(certificate.issuedAt) ?? "—"}
                {certificate.downloadedAt
                  ? ` · Viewed ${formatDate(certificate.downloadedAt)}`
                  : ""}
              </Text>
              <Pressable
                testID={`certificate-open-${certificate.id}`}
                accessibilityRole="button"
                onPress={() => setSelectedCertificate(certificate)}
                style={({ pressed }) => [
                  styles.certificateButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.certificateButtonText}>
                  View certificate
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={selectedCertificate !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCertificate(null)}
      >
        <View style={styles.modalBackdrop}>
          <View testID="certificate-modal" style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Certificate</Text>
            <Text style={styles.modalCourse}>
              {selectedCertificate?.course.title}
            </Text>
            <Text style={styles.modalNumber}>
              {selectedCertificate?.certificateNumber}
            </Text>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Issued</Text>
              <Text style={styles.modalValue}>
                {formatDate(selectedCertificate?.issuedAt) ?? "—"}
              </Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Status</Text>
              <Text style={styles.modalValue}>Verified</Text>
            </View>
            <Text style={styles.modalNote}>
              This certificate number can be verified through the ELMS public
              certificate lookup.
            </Text>
            <Pressable
              testID="certificate-modal-close"
              accessibilityRole="button"
              onPress={() => setSelectedCertificate(null)}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
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
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  sectionTitle: { color: "#10233f", fontSize: 16, fontWeight: "800" },
  sectionCount: { color: "#7a8699", fontSize: 11, fontWeight: "700" },
  progressCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  courseTitle: { flex: 1, color: "#10233f", fontSize: 15, fontWeight: "800" },
  statusBadge: {
    backgroundColor: "#eef2f6",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusText: { color: "#64748b", fontSize: 10, fontWeight: "800" },
  progressValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 12,
  },
  progressValue: { color: "#0f766e", fontSize: 24, fontWeight: "800" },
  progressMeta: { color: "#7a8699", fontSize: 11, fontWeight: "600" },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#eef2f6",
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#0f766e",
  },
  quizHeading: {
    color: "#5b677a",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
  },
  quizRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  quizName: { flex: 1, color: "#334155", fontSize: 12 },
  quizScore: { color: "#047857", fontSize: 12, fontWeight: "800" },
  mutedText: { color: "#7a8699", fontSize: 11, marginTop: 6 },
  gradeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  gradeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  gradeTitleWrap: { flex: 1 },
  gradeCourse: {
    color: "#0f766e",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  gradeTitle: {
    color: "#10233f",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  gradePercentage: { color: "#047857", fontSize: 22, fontWeight: "900" },
  gradeMeta: {
    color: "#7a8699",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
  },
  feedbackText: {
    color: "#5b677a",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
  },
  graderText: { color: "#94a3b8", fontSize: 10, marginTop: 8 },
  certificateCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    padding: 16,
  },
  certificateCourse: { color: "#10233f", fontSize: 15, fontWeight: "800" },
  certificateNumber: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  certificateDate: { color: "#7a8699", fontSize: 11, marginTop: 6 },
  certificateButton: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingVertical: 10,
    alignItems: "center",
  },
  certificateButtonText: { color: "#0f766e", fontSize: 12, fontWeight: "800" },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: { color: "#10233f", fontSize: 14, fontWeight: "800" },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
  },
  modalEyebrow: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalCourse: {
    color: "#10233f",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
  },
  modalNumber: {
    color: "#047857",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  modalLabel: { color: "#7a8699", fontSize: 11, fontWeight: "700" },
  modalValue: { color: "#10233f", fontSize: 12, fontWeight: "700" },
  modalNote: {
    color: "#5b677a",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },
});
