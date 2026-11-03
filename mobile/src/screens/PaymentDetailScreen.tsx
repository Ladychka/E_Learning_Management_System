import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApiErrorMessage } from "../api/client";
import { getPayment, getPaymentInvoice, PaymentDetail, PaymentInvoice } from "../api/payments";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "PaymentDetail">;

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

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
    default:
      return { label: status, color: "#5b677a", background: "#eef2f6" };
  }
}

export function PaymentDetailScreen({ navigation, route }: Props) {
  const { paymentId } = route.params;
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<PaymentInvoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPayment(await getPayment(paymentId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    load();
  }, [load]);

  const openInvoice = async () => {
    setShowInvoice(true);
    if (invoice || invoiceLoading) return;
    setInvoiceLoading(true);
    setInvoiceError(null);
    try {
      setInvoice(await getPaymentInvoice(paymentId));
    } catch (err) {
      setInvoiceError(getApiErrorMessage(err));
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !payment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#b42318" />
          <Text style={styles.errorTitle}>Could not load payment</Text>
          <Text style={styles.centerText}>{error ?? "Payment not found."}</Text>
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

  const tone = statusTone(payment.status);
  const amount = Number(payment.amount);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.eyebrow}>Payment</Text>
        <Text testID="payment-detail-title" style={styles.title}>
          {payment.course?.title ?? "Payment record"}
        </Text>

        <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
          <Text
            testID="payment-detail-status"
            style={[styles.statusText, { color: tone.color }]}
          >
            {tone.label}
          </Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text testID="payment-detail-amount" style={styles.amountValue}>
            {payment.currency} {amount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Gateway</Text>
            <Text style={styles.value}>{payment.gateway}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.value}>{payment.gatewayRef ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Created</Text>
            <Text style={styles.value}>{formatDate(payment.createdAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Paid</Text>
            <Text style={styles.value}>{formatDate(payment.paidAt)}</Text>
          </View>
        </View>

        <Pressable
          testID="payment-detail-invoice"
          accessibilityRole="button"
          onPress={openInvoice}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>View invoice</Text>
        </Pressable>

        {payment.course ? (
          <Pressable
            testID="payment-detail-course"
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("CourseDetail", {
                courseId: payment.course!.id,
                title: payment.course!.title,
              })
            }
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Open course</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        visible={showInvoice}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInvoice(false)}
      >
        <View style={styles.modalBackdrop}>
          <View testID="invoice-modal" style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Invoice</Text>
            {invoiceLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color="#0f766e" />
                <Text style={styles.centerText}>Preparing invoice...</Text>
              </View>
            ) : invoiceError ? (
              <Text testID="invoice-error" style={styles.errorText}>
                {invoiceError}
              </Text>
            ) : invoice ? (
              <>
                <Text style={styles.modalTitle}>{invoice.invoiceNumber}</Text>
                <Text style={styles.modalMeta}>
                  Issued {formatDate(invoice.issuedAt)}
                </Text>
                <Text style={styles.modalMeta}>
                  Billed to {invoice.billedTo.name}
                  {invoice.billedTo.email ? ` · ${invoice.billedTo.email}` : ""}
                </Text>
                {invoice.items.map((item, index) => (
                  <View key={`${item.description}-${index}`} style={styles.row}>
                    <Text style={styles.label}>{item.description}</Text>
                    <Text style={styles.value}>
                      {item.currency} {Number(item.amount).toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={styles.row}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    {invoice.currency} {Number(invoice.total).toFixed(2)}
                  </Text>
                </View>
              </>
            ) : null}
            <Pressable
              testID="invoice-close"
              accessibilityRole="button"
              onPress={() => setShowInvoice(false)}
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
  content: { padding: 20, gap: 14 },
  backButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  backButtonText: { color: "#0f766e", fontSize: 14, fontWeight: "800" },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: { color: "#10233f", fontSize: 24, fontWeight: "800" },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  amountCard: {
    backgroundColor: "#10233f",
    borderRadius: 18,
    padding: 18,
  },
  amountLabel: {
    color: "#99f6e4",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  amountValue: { color: "#ffffff", fontSize: 30, fontWeight: "900", marginTop: 6 },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
    gap: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: { color: "#7a8699", fontSize: 12, fontWeight: "700" },
  value: {
    flex: 1,
    color: "#10233f",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#0f766e", fontSize: 13, fontWeight: "800" },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 12,
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
    gap: 8,
  },
  modalEyebrow: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalTitle: { color: "#10233f", fontSize: 20, fontWeight: "800" },
  modalMeta: { color: "#7a8699", fontSize: 11, lineHeight: 17 },
  totalLabel: { color: "#10233f", fontSize: 14, fontWeight: "800" },
  totalValue: { color: "#047857", fontSize: 15, fontWeight: "900" },
  errorText: {
    color: "#b42318",
    backgroundColor: "#fff5f4",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
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
