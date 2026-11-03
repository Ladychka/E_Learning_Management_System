import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
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
import {
  getPaymentQr,
  getPaymentStatus,
  PaymentQr,
  PaymentStatus,
} from "../api/payments";
import { resolveAssetUrl } from "../config";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "Checkout">;

function isTerminalStatus(status: string) {
  return ["completed", "failed", "refunded", "expired"].includes(status);
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export function CheckoutScreen({ navigation, route }: Props) {
  const {
    paymentId,
    courseId,
    courseTitle,
    amount: initialAmount,
    currency: initialCurrency,
    expiresInSeconds = 300,
  } = route.params;

  const mountedRef = useRef(true);
  const expiryCheckDone = useRef(false);
  const [qr, setQr] = useState<PaymentQr | null>(null);
  const [statusData, setStatusData] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrError, setQrError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(
    new Date(Date.now() + expiresInSeconds * 1000).toISOString()
  );
  const [remainingSeconds, setRemainingSeconds] = useState(expiresInSeconds);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadStatus = useCallback(async () => {
    const data = await getPaymentStatus(paymentId);
    if (!mountedRef.current) return data;
    setStatusData(data);
    setStatusError(null);
    if (data.expiresAt) setExpiresAt(data.expiresAt);
    return data;
  }, [paymentId]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setQrError(null);
    setStatusError(null);
    setManualMessage(null);

    const [qrResult, statusResult] = await Promise.allSettled([
      getPaymentQr(paymentId),
      getPaymentStatus(paymentId),
    ]);

    if (!mountedRef.current) return;

    if (qrResult.status === "fulfilled") {
      setQr(qrResult.value);
    } else {
      setQrError(getApiErrorMessage(qrResult.reason));
    }

    if (statusResult.status === "fulfilled") {
      setStatusData(statusResult.value);
      if (statusResult.value.expiresAt) {
        setExpiresAt(statusResult.value.expiresAt);
      }
    } else {
      setStatusError(getApiErrorMessage(statusResult.reason));
    }

    setLoading(false);
  }, [paymentId]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const currentStatus = statusData?.status ?? qr?.status ?? "pending";
  const isLocallyExpired =
    currentStatus === "pending" &&
    remainingSeconds !== null &&
    remainingSeconds <= 0;
  const isExpired = currentStatus === "expired" || isLocallyExpired;
  const isTerminal = isTerminalStatus(currentStatus);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      setRemainingSeconds(
        Math.max(
          0,
          Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
        )
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    if (!paymentId || isTerminal) return;
    if (isExpired) return;

    const interval = setInterval(() => {
      loadStatus().catch(() => {
        // Keep polling through transient network errors.
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [paymentId, isTerminal, isExpired, loadStatus]);

  useEffect(() => {
    if (currentStatus !== "pending" || !isLocallyExpired) return;
    if (expiryCheckDone.current) return;
    expiryCheckDone.current = true;
    loadStatus().catch(() => {
      // The local expiry state still gives the user clear feedback.
    });
  }, [currentStatus, isLocallyExpired, loadStatus]);

  const handleManualCheck = async () => {
    if (checking) return;
    setChecking(true);
    setManualMessage(null);
    try {
      const data = await loadStatus();
      if (data.status === "pending") {
        setManualMessage(
          "Payment is still pending. If you just paid, wait a few seconds and try again."
        );
      } else if (data.status === "expired") {
        setManualMessage(
          "This payment session has expired. Generate a new payment to continue."
        );
      }
    } catch (err) {
      setManualMessage(getApiErrorMessage(err));
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  };

  const openPaymentLink = async () => {
    if (!qr?.payload) return;
    try {
      await Linking.openURL(qr.payload);
    } catch {
      setManualMessage("Could not open the payment link. Please try again.");
    }
  };

  const goToMyCourses = () => {
    (navigation.getParent() as any)?.navigate("My Courses");
  };

  const goToCourse = () => {
    navigation.navigate("CourseDetail", {
      courseId,
      title: courseTitle,
    });
  };

  const startLearning = () => {
    navigation.replace("CourseContent", {
      courseId,
      title: courseTitle,
    });
  };

  if (loading && !qr && !statusData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Preparing your payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!loading && !qr && !statusData) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#b42318" />
          <Text style={styles.errorTitle}>Payment could not be loaded</Text>
          <Text style={styles.centerText}>
            {qrError ?? statusError ?? "Please try again."}
          </Text>
          <Pressable
            testID="checkout-retry"
            accessibilityRole="button"
            onPress={refreshAll}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={goToCourse}
            style={styles.textButton}
          >
            <Text style={styles.textButtonText}>Back to course</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const amount = statusData?.amount ?? qr?.amount ?? initialAmount ?? 0;
  const currency =
    statusData?.currency ?? qr?.currency ?? initialCurrency ?? "USD";
  const qrImageUrl = resolveAssetUrl(qr?.imageUrl);
  const paymentLink =
    qr?.payload && /^https?:\/\//i.test(qr.payload) ? qr.payload : null;
  const providerCheckUnavailable =
    currentStatus === "pending" && statusData?.providerChecked === false;

  if (currentStatus === "completed") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹ Course</Text>
          </Pressable>

          <View testID="checkout-success" style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={64} color="#047857" />
            <Text style={styles.successTitle}>Payment confirmed</Text>
            <Text style={styles.successBody}>
              Your payment for {courseTitle ?? "this course"} was verified and
              your enrollment is now active.
            </Text>
            <Text style={styles.successAmount}>
              {currency} {amount.toFixed(2)}
            </Text>
          </View>

          <Pressable
            testID="checkout-my-courses"
            accessibilityRole="button"
            onPress={goToMyCourses}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Go to My Courses</Text>
          </Pressable>
          <Pressable
            testID="checkout-start-learning"
            accessibilityRole="button"
            onPress={startLearning}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Start learning</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (currentStatus === "failed" || currentStatus === "refunded") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={52} color="#b42318" />
          <Text testID="checkout-failed" style={styles.errorTitle}>
            Payment {currentStatus}
          </Text>
          <Text style={styles.centerText}>
            This payment could not be completed. Please return to the course and
            start a new payment.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={goToCourse}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Back to course</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isExpired) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Ionicons name="time-outline" size={52} color="#b45309" />
          <Text testID="checkout-expired" style={styles.errorTitle}>
            Payment session expired
          </Text>
          <Text style={styles.centerText}>
            The QR or payment link is no longer valid. Generate a new payment to
            continue.
          </Text>
          <Pressable
            testID="checkout-retry"
            accessibilityRole="button"
            onPress={goToCourse}
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
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Course</Text>
        </Pressable>

        <Text style={styles.eyebrow}>Checkout</Text>
        <Text testID="checkout-title" style={styles.title}>
          {courseTitle ?? "Complete payment"}
        </Text>
        <Text style={styles.subtitle}>
          Scan the QR code or open the payment link, then wait for confirmation.
        </Text>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount due</Text>
          <Text testID="checkout-amount" style={styles.amountValue}>
            {currency} {amount.toFixed(2)}
          </Text>
          <Text style={styles.amountMeta}>
            {qr?.bankName || "KHQR / ABA PayWay"}
          </Text>
        </View>

        <View style={styles.qrCard}>
          {qrImageUrl ? (
            <Image
              testID="checkout-qr"
              accessibilityLabel="Payment QR code"
              source={{ uri: qrImageUrl }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={48} color="#94a3b8" />
              <Text style={styles.qrPlaceholderText}>
                Payment QR is not available yet.
              </Text>
            </View>
          )}

          {qrError ? (
            <Text style={styles.inlineError}>{qrError}</Text>
          ) : null}

          {paymentLink ? (
            <Pressable
              testID="checkout-open-link"
              accessibilityRole="button"
              onPress={openPaymentLink}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                Open payment link
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.waitingRow}>
            <View style={styles.waitingDot} />
            <Text testID="checkout-status" style={styles.waitingText}>
              Waiting for payment
            </Text>
            <Text testID="checkout-countdown" style={styles.countdownText}>
              Expires in {formatClock(remainingSeconds)}
            </Text>
          </View>
        </View>

        {providerCheckUnavailable ? (
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color="#92400e" />
            <Text style={styles.noticeText}>
              This payment method does not support instant automatic
              verification. Confirmation may take longer. If you have already
              paid, tap "I've paid" to re-check.
            </Text>
          </View>
        ) : null}

        {statusError ? (
          <View style={styles.errorCard}>
            <Text testID="checkout-network-error" style={styles.inlineError}>
              {statusError}
            </Text>
            <Pressable
              testID="checkout-retry"
              accessibilityRole="button"
              onPress={refreshAll}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {manualMessage ? (
          <Text style={styles.manualMessage}>{manualMessage}</Text>
        ) : null}

        <Pressable
          testID="checkout-paid-button"
          accessibilityRole="button"
          disabled={checking}
          onPress={handleManualCheck}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || checking) && styles.buttonPressed,
          ]}
        >
          {checking ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color="#ffffff" />
              <Text style={styles.primaryButtonText}>I've paid / Check status</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.helperText}>
          Automatic verification runs every 3 seconds. Keep this screen open
          until the payment is confirmed.
        </Text>
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
  subtitle: {
    color: "#5b677a",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
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
  amountValue: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 6,
  },
  amountMeta: { color: "#cbd5e1", fontSize: 11, marginTop: 4 },
  qrCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
    alignItems: "center",
  },
  qrImage: { width: 260, height: 260, borderRadius: 12 },
  qrPlaceholder: {
    width: 260,
    height: 260,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  qrPlaceholderText: { color: "#7a8699", fontSize: 12 },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
    marginTop: 14,
  },
  waitingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
  },
  waitingText: { flex: 1, color: "#92400e", fontSize: 12, fontWeight: "700" },
  countdownText: { color: "#7a8699", fontSize: 12, fontWeight: "700" },
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 12,
  },
  noticeText: {
    flex: 1,
    color: "#92400e",
    fontSize: 12,
    lineHeight: 18,
  },
  errorCard: { gap: 8 },
  inlineError: {
    color: "#b42318",
    backgroundColor: "#fff5f4",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  manualMessage: {
    color: "#5b677a",
    backgroundColor: "#eef2f6",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  secondaryButton: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#0f766e", fontSize: 13, fontWeight: "800" },
  buttonPressed: { opacity: 0.75 },
  textButton: { paddingVertical: 8 },
  textButtonText: { color: "#5b677a", fontSize: 13, fontWeight: "700" },
  helperText: {
    color: "#7a8699",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  successCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    padding: 24,
    alignItems: "center",
    marginTop: 20,
  },
  successTitle: {
    color: "#047857",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 12,
  },
  successBody: {
    color: "#065f46",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  successAmount: {
    color: "#047857",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 14,
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
