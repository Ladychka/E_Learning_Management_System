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
import {
  CourseDetail,
  getCourse,
  getMyEnrollments,
  hasActiveEnrollment,
  selfEnroll,
} from "../api/courses";
import { createCourseCheckout } from "../api/payments";
import { CourseThumbnail } from "../components/CourseThumbnail";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "CourseDetail">;

function formatDuration(minutes?: number | null) {
  if (!minutes) return "Self-paced";
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hr`;
  }
  return `${minutes} min`;
}

function titleCase(value?: string | null) {
  if (!value) return "All levels";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

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

export function CourseDetailScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollmentWarning, setEnrollmentWarning] = useState<string | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEnrollmentWarning(null);
    try {
      const detail = await getCourse(courseId);
      setCourse(detail);

      try {
        const { enrollments } = await getMyEnrollments();
        setIsEnrolled(hasActiveEnrollment(enrollments, detail.id));
      } catch {
        setEnrollmentWarning(
          "We could not verify your enrollment status. Check your connection and retry before enrolling."
        );
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEnroll = async () => {
    if (!course) return;
    setEnrollError(null);

    setEnrolling(true);
    try {
      await selfEnroll(course.id);
      setIsEnrolled(true);
      setEnrollmentWarning(null);
    } catch (err) {
      setEnrollError(getApiErrorMessage(err));
    } finally {
      setEnrolling(false);
    }
  };

  const handleBuy = async () => {
    if (!course) return;
    setEnrollError(null);
    setEnrolling(true);
    try {
      const result = await createCourseCheckout(course.id, "khqr");
      navigation.navigate("Checkout", {
        paymentId: result.payment.id,
        courseId: course.id,
        courseTitle: course.title,
        amount: Number(result.payment.amount),
        currency: result.payment.currency,
        gateway: result.payment.gateway,
        expiresInSeconds: result.checkout?.expiresInSeconds ?? 300,
      });
    } catch (err) {
      setEnrollError(getApiErrorMessage(err));
    } finally {
      setEnrolling(false);
    }
  };

  const goToMyCourses = () => {
    (navigation.getParent() as any)?.navigate("My Courses");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !course) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load this course</Text>
          <Text style={styles.centerText}>
            {error ?? "The course could not be found."}
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
            <Text style={styles.textButtonText}>Back to catalog</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const price = Number(course.price ?? 0);
  const isFree = course.isFree || !price || price === 0;
  const outcomes = Array.isArray(course.learningOutcomes)
    ? course.learningOutcomes
    : [];
  const prerequisites = Array.isArray(course.prerequisites)
    ? course.prerequisites
    : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Back to catalog</Text>
        </Pressable>

        <View style={styles.heroCard}>
          <CourseThumbnail
            title={course.title}
            thumbnailUrl={course.thumbnailUrl}
            level={course.level}
            height={180}
          />
          <View style={styles.heroBody}>
            <View style={styles.badgeRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  {titleCase(course.level)}
                </Text>
              </View>
              <View
                style={[
                  styles.priceBadge,
                  isFree ? styles.freeBadge : styles.paidBadge,
                ]}
              >
                <Text
                  style={[
                    styles.priceBadgeText,
                    isFree ? styles.freeText : styles.paidText,
                  ]}
                >
                  {isFree ? "Free" : `$${price.toFixed(2)} ${course.currency ?? "USD"}`}
                </Text>
              </View>
            </View>

            <Text testID="course-detail-title" style={styles.title}>
              {course.title}
            </Text>
            <Text style={styles.description}>{course.description}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {formatDuration(course.duration)}
              </Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>
                {course._count?.enrollments ?? 0} students
              </Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>
                {course.modules.length} module
                {course.modules.length === 1 ? "" : "s"}
              </Text>
            </View>

            <View style={styles.instructorRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {course.instructor.firstName.charAt(0)}
                  {course.instructor.lastName.charAt(0)}
                </Text>
              </View>
              <View>
                <Text style={styles.instructorName}>
                  {course.instructor.firstName} {course.instructor.lastName}
                </Text>
                <Text style={styles.instructorRole}>Instructor</Text>
              </View>
            </View>
          </View>
        </View>

        {enrollmentWarning ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>{enrollmentWarning}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={load}
              style={styles.retryLink}
            >
              <Text style={styles.retryLinkText}>Retry enrollment check</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.actionCard}>
          {isEnrolled ? (
            <>
              <Text testID="enrollment-status" style={styles.enrolledTitle}>
                You're enrolled in this course
              </Text>
              <Text style={styles.actionBody}>
                Course content and lesson progress are ready when you are.
              </Text>
              <Pressable
                testID="continue-learning-button"
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate("CourseContent", {
                    courseId: course.id,
                    title: course.title,
                  })
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.fullWidthButton,
                  pressed && styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Continue learning</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={goToMyCourses}
                style={styles.textButton}
              >
                <Text style={styles.textButtonText}>Go to My Courses</Text>
              </Pressable>
            </>
          ) : isFree ? (
            <>
              <Text style={styles.actionTitle}>Free enrollment</Text>
              <Text style={styles.actionBody}>
                Enroll now to add this course to My Courses and track your
                progress.
              </Text>
              {enrollError ? (
                <Text style={styles.errorText}>{enrollError}</Text>
              ) : null}
              <Pressable
                testID="enroll-button"
                accessibilityRole="button"
                onPress={handleEnroll}
                disabled={enrolling}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.fullWidthButton,
                  (pressed || enrolling) && styles.primaryButtonPressed,
                ]}
              >
                {enrolling ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Enroll for free
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.actionTitle}>Paid course</Text>
              <Text style={styles.actionBody}>
                Pay securely with KHQR or ABA PayWay. Course access unlocks
                automatically after the payment is confirmed.
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceValue}>${price.toFixed(2)}</Text>
                <Text style={styles.priceCurrency}>
                  {course.currency ?? "USD"}
                </Text>
              </View>
              {enrollError ? (
                <Text style={styles.errorText}>{enrollError}</Text>
              ) : null}
              <Pressable
                testID="buy-course-button"
                accessibilityRole="button"
                onPress={handleBuy}
                disabled={enrolling}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.fullWidthButton,
                  (pressed || enrolling) && styles.primaryButtonPressed,
                ]}
              >
                {enrolling ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Buy / Enroll</Text>
                )}
              </Pressable>
            </>
          )}
        </View>

        {outcomes.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>What you'll learn</Text>
            {outcomes.map((outcome) => (
              <View key={outcome} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{outcome}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Curriculum</Text>
            <Text style={styles.sectionCount}>
              {course.modules.length} modules
            </Text>
          </View>

          {course.modules.length === 0 ? (
            <Text style={styles.mutedText}>
              No modules have been published for this course yet.
            </Text>
          ) : (
            course.modules.map((module, moduleIndex) => (
              <View key={module.id} style={styles.module}>
                <View style={styles.moduleHeader}>
                  <View style={styles.moduleIndex}>
                    <Text style={styles.moduleIndexText}>
                      {moduleIndex + 1}
                    </Text>
                  </View>
                  <View style={styles.moduleTitleWrap}>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleMeta}>
                      {module.lessons.length} lesson
                      {module.lessons.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>

                {module.lessons.map((lesson) => (
                  <View key={lesson.id} style={styles.lessonRow}>
                    <View style={styles.lessonTypeBadge}>
                      <Text style={styles.lessonTypeText}>
                        {contentTypeLabel(lesson.contentType)}
                      </Text>
                    </View>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <View style={styles.lessonRight}>
                      {lesson.isPreview ? (
                        <Text style={styles.previewBadge}>Preview</Text>
                      ) : null}
                      <Text style={styles.lessonDuration}>
                        {lesson.duration ? `${lesson.duration} min` : ""}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        {prerequisites.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Prerequisites</Text>
            {prerequisites.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
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
  backButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  backButtonText: { color: "#0f766e", fontSize: 14, fontWeight: "800" },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    overflow: "hidden",
  },
  heroBody: { padding: 18 },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  levelBadge: {
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelBadgeText: { color: "#3730a3", fontSize: 11, fontWeight: "800" },
  priceBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  freeBadge: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  paidBadge: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  priceBadgeText: { fontSize: 11, fontWeight: "800" },
  freeText: { color: "#047857" },
  paidText: { color: "#c2410c" },
  title: {
    color: "#10233f",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 31,
  },
  description: {
    color: "#5b677a",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 14,
  },
  metaText: { color: "#7a8699", fontSize: 12, fontWeight: "600" },
  metaDot: { color: "#c3cbd8", fontSize: 12, marginHorizontal: 6 },
  instructorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eef1f6",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  instructorName: { color: "#10233f", fontSize: 14, fontWeight: "800" },
  instructorRole: { color: "#7a8699", fontSize: 12, marginTop: 2 },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 18,
  },
  warningCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 14,
    gap: 8,
  },
  warningText: { color: "#92400e", fontSize: 12, lineHeight: 18 },
  retryLink: { alignSelf: "flex-start", minHeight: 32, justifyContent: "center" },
  retryLinkText: { color: "#0f766e", fontSize: 12, fontWeight: "800" },
  actionTitle: { color: "#10233f", fontSize: 18, fontWeight: "800" },
  enrolledTitle: { color: "#047857", fontSize: 18, fontWeight: "800" },
  actionBody: {
    color: "#5b677a",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 12,
  },
  priceValue: { color: "#10233f", fontSize: 30, fontWeight: "900" },
  priceCurrency: { color: "#7a8699", fontSize: 12, fontWeight: "700" },
  primaryButton: {
    marginTop: 14,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonPressed: { opacity: 0.8 },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  fullWidthButton: { width: "100%" },
  disabledButton: {
    marginTop: 14,
    backgroundColor: "#eef2f6",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
  },
  disabledButtonText: { color: "#7a8699", fontSize: 13, fontWeight: "700" },
  textButton: { paddingVertical: 8 },
  textButtonText: { color: "#5b677a", fontSize: 13, fontWeight: "700" },
  errorText: {
    color: "#b42318",
    backgroundColor: "#fff5f4",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#10233f",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  sectionCount: { color: "#7a8699", fontSize: 12, fontWeight: "700" },
  bulletRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0f766e",
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    color: "#5b677a",
    fontSize: 13,
    lineHeight: 20,
  },
  mutedText: { color: "#7a8699", fontSize: 13, lineHeight: 20 },
  module: {
    borderTopWidth: 1,
    borderTopColor: "#eef1f6",
    paddingTop: 14,
    marginTop: 14,
  },
  moduleHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  moduleIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#e6f4f1",
    alignItems: "center",
    justifyContent: "center",
  },
  moduleIndexText: { color: "#0f766e", fontSize: 12, fontWeight: "800" },
  moduleTitleWrap: { flex: 1 },
  moduleTitle: { color: "#10233f", fontSize: 14, fontWeight: "800" },
  moduleMeta: { color: "#7a8699", fontSize: 11, marginTop: 2 },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    paddingLeft: 36,
  },
  lessonTypeBadge: {
    backgroundColor: "#eef2f6",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  lessonTypeText: { color: "#5b677a", fontSize: 10, fontWeight: "800" },
  lessonTitle: {
    flex: 1,
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
  },
  lessonRight: { alignItems: "flex-end", gap: 2 },
  previewBadge: { color: "#047857", fontSize: 10, fontWeight: "800" },
  lessonDuration: { color: "#94a3b8", fontSize: 10 },
});
