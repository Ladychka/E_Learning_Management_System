import { useCallback, useEffect, useRef, useState } from "react";
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApiErrorMessage } from "../api/client";
import {
  Announcement,
  getMyAnnouncements,
  markAnnouncementRead,
} from "../api/announcements";
import type { HomeStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "Announcements">;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function priorityStyle(priority?: string | null) {
  if (priority === "urgent" || priority === "high") {
    return { background: "#fef3f2", color: "#b42318", label: "Important" };
  }
  return { background: "#eef2f6", color: "#5b677a", label: "Update" };
}

export function AnnouncementsScreen({ navigation }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (showSpinner: boolean) => {
    const id = ++requestId.current;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await getMyAnnouncements();
      if (id !== requestId.current) return;
      setAnnouncements(data);
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

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const markRead = async (announcement: Announcement) => {
    if (announcement.isRead || markingId) return;
    setMarkingId(announcement.id);
    setAnnouncements((current) =>
      current.map((item) =>
        item.id === announcement.id ? { ...item, isRead: true } : item
      )
    );
    try {
      await markAnnouncementRead(announcement.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setAnnouncements((current) =>
        current.map((item) =>
          item.id === announcement.id ? { ...item, isRead: false } : item
        )
      );
    } finally {
      setMarkingId(null);
    }
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => {
    const tone = priorityStyle(item.priority);
    return (
      <Pressable
        testID={`announcement-card-${item.id}`}
        accessibilityRole="button"
        onPress={() => {
          void markRead(item);
        }}
        style={({ pressed }) => [
          styles.card,
          !item.isRead && styles.cardUnread,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: tone.background }]}>
            <Text style={[styles.badgeText, { color: tone.color }]}>
              {tone.label}
            </Text>
          </View>
          {!item.isRead ? (
            <View testID={`announcement-unread-${item.id}`} style={styles.dot} />
          ) : null}
        </View>
        <Text style={styles.announcementTitle}>{item.title}</Text>
        <Text style={styles.content}>{item.content}</Text>
        <Text style={styles.meta}>
          {item.course?.title ?? "Platform announcement"}
          {item.creator
            ? ` · ${item.creator.firstName} ${item.creator.lastName}`
            : ""}
          {` · ${formatDate(item.createdAt)}`}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          testID="announcements-back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={18} color="#0f766e" />
          <Text style={styles.backButtonText}>Home</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Inbox</Text>
        <Text testID="announcements-title" style={styles.title}>
          Announcements
        </Text>
        <Text style={styles.subtitle}>
          Updates from your courses and the ELMS team.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading announcements...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#b42318" />
          <Text style={styles.errorTitle}>Could not load announcements</Text>
          <Text style={styles.centerText}>{error}</Text>
          <Pressable
            testID="announcements-retry"
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
          testID="announcements-list"
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={renderAnnouncement}
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
                name="megaphone-outline"
                size={48}
                color="#94a3b8"
              />
              <Text testID="announcements-empty" style={styles.errorTitle}>
                No announcements yet
              </Text>
              <Text style={styles.centerText}>
                Course updates and platform news will appear here.
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
  backButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  backButtonText: { color: "#0f766e", fontSize: 14, fontWeight: "800" },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  title: { color: "#10233f", fontSize: 26, fontWeight: "800", marginTop: 4 },
  subtitle: { color: "#5b677a", fontSize: 13, marginTop: 4 },
  listContent: { padding: 20, paddingTop: 14, gap: 10, flexGrow: 1 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  cardUnread: { backgroundColor: "#f0fdfa", borderColor: "#99f6e4" },
  cardPressed: { opacity: 0.78 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0f766e",
  },
  announcementTitle: { color: "#10233f", fontSize: 16, fontWeight: "800", marginTop: 10 },
  content: {
    color: "#5b677a",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  meta: { color: "#94a3b8", fontSize: 10, marginTop: 10 },
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
  buttonPressed: { opacity: 0.75 },
});
