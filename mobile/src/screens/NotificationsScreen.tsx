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
  AppNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import type { HomeStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "Notifications">;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function iconForType(type: string) {
  switch (type) {
    case "PAYMENT_CONFIRMED":
      return "card-outline" as const;
    case "GRADE_PUBLISHED":
    case "QUIZ_GRADED":
    case "ASSIGNMENT_GRADED":
      return "ribbon-outline" as const;
    case "COURSE_UPDATE":
      return "book-outline" as const;
    case "ENROLLMENT_APPROVED":
      return "school-outline" as const;
    case "WAITLIST_APPROVED":
      return "time-outline" as const;
    default:
      return "notifications-outline" as const;
  }
}

export function NotificationsScreen({ navigation }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const requestId = useRef(0);

  const load = useCallback(async (showSpinner: boolean) => {
    const id = ++requestId.current;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const result = await getMyNotifications();
      if (id !== requestId.current) return;
      setNotifications(result.notifications);
      const fallbackUnread = result.notifications.filter(
        (item) => !item.isRead
      ).length;
      setUnreadCount(result.meta?.unreadCount ?? fallbackUnread);
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

  const openTarget = (item: AppNotification) => {
    const parent = navigation.getParent() as any;

    switch (item.entityType) {
      case "Course":
        if (item.entityId) {
          navigation.popToTop();
          parent?.navigate("Browse", {
            screen: "CourseDetail",
            params: { courseId: item.entityId },
          });
        }
        break;
      case "Assignment":
        if (item.entityId) {
          navigation.popToTop();
          parent?.navigate("Browse", {
            screen: "AssignmentDetail",
            params: { assignmentId: item.entityId },
          });
        }
        break;
      case "QuizAttempt":
        if (item.entityId) {
          navigation.popToTop();
          parent?.navigate("Browse", {
            screen: "QuizResult",
            params: { attemptId: item.entityId },
          });
        }
        break;
      case "Lesson":
        if (item.entityId) {
          navigation.popToTop();
          parent?.navigate("Browse", {
            screen: "LessonViewer",
            params: { lessonId: item.entityId },
          });
        }
        break;
      case "Grade":
        navigation.popToTop();
        parent?.navigate("Grades");
        break;
      case "Payment":
        if (item.entityId) {
          navigation.popToTop();
          parent?.navigate("Browse", {
            screen: "PaymentDetail",
            params: { paymentId: item.entityId },
          });
        }
        break;
      case "Enrollment":
      case "Waitlist":
        navigation.popToTop();
        parent?.navigate("My Courses");
        break;
      default:
        break;
    }
  };

  const handlePress = async (item: AppNotification) => {
    if (markingId) return;
    setActionMessage(null);

    if (!item.isRead) {
      setMarkingId(item.id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      try {
        await markNotificationRead(item.id);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setMarkingId(null);
      }
    }

    openTarget(item);
  };

  const handleMarkAll = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setActionMessage(null);
    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt ?? new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      setActionMessage("All notifications marked as read.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <Pressable
      testID={`notification-item-${item.id}`}
      accessibilityRole="button"
      onPress={() => handlePress(item)}
      style={({ pressed }) => [
        styles.card,
        !item.isRead && styles.cardUnread,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={iconForType(item.type)}
          size={20}
          color={item.isRead ? "#7a8699" : "#0f766e"}
        />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {!item.isRead ? (
            <View
              testID={`notification-unread-dot-${item.id}`}
              style={styles.unreadDot}
            />
          ) : null}
        </View>
        <Text
          style={[styles.message, !item.isRead && styles.messageUnread]}
          numberOfLines={3}
        >
          {item.message}
        </Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>

      {markingId === item.id ? (
        <ActivityIndicator size="small" color="#0f766e" />
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          testID="notifications-back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Home</Text>
        </Pressable>

        <View style={styles.titleRowHeader}>
          <View>
            <Text style={styles.eyebrow}>Inbox</Text>
            <Text testID="notifications-title" style={styles.title}>
              Notifications
            </Text>
            <Text style={styles.subtitle}>
              {unreadCount} unread notification
              {unreadCount === 1 ? "" : "s"}
            </Text>
          </View>
          <Pressable
            testID="notifications-mark-all"
            accessibilityRole="button"
            disabled={markingAll || unreadCount === 0}
            onPress={handleMarkAll}
            style={({ pressed }) => [
              styles.markAllButton,
              (pressed || markingAll || unreadCount === 0) &&
                styles.buttonDisabled,
            ]}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color="#0f766e" />
            ) : (
              <Text style={styles.markAllText}>Mark all read</Text>
            )}
          </Pressable>
        </View>
      </View>

      {actionMessage ? (
        <Text style={styles.actionMessage}>{actionMessage}</Text>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading notifications...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#b42318" />
          <Text style={styles.errorTitle}>Could not load notifications</Text>
          <Text style={styles.centerText}>{error}</Text>
          <Pressable
            testID="notifications-retry"
            accessibilityRole="button"
            onPress={() => load(true)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          testID="notifications-list"
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
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
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color="#94a3b8"
              />
              <Text testID="notifications-empty" style={styles.errorTitle}>
                No notifications yet
              </Text>
              <Text style={styles.centerText}>
                Course updates, grades, payments, and announcements will appear
                here.
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
  titleRowHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: { color: "#10233f", fontSize: 26, fontWeight: "800", marginTop: 4 },
  subtitle: { color: "#5b677a", fontSize: 12, marginTop: 4 },
  markAllButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: "center",
  },
  markAllText: { color: "#0f766e", fontSize: 11, fontWeight: "800" },
  actionMessage: {
    color: "#047857",
    backgroundColor: "#ecfdf5",
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: { padding: 20, paddingTop: 14, gap: 10, flexGrow: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 14,
  },
  cardUnread: {
    backgroundColor: "#f0fdfa",
    borderColor: "#99f6e4",
  },
  cardPressed: { opacity: 0.75 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#eef2f6",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  cardTitleUnread: { color: "#10233f", fontWeight: "800" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0f766e",
    marginTop: 5,
  },
  message: {
    color: "#7a8699",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  messageUnread: { color: "#5b677a" },
  date: { color: "#94a3b8", fontSize: 10, marginTop: 6 },
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
  buttonDisabled: { opacity: 0.6 },
});
