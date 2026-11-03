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
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApiErrorMessage } from "../api/client";
import {
  CourseDetail,
  CourseLesson,
  CourseModule,
  getCourse,
} from "../api/courses";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "CourseContent">;

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

function completedLessonsFromCourse(course: CourseDetail) {
  return course.modules
    .filter((module) => module.isPublished !== false)
    .flatMap((module) =>
      module.lessons.filter((lesson) => lesson.isPublished !== false)
    );
}

export function CourseContentScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const [course, setCourse] = useState<CourseDetail | null>(null);
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
        const detail = await getCourse(courseId);
        if (id !== requestId.current) return;
        setCourse(detail);
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

  const openLesson = (lesson: CourseLesson) => {
    navigation.navigate("LessonViewer", {
      lessonId: lesson.id,
      courseId,
      title: lesson.title,
    });
  };

  const openFirstIncomplete = (lessons: CourseLesson[]) => {
    const nextLesson =
      lessons.find((lesson) => !lesson.isCompleted) ?? lessons[0];
    if (nextLesson) openLesson(nextLesson);
  };

  const renderModule = ({ item }: { item: CourseModule }) => {
    const lessons = item.lessons.filter(
      (lesson) => lesson.isPublished !== false
    );

    return (
      <View style={styles.moduleCard} testID={`content-module-${item.id}`}>
        <View style={styles.moduleHeader}>
          <View style={styles.moduleTitleWrap}>
            <Text style={styles.moduleTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.moduleDescription}>{item.description}</Text>
            ) : null}
          </View>
          <View style={styles.lessonCountBadge}>
            <Text style={styles.lessonCountText}>
              {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        {lessons.length === 0 ? (
          <Text style={styles.mutedText}>No lessons published yet.</Text>
        ) : (
          lessons.map((lesson) => (
            <Pressable
              key={lesson.id}
              testID={`lesson-row-${lesson.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${lesson.title}, ${
                lesson.isCompleted ? "completed" : "not completed"
              }`}
              onPress={() => openLesson(lesson)}
              style={({ pressed }) => [
                styles.lessonRow,
                pressed && styles.lessonRowPressed,
              ]}
            >
              <View
                testID={`lesson-status-${lesson.id}`}
                style={[
                  styles.statusCircle,
                  lesson.isCompleted && styles.statusCircleCompleted,
                ]}
              >
                {lesson.isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                ) : null}
              </View>

              <View style={styles.lessonBody}>
                <Text
                  style={[
                    styles.lessonTitle,
                    lesson.isCompleted && styles.lessonTitleCompleted,
                  ]}
                >
                  {lesson.title}
                </Text>
                <View style={styles.lessonMetaRow}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>
                      {contentTypeLabel(lesson.contentType)}
                    </Text>
                  </View>
                  {lesson.duration ? (
                    <Text style={styles.lessonMeta}>
                      {lesson.duration} min
                    </Text>
                  ) : null}
                  {lesson.isPreview ? (
                    <Text style={styles.previewBadge}>Preview</Text>
                  ) : null}
                </View>
              </View>

              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading course content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !course) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load course content</Text>
          <Text style={styles.centerText}>
            {error ?? "The course could not be found."}
          </Text>
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

  const modules = course.modules.filter(
    (module) => module.isPublished !== false
  );
  const lessons = completedLessonsFromCourse(course);
  const completedCount =
    course.progress?.completedLessons ??
    lessons.filter((lesson) => lesson.isCompleted).length;
  const totalCount = course.progress?.totalLessons ?? lessons.length;
  const progressPercent =
    course.progress?.progressPercent ??
    (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          testID="content-back-button"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Course content</Text>
        <Text testID="course-content-title" style={styles.title}>
          {course.title}
        </Text>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Your progress</Text>
            <Text testID="course-content-progress" style={styles.progressValue}>
              {completedCount} of {totalCount} lessons · {progressPercent}%
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(0, progressPercent))}%` },
              ]}
            />
          </View>
          <Pressable
            testID="continue-learning-button"
            accessibilityRole="button"
            onPress={() => openFirstIncomplete(lessons)}
            disabled={lessons.length === 0}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || lessons.length === 0) && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {completedCount >= totalCount && totalCount > 0
                ? "Review course"
                : completedCount > 0
                ? "Continue learning"
                : "Start learning"}
            </Text>
          </Pressable>
          <Pressable
            testID="course-quizzes-button"
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("QuizList", {
                courseId,
                title: course.title,
              })
            }
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Quizzes</Text>
          </Pressable>
          <Pressable
            testID="course-assignments-button"
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("AssignmentList", {
                courseId,
                title: course.title,
              })
            }
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Assignments</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        testID="course-content-list"
        data={modules}
        keyExtractor={(module) => module.id}
        renderItem={renderModule}
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
            <Text style={styles.errorTitle}>No content published</Text>
            <Text style={styles.centerText}>
              This course does not have any published modules or lessons yet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  header: { paddingHorizontal: 20, paddingTop: 8 },
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
  title: {
    color: "#10233f",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 31,
    marginTop: 6,
  },
  progressCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
    marginTop: 14,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  progressLabel: { color: "#10233f", fontSize: 13, fontWeight: "800" },
  progressValue: { color: "#5b677a", fontSize: 12, fontWeight: "600" },
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
  listContent: { padding: 20, paddingTop: 14, gap: 14, flexGrow: 1 },
  moduleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
  },
  moduleTitleWrap: { flex: 1 },
  moduleTitle: { color: "#10233f", fontSize: 16, fontWeight: "800" },
  moduleDescription: {
    color: "#7a8699",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  lessonCountBadge: {
    backgroundColor: "#eef2f6",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  lessonCountText: { color: "#5b677a", fontSize: 10, fontWeight: "800" },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eef1f6",
    marginTop: 6,
  },
  lessonRowPressed: { opacity: 0.7 },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  statusCircleCompleted: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  lessonBody: { flex: 1 },
  lessonTitle: {
    color: "#10233f",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  lessonTitleCompleted: { color: "#64748b" },
  lessonMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 5,
  },
  typeBadge: {
    backgroundColor: "#eef2f6",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  typeBadgeText: { color: "#5b677a", fontSize: 10, fontWeight: "800" },
  lessonMeta: { color: "#94a3b8", fontSize: 10, fontWeight: "600" },
  previewBadge: { color: "#047857", fontSize: 10, fontWeight: "800" },
  chevron: { color: "#cbd5e1", fontSize: 22, fontWeight: "800" },
  mutedText: { color: "#7a8699", fontSize: 13, paddingVertical: 8 },
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
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingHorizontal: 20,
    paddingVertical: 11,
    alignItems: "center",
  },
  secondaryButtonPressed: { opacity: 0.7 },
  secondaryButtonText: { color: "#0f766e", fontSize: 13, fontWeight: "800" },
  textButton: { paddingVertical: 8 },
  textButtonText: { color: "#5b677a", fontSize: 13, fontWeight: "700" },
});
