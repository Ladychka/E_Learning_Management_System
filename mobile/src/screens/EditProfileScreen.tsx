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
import { updateProfileRequest } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import type { ProfileStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "EditProfile">;

export function EditProfileScreen({ navigation }: Props) {
  const { user, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [bio, setBio] = useState(user?.profile?.bio ?? "");
  const [phone, setPhone] = useState(user?.profile?.phone ?? "");
  const [address, setAddress] = useState(user?.profile?.address ?? "");
  const [education, setEducation] = useState(user?.profile?.education ?? "");
  const [occupation, setOccupation] = useState(user?.profile?.occupation ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfileRequest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        address: address.trim(),
        education: education.trim(),
        occupation: occupation.trim(),
      });
      updateUser(updated);
      navigation.goBack();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

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

          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.title}>Edit profile</Text>
          <Text style={styles.subtitle}>
            Update the details the student mobile app supports.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              testID="edit-profile-first-name"
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              placeholder="First name"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Last name</Text>
            <TextInput
              testID="edit-profile-last-name"
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              placeholder="Last name"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              testID="edit-profile-bio"
              value={bio}
              onChangeText={setBio}
              style={[styles.input, styles.multiline]}
              placeholder="A short introduction"
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              testID="edit-profile-phone"
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              placeholder="+855 ..."
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Address</Text>
            <TextInput
              testID="edit-profile-address"
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              placeholder="City, country"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Education</Text>
            <TextInput
              testID="edit-profile-education"
              value={education}
              onChangeText={setEducation}
              style={styles.input}
              placeholder="School or degree"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Occupation</Text>
            <TextInput
              testID="edit-profile-occupation"
              value={occupation}
              onChangeText={setOccupation}
              style={styles.input}
              placeholder="Current occupation"
              placeholderTextColor="#94a3b8"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              testID="edit-profile-save"
              accessibilityRole="button"
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || saving) && styles.buttonPressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save changes</Text>
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
  multiline: { minHeight: 88, textAlignVertical: "top" },
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
});
