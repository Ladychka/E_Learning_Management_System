import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useVideoPlayer, VideoView } from "expo-video";
import { getApiErrorMessage } from "../api/client";
import type { CourseProgress } from "../api/courses";
import {
  completeLesson,
  getLesson,
  LessonAttachment,
  LessonDetail,
} from "../api/lessons";
import { resolveAssetUrl } from "../config";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "LessonViewer">;

function contentTypeLabel(contentType: string) {
  switch (contentType) {
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "quiz":
      return "Quiz";
    case "text":
      return "Reading";
    default:
      return contentType;
  }
}

function normalizeAttachments(
  value: LessonDetail["attachments"]
): LessonAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is LessonAttachment =>
      Boolean(
        item &&
          typeof item === "object" &&
          typeof (item as LessonAttachment).url === "string"
      )
  );
}

function isWebUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

async function openUrl(url: string, download = false) {
  const resolved = resolveAssetUrl(url);
  if (!resolved) return;
  const target = download
    ? `${resolved}${resolved.includes("?") ? "&" : "?"}download=true`
    : resolved;
  try {
    await Linking.openURL(target);
  } catch {
    // Ignore platform URL handler failures; the user can retry.
  }
}

function InlineVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      style={styles.video}
      player={player}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
    />
  );
}

export function LessonViewerScreen({ navigation, route }: Props) {
  const { lessonId } = route.params;
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCompleteError(null);
    try {
      const detail = await getLesson(lessonId);
      setLesson(detail);
      setProgress(detail.courseProgress ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async () => {
    if (!lesson || lesson.isCompleted) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const result = await completeLesson(lesson.id);
      const nextProgress: CourseProgress = {
        completedLessons: result.completedLessons,
        totalLessons: result.totalLessons,
        progressPercent: result.progressPercent,
      };
      setProgress(nextProgress);
      setLesson({ ...lesson, isCompleted: true, courseProgress: nextProgress });
    } catch (err) {
      setCompleteError(getApiErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  };

  const allLessons = useMemo(() => {
    if (!lesson) return [];
    const modules = lesson.module.course.modules.filter(
      (module) => module.isPublished !== false
    );
    return modules.flatMap((module) =>
      module.lessons
        .filter((item) => item.isPublished !== false)
        .map((item) => ({ ...item, moduleTitle: module.title }))
    );
  }, [lesson]);

  const currentIndex = lesson
    ? allLessons.findIndex((item) => item.id === lesson.id)
    : -1;
  const previousLesson =
    currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;

  const goToLesson = (id: string) => {
    navigation.replace("LessonViewer", { lessonId: id });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lesson) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load this lesson</Text>
          <Text style={styles.centerText}>
            {error ?? "The lesson could not be found."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={load}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.textButton}
          >
            <Text style={styles.textButtonText}>Back to course content</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isVideo = lesson.contentType === "video";
  const isPdf = lesson.contentType === "pdf";
  const isText = lesson.contentType === "text";
  const isQuiz = lesson.contentType === "quiz";
  const attachments = normalizeAttachments(lesson.attachments);
  const resolvedContentUrl = resolveAssetUrl(lesson.contentUrl);
  const isYouTube =
    Boolean(resolvedContentUrl) &&
    (resolvedContentUrl!.includes("youtube.com") ||
      resolvedContentUrl!.includes("youtu.be"));
  const textContent = [
    lesson.description,
    lesson.contentUrl && !isWebUrl(lesson.contentUrl)
      ? lesson.contentUrl
      : null,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join("\n\n");
  const progressValue = progress ?? lesson.courseProgress ?? null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          testID="lesson-back-button"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Course content</Text>
        </Pressable>

        <Text style={styles.courseTitle}>{lesson.module.course.title}</Text>
        <Text style={styles.moduleTitle}>{lesson.module.title}</Text>

        <View style={styles.titleRow}>
          <Text testID="lesson-viewer-title" style={styles.title}>
            {lesson.title}
          </Text>
          {lesson.isCompleted ? (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {contentTypeLabel(lesson.contentType)}
            </Text>
          </View>
          {currentIndex >= 0 ? (
            <Text style={styles.metaText}>
              Lesson {currentIndex + 1} of {allLessons.length}
            </Text>
          ) : null}
          {lesson.duration ? (
            <Text style={styles.metaText}>{lesson.duration} min</Text>
          ) : null}
          {lesson.isPreview ? (
            <Text style={styles.previewText}>Preview</Text>
          ) : null}
        </View>

        <View style={styles.contentCard}>
          {isVideo ? (
            <>
              {lesson.description ? (
                <Text style={styles.description}>{lesson.description}</Text>
              ) : null}
              {!resolvedContentUrl ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>No video uploaded</Text>
                  <Text style={styles.emptyText}>
                    This lesson does not have a video file yet.
                  </Text>
                </View>
              ) : isYouTube ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openUrl(resolvedContentUrl)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    Open video in browser
                  </Text>
                </Pressable>
              ) : (
                <View testID="lesson-video" style={styles.videoFrame}>
                  <InlineVideo uri={resolvedContentUrl} />
                </View>
              )}
            </>
          ) : null}

          {isPdf ? (
            <>
              <View style={styles.fileIcon}>
                <Text style={styles.fileIconText}>PDF</Text>
              </View>
              <Text style={styles.pdfTitle}>{lesson.title}</Text>
              {lesson.description ? (
                <Text style={styles.description}>{lesson.description}</Text>
              ) : null}
              {resolvedContentUrl ? (
                <View style={styles.buttonRow}>
                  <Pressable
                    testID="lesson-pdf-open"
                    accessibilityRole="button"
                    onPress={() => openUrl(lesson.contentUrl!)}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.flexButton,
                      pressed && styles.primaryButtonPressed,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Open PDF</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openUrl(lesson.contentUrl!, true)}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      styles.flexButton,
                      pressed && styles.secondaryButtonPressed,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Download</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>No document attached</Text>
                  <Text style={styles.emptyText}>
                    This lesson does not have a PDF file yet.
                  </Text>
                </View>
              )}
            </>
          ) : null}

          {isText ? (
            <>
              {textContent ? (
                <Text testID="lesson-text-content" style={styles.readingText}>
                  {textContent}
                </Text>
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>No reading content</Text>
                  <Text style={styles.emptyText}>
                    This lesson does not have text content yet.
                  </Text>
                </View>
              )}
              {lesson.contentUrl && isWebUrl(lesson.contentUrl) ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openUrl(lesson.contentUrl!)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    Open lesson link
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {isQuiz ? (
            <View testID="lesson-quiz-card" style={styles.quizCard}>
              <Text style={styles.quizTitle}>
                {lesson.quiz?.title ?? lesson.title}
              </Text>
              <Text style={styles.quizBody}>
                {lesson.quiz?.description ??
                  "Test your understanding of this module."}
              </Text>
              <Text style={styles.quizMeta}>
                {lesson.quiz?.questions?.length ?? 0} questions
                {lesson.quiz?.timeLimit
                  ? ` · ${lesson.quiz.timeLimit} min limit`
                  : ""}
                {lesson.quiz?.maxAttempts
                  ? ` · ${lesson.quiz.maxAttempts} attempts`
                  : ""}
              </Text>
              <Text style={styles.quizNotice}>
                Open the quiz list to start an attempt or review past results.
              </Text>
              <Pressable
                testID="lesson-open-quizzes"
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate("QuizList", {
                    courseId: lesson.module.course.id,
                    title: lesson.module.course.title,
                  })
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Open quizzes</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {attachments.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            {attachments.map((attachment, index) => (
              <Pressable
                key={`${attachment.url}-${index}`}
                testID={`lesson-attachment-${index}`}
                accessibilityRole="button"
                onPress={() => openUrl(attachment.url)}
                style={({ pressed }) => [
                  styles.attachmentRow,
                  pressed && styles.attachmentRowPressed,
                ]}
              >
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName}>
                    {attachment.name || "Attachment"}
                  </Text>
                  <Text numberOfLines={1} style={styles.attachmentUrl}>
                    {attachment.url}
                  </Text>
                </View>
                <Text style={styles.openLink}>Open</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Course progress</Text>
            <Text testID="lesson-progress-value" style={styles.progressValue}>
              {progressValue
                ? `${progressValue.completedLessons} of ${progressValue.totalLessons} · ${progressValue.progressPercent}%`
                : "—"}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    progressValue
                      ? Math.min(
                          100,
                          Math.max(0, progressValue.progressPercent)
                        )
                      : 0
                  }%`,
                },
              ]}
            />
          </View>

          {lesson.isCompleted ? (
            <View testID="lesson-completed-status" style={styles.completedBox}>
              <Text style={styles.completedBoxText}>
                ✓ This lesson is complete
              </Text>
            </View>
          ) : (
            <Pressable
              testID="lesson-complete-button"
              accessibilityRole="button"
              onPress={handleComplete}
              disabled={completing}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || completing) && styles.primaryButtonPressed,
              ]}
            >
              {completing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Mark as complete</Text>
              )}
            </Pressable>
          )}

          {completeError ? (
            <Text style={styles.errorText}>{completeError}</Text>
          ) : null}
        </View>

        <View style={styles.navRow}>
          {previousLesson ? (
            <Pressable
              testID="lesson-prev-button"
              accessibilityRole="button"
              onPress={() => goToLesson(previousLesson.id)}
              style={({ pressed }) => [
                styles.navButton,
                pressed && styles.navButtonPressed,
              ]}
            >
              <Text style={styles.navLabel}>‹ Previous</Text>
              <Text numberOfLines={1} style={styles.navTitle}>
                {previousLesson.title}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.navPlaceholder} />
          )}

          {nextLesson ? (
            <Pressable
              testID="lesson-next-button"
              accessibilityRole="button"
              onPress={() => goToLesson(nextLesson.id)}
              style={({ pressed }) => [
                styles.navButton,
                styles.navButtonRight,
                pressed && styles.navButtonPressed,
              ]}
            >
              <Text style={styles.navLabel}>Next ›</Text>
              <Text numberOfLines={1} style={styles.navTitle}>
                {nextLesson.title}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.navPlaceholder} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
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
  backButton: { alignSelf: "flex-start", paddingVertical: 4 },
  backButtonText: { color: "#0f766e", fontSize: 14, fontWeight: "800" },
  courseTitle: { color: "#0f766e", fontSize: 12, fontWeight: "800" },
  moduleTitle: {
    color: "#7a8699",
    fontSize: 12,
    fontWeight: "700",
    marginTop: -6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    color: "#10233f",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  completedBadge: {
    backgroundColor: "#ecfdf5",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedBadgeText: { color: "#047857", fontSize: 10, fontWeight: "800" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -4,
  },
  typeBadge: {
    backgroundColor: "#e6f4f1",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: { color: "#0f766e", fontSize: 10, fontWeight: "800" },
  metaText: { color: "#7a8699", fontSize: 11, fontWeight: "600" },
  previewText: { color: "#047857", fontSize: 10, fontWeight: "800" },
  contentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
    gap: 12,
  },
  description: {
    color: "#5b677a",
    fontSize: 14,
    lineHeight: 21,
  },
  videoFrame: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  video: { width: "100%", height: "100%" },
  emptyBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: { color: "#334155", fontSize: 14, fontWeight: "800" },
  emptyText: {
    color: "#7a8699",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 4,
  },
  fileIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconText: { color: "#b91c1c", fontSize: 13, fontWeight: "900" },
  pdfTitle: { color: "#10233f", fontSize: 16, fontWeight: "800" },
  buttonRow: { flexDirection: "row", gap: 10 },
  flexButton: { flex: 1 },
  readingText: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 24,
  },
  quizCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 16,
  },
  quizTitle: { color: "#78350f", fontSize: 16, fontWeight: "800" },
  quizBody: {
    color: "#92400e",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  quizMeta: {
    color: "#a16207",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
  quizNotice: {
    color: "#b45309",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  sectionTitle: {
    color: "#10233f",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eef1f6",
  },
  attachmentRowPressed: { opacity: 0.7 },
  attachmentInfo: { flex: 1 },
  attachmentName: { color: "#10233f", fontSize: 13, fontWeight: "700" },
  attachmentUrl: { color: "#94a3b8", fontSize: 10, marginTop: 2 },
  openLink: { color: "#0f766e", fontSize: 12, fontWeight: "800" },
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
  progressLabel: { color: "#10233f", fontSize: 13, fontWeight: "800" },
  progressValue: { color: "#5b677a", fontSize: 11, fontWeight: "600" },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#eef2f6",
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#0f766e",
  },
  completedBox: {
    marginTop: 14,
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    padding: 12,
    alignItems: "center",
  },
  completedBoxText: { color: "#047857", fontSize: 13, fontWeight: "800" },
  primaryButton: {
    marginTop: 14,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonPressed: { opacity: 0.8 },
  primaryButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  secondaryButton: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonPressed: { opacity: 0.7 },
  secondaryButtonText: { color: "#0f766e", fontSize: 13, fontWeight: "800" },
  errorText: {
    color: "#b42318",
    backgroundColor: "#fff5f4",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  textButton: { paddingVertical: 8 },
  textButtonText: { color: "#5b677a", fontSize: 13, fontWeight: "700" },
  navRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 2,
  },
  navPlaceholder: { flex: 1 },
  navButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 12,
  },
  navButtonRight: { alignItems: "flex-end" },
  navButtonPressed: { opacity: 0.7 },
  navLabel: { color: "#0f766e", fontSize: 11, fontWeight: "800" },
  navTitle: {
    color: "#10233f",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
});
