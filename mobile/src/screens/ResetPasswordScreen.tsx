import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApiErrorMessage } from "../api/client";
import { resetPasswordRequest } from "../api/auth";
import type { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const [token, setToken] = useState(route.params?.token ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!token.trim()) {
      setError("Enter the reset code from your email.");
      return;
    }
    if (password.length < 8) {
      setError("The new password must be at least 8 characters.");
      return;
    }
    if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setError(
        "Use an uppercase letter, a lowercase letter, and a number."
      );
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resetPasswordRequest(token.trim(), password);
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text testID="reset-password-success" style={styles.title}>
            Password reset
          </Text>
          <Text style={styles.body}>
            Your password has been changed. Sign in with the new password.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Login")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Back to sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.eyebrow}>Account recovery</Text>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.body}>
            Paste the reset code from your email and choose a new password.
          </Text>
          <View style={styles.card}>
            <Text style={styles.label}>Reset code</Text>
            <TextInput
              testID="reset-password-token"
              value={token}
              onChangeText={setToken}
              placeholder="Reset code"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={styles.label}>New password</Text>
            <TextInput
              testID="reset-password-new"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              testID="reset-password-confirm"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat the new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
            {error ? (
              <Text testID="reset-password-error" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Pressable
              testID="reset-password-submit"
              accessibilityRole="button"
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || submitting) && styles.buttonPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Reset password</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  backButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  backButtonText: { color: "#0f766e", fontSize: 14, fontWeight: "800" },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#10233f",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    color: "#5b677a",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 18,
    gap: 8,
    marginTop: 8,
  },
  label: { color: "#334155", fontSize: 12, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 12,
    backgroundColor: "#fbfcfe",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#10233f",
    fontSize: 15,
  },
  error: {
    color: "#b42318",
    backgroundColor: "#fff5f4",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  buttonPressed: { opacity: 0.75 },
});
