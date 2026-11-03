import { useCallback, useEffect, useState } from "react";
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
  getPaymentHistory,
  PaymentHistoryItem,
} from "../api/payments";
import type { ProfileStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "PaymentHistory">;

function statusTone(status: string) {
  switch (status) {
    case "completed":
      return { label: "Completed", color: "#047857", background: "#ecfdf5" };
    case "pending":
      return { label: "Pending", color: "#b45309", background: "#fffbeb" };
    case "failed":
      return { label: "Failed", color: "#b42318", background: "#fef3f2" };
    case "expired":
      return { label: "Expired", color: "#b45309", background: "#fffbeb" };
    case "refunded":
      return { label: "Refunded", color: "#5b677a", background: "#eef2f6" };
    default:
      return { label: status, color: "#5b677a", background: "#eef2f6" };
  }
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export function PaymentHistoryScreen({ navigation }: Props) {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      setPayments(await getPaymentHistory());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const openPayment = (paymentId: string) => {
    (navigation.getParent() as any)?.navigate("Browse", {
      screen: "PaymentDetail",
      params: { paymentId },
    });
  };

  const renderPayment = ({ item }: { item: PaymentHistoryItem }) => {
    const tone = statusTone(item.status);
    const amount = Number(item.amount);
    return (
      <Pressable
        testID={`payment-history-${item.id}`}
        accessibilityRole="button"
        onPress={() => openPayment(item.id)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.row}>
          <View style={styles.titleWrap}>
            <Text numberOfLines={2} style={styles.courseTitle}>
              {item.course?.title ?? "Subscription payment"}
            </Text>
            <Text style={styles.meta}>
              {formatDate(item.paidAt ?? item.createdAt)}
              {item.gateway ? ` · ${item.gateway.toUpperCase()}` : ""}
            </Text>
          </View>
          <Text style={styles.amount}>
            {item.currency} {amount.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
          <Text style={[styles.statusText, { color: tone.color }]}>
            {tone.label}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          testID="payment-history-back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={18} color="#0f766e" />
          <Text style={styles.backButtonText}>Profile</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Billing</Text>
        <Text testID="payment-history-title" style={styles.title}>
          Payment history
        </Text>
        <Text style={styles.subtitle}>
          Receipts and payment status for your course purchases.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading payments...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#b42318" />
          <Text style={styles.errorTitle}>Could not load payment history</Text>
          <Text style={styles.centerText}>{error}</Text>
          <Pressable
            testID="payment-history-retry"
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
          testID="payment-history-list"
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={renderPayment}
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
              <Ionicons name="receipt-outline" size={48} color="#94a3b8" />
              <Text testID="payment-history-empty" style={styles.errorTitle}>
                No payments yet
              </Text>
              <Text style={styles.centerText}>
                Payments for paid courses will appear here.
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
  cardPressed: { opacity: 0.78 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleWrap: { flex: 1 },
  courseTitle: { color: "#10233f", fontSize: 15, fontWeight: "800" },
  meta: { color: "#7a8699", fontSize: 11, marginTop: 4 },
  amount: { color: "#10233f", fontSize: 16, fontWeight: "800" },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 10,
  },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
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
