import { useEffect, useRef, useState } from "react";
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
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApiErrorMessage } from "../api/client";
import { changePasswordRequest } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import type { ProfileStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "ChangePassword">;

export function ChangePasswordScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, []);

  const handleChange = async () => {
    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("The new password must be at least 8 characters.");
      return;
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      setError(
        "The new password must include an uppercase letter, a lowercase letter, and a number."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await changePasswordRequest(currentPassword, newPassword);
      setSuccess(true);
      logoutTimer.current = setTimeout(() => {
        logout();
      }, 1200);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color="#047857" />
          <Text testID="change-password-success" style={styles.successTitle}>
            Password changed
          </Text>
          <Text style={styles.centerText}>
            Signing you out so you can sign in with your new password.
          </Text>
          <ActivityIndicator color="#0f766e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹ Profile</Text>
          </Pressable>

          <Text style={styles.eyebrow}>Security</Text>
          <Text style={styles.title}>Change password</Text>
          <Text style={styles.subtitle}>
            Your current session will end after the password is changed.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Current password</Text>
            <TextInput
              testID="change-password-current"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>New password</Text>
            <TextInput
              testID="change-password-new"
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              testID="change-password-confirm"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              placeholder="Repeat the new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.hint}>
              Use at least 8 characters with an uppercase letter, a lowercase
              letter, and a number.
            </Text>

            {error ? (
              <Text testID="change-password-error" style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            <Pressable
              testID="change-password-submit"
              accessibilityRole="button"
              onPress={handleChange}
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || saving) && styles.buttonPressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Change password</Text>
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
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  backButton: { alignSelf: "flex-start", paddingVertical: 4 },
  backButtonText: { color: "#0f766e", fontSize: 14, fontWeight: "800" },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 6,
  },
  title: { color: "#10233f", fontSize: 26, fontWeight: "800", marginTop: 4 },
  subtitle: { color: "#5b677a", fontSize: 13, lineHeight: 20 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
    marginTop: 4,
  },
  label: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 12,
    backgroundColor: "#fbfcfe",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#10233f",
    fontSize: 14,
  },
  hint: {
    color: "#7a8699",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },
  errorText: {
    color: "#b42318",
    backgroundColor: "#fff5f4",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  buttonPressed: { opacity: 0.75 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  successTitle: {
    color: "#047857",
    fontSize: 24,
    fontWeight: "900",
  },
  centerText: {
    color: "#5b677a",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
