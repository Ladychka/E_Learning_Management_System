import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApiErrorMessage } from "../api/client";
import {
  AssignmentAttachment,
  AssignmentDetail,
  getAssignment,
  GradeSummary,
} from "../api/assignments";
import { resolveAssetUrl } from "../config";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "AssignmentDetail">;

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

function openLink(url: string) {
  const resolved = resolveAssetUrl(url);
  if (!resolved) return;
  Linking.openURL(resolved).catch(() => {});
}

function normalizeAttachments(
  value: AssignmentDetail["attachments"]
): AssignmentAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is AssignmentAttachment =>
      Boolean(item && typeof item === "object" && typeof item.url === "string")
  );
}

function gradeStatus(grade: GradeSummary) {
  return Number(grade.percentage).toFixed(0);
}

export function AssignmentDetailScreen({ navigation, route }: Props) {
  const { assignmentId } = route.params;
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const data = await getAssignment(assignmentId);
        setAssignment(data);
        hasLoaded.current = true;
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [assignmentId]
  );

  useFocusEffect(
    useCallback(() => {
      load(!hasLoaded.current);
    }, [load])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading assignment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !assignment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load assignment</Text>
          <Text style={styles.centerText}>
            {error ?? "The assignment could not be found."}
          </Text>
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

  const submission = assignment.submission ?? assignment.submissions[0] ?? null;
  const grade = assignment.grade ?? submission?.grade ?? null;
  const attachments = normalizeAttachments(assignment.attachments);
  const overdue = isPastDue(assignment.dueDate);
  const dueDate = formatDate(assignment.dueDate);
  const submittedAt = formatDate(submission?.submittedAt);
  const canSubmit = !overdue || assignment.allowLate;
  const statusLabel = grade
    ? "Graded"
    : submission?.isLate
    ? "Late"
    : submission
    ? "Submitted"
    : overdue
    ? "Not submitted"
    : "Not submitted";
  const showSubmit = !grade && (!submission || !grade);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          testID="assignment-detail-back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Assignments</Text>
        </Pressable>

        <Text style={styles.eyebrow}>Assignment</Text>
        <Text testID="assignment-detail-title" style={styles.title}>
          {assignment.title}
        </Text>
        <Text style={styles.courseTitle}>{assignment.course.title}</Text>

        <View style={styles.metaRow}>
          <View
            testID="assignment-detail-status"
            style={[
              styles.statusBadge,
              grade
                ? styles.gradedBadge
                : submission?.isLate
                ? styles.lateBadge
                : submission
                ? styles.submittedBadge
                : styles.missingBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                grade
                  ? styles.gradedText
                  : submission?.isLate
                  ? styles.lateText
                  : submission
                  ? styles.submittedText
                  : styles.missingText,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
          <Text style={styles.metaText}>Max {assignment.maxPoints} points</Text>
          <Text style={[styles.metaText, overdue && styles.overdueText]}>
            {dueDate
              ? `${overdue ? "Overdue · due " : "Due "}${dueDate}`
              : "No due date"}
          </Text>
        </View>

        {assignment.description ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.bodyText}>{assignment.description}</Text>
          </View>
        ) : null}

        {assignment.instructions ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.bodyText}>{assignment.instructions}</Text>
          </View>
        ) : null}

        {attachments.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            {attachments.map((attachment, index) => (
              <Pressable
                key={`${attachment.url}-${index}`}
                testID={`assignment-attachment-${index}`}
                accessibilityRole="button"
                onPress={() => openLink(attachment.url)}
                style={({ pressed }) => [
                  styles.linkRow,
                  pressed && styles.linkRowPressed,
                ]}
              >
                <View style={styles.linkInfo}>
                  <Text style={styles.linkName}>
                    {attachment.name || "Attachment"}
                  </Text>
                  <Text numberOfLines={1} style={styles.linkUrl}>
                    {attachment.url}
                  </Text>
                </View>
                <Text style={styles.openText}>Open</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {submission ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your submission</Text>
              {submission.isLate ? (
                <Text style={styles.lateTag}>Late</Text>
              ) : null}
            </View>
            <Text style={styles.submittedDateText}>
              Submitted {submittedAt ?? "recently"}
            </Text>
            {submission.content ? (
              <Text style={styles.submissionContent}>{submission.content}</Text>
            ) : null}
            {submission.fileUrls.length > 0 ? (
              <View style={styles.fileList}>
                {submission.fileUrls.map((url, index) => (
                  <Pressable
                    key={`${url}-${index}`}
                    testID={`assignment-file-${index}`}
                    accessibilityRole="button"
                    onPress={() => openLink(url)}
                    style={({ pressed }) => [
                      styles.linkRow,
                      pressed && styles.linkRowPressed,
                    ]}
                  >
                    <View style={styles.linkInfo}>
                      <Text style={styles.linkName}>
                        {url.startsWith("/uploads/")
                          ? "Uploaded file"
                          : "Submitted link"}
                      </Text>
                      <Text numberOfLines={1} style={styles.linkUrl}>
                        {url}
                      </Text>
                    </View>
                    <Text style={styles.openText}>Open</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {grade ? (
          <View testID="assignment-grade" style={styles.gradeCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Instructor grade</Text>
              <Text style={styles.gradePercentage}>
                {gradeStatus(grade)}%
              </Text>
            </View>
            <Text style={styles.gradePoints}>
              {Number(grade.points)} / {Number(grade.maxPoints)} points
              {grade.letterGrade ? ` · ${grade.letterGrade}` : ""}
              {grade.passFail ? ` · ${grade.passFail}` : ""}
            </Text>
            {grade.feedback ? (
              <>
                <Text style={styles.feedbackLabel}>Feedback</Text>
                <Text style={styles.feedbackText}>{grade.feedback}</Text>
              </>
            ) : (
              <Text style={styles.mutedText}>
                No written feedback was added.
              </Text>
            )}
            {grade.grader ? (
              <Text style={styles.graderText}>
                Graded by {grade.grader.firstName} {grade.grader.lastName}
              </Text>
            ) : null}
            {grade.publishedAt ? (
              <Text style={styles.graderText}>
                Published {formatDate(grade.publishedAt)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {showSubmit ? (
          <View style={styles.actionCard}>
            {!canSubmit ? (
              <Text style={styles.warningText}>
                The deadline has passed and late submissions are not allowed for
                this assignment.
              </Text>
            ) : (
              <>
                {overdue && assignment.allowLate ? (
                  <Text style={styles.warningText}>
                    The deadline has passed. This submission will be marked
                    late.
                  </Text>
                ) : null}
                <Pressable
                  testID="assignment-submit-button"
                  accessibilityRole="button"
                  onPress={() =>
                    navigation.navigate("AssignmentSubmit", {
                      assignmentId: assignment.id,
                      title: assignment.title,
                    })
                  }
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {submission ? "Update submission" : "Submit assignment"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  backButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
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
  courseTitle: {
    color: "#5b677a",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 9,
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
  metaText: { color: "#7a8699", fontSize: 11, fontWeight: "600" },
  overdueText: { color: "#b42318" },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    color: "#10233f",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  bodyText: { color: "#5b677a", fontSize: 14, lineHeight: 22 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eef1f6",
  },
  linkRowPressed: { opacity: 0.7 },
  linkInfo: { flex: 1 },
  linkName: { color: "#10233f", fontSize: 13, fontWeight: "700" },
  linkUrl: { color: "#94a3b8", fontSize: 10, marginTop: 2 },
  openText: { color: "#0f766e", fontSize: 12, fontWeight: "800" },
  lateTag: {
    color: "#b45309",
    backgroundColor: "#fffbeb",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
  },
  submittedDateText: { color: "#7a8699", fontSize: 11, marginTop: 2 },
  submissionContent: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
  },
  fileList: { marginTop: 6 },
  gradeCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    padding: 16,
  },
  gradePercentage: { color: "#047857", fontSize: 24, fontWeight: "900" },
  gradePoints: {
    color: "#065f46",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  feedbackLabel: {
    color: "#047857",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
  },
  feedbackText: {
    color: "#065f46",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  mutedText: { color: "#5b677a", fontSize: 12, marginTop: 10 },
  graderText: { color: "#5b677a", fontSize: 11, marginTop: 10 },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  warningText: {
    color: "#92400e",
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 12,
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
