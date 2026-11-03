import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { resolveAssetUrl } from "../config";
import type { ProfileStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = avatarFailed ? null : resolveAssetUrl(user?.avatarUrl);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Account</Text>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          {avatarUrl ? (
            <Image
              testID="profile-avatar"
              accessibilityLabel="Profile avatar"
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View
              testID="profile-avatar"
              accessible
              accessibilityLabel="Profile avatar initials"
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {user?.firstName?.charAt(0) ?? "S"}
                {user?.lastName?.charAt(0) ?? ""}
              </Text>
            </View>
          )}

          <Text testID="profile-name" style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text testID="profile-email" style={styles.email}>
            {user?.email}
          </Text>
          <View style={styles.badge}>
            <Text testID="profile-role" style={styles.badgeText}>
              {user?.role}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <DetailRow label="Bio" value={user?.profile?.bio} />
          <DetailRow label="Phone" value={user?.profile?.phone} />
          <DetailRow label="Address" value={user?.profile?.address} />
          <DetailRow label="Education" value={user?.profile?.education} />
          <DetailRow label="Occupation" value={user?.profile?.occupation} />
          {!user?.profile?.bio &&
          !user?.profile?.phone &&
          !user?.profile?.address &&
          !user?.profile?.education &&
          !user?.profile?.occupation ? (
            <Text style={styles.mutedText}>
              Add a bio and contact details to complete your profile.
            </Text>
          ) : null}
        </View>

        <Pressable
          testID="edit-profile-button"
          accessibilityRole="button"
          onPress={() => navigation.navigate("EditProfile")}
          style={({ pressed }) => [
            styles.menuRow,
            pressed && styles.menuRowPressed,
          ]}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="person-outline" size={18} color="#0f766e" />
          </View>
          <Text style={styles.menuText}>Edit profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </Pressable>

        <Pressable
          testID="change-password-button"
          accessibilityRole="button"
          onPress={() => navigation.navigate("ChangePassword")}
          style={({ pressed }) => [
            styles.menuRow,
            pressed && styles.menuRowPressed,
          ]}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="lock-closed-outline" size={18} color="#0f766e" />
          </View>
          <Text style={styles.menuText}>Change password</Text>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </Pressable>

        <Pressable
          testID="profile-logout"
          accessibilityRole="button"
          onPress={handleLogout}
          disabled={signingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            (pressed || signingOut) && styles.logoutButtonPressed,
          ]}
        >
          {signingOut ? (
            <ActivityIndicator color="#b42318" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#b42318" />
              <Text style={styles.logoutText}>Sign out</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 24, paddingBottom: 40, gap: 12 },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: { color: "#10233f", fontSize: 28, fontWeight: "800", marginTop: 4 },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    alignItems: "center",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 76, height: 76, borderRadius: 38 },
  avatarText: { color: "#ffffff", fontSize: 26, fontWeight: "800" },
  name: {
    color: "#10233f",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  email: { color: "#5b677a", fontSize: 13, marginTop: 4 },
  badge: {
    backgroundColor: "#e6f4f1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  badgeText: { color: "#0f766e", fontSize: 11, fontWeight: "800" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
  },
  cardTitle: {
    color: "#10233f",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 5,
  },
  detailLabel: { color: "#7a8699", fontSize: 12, fontWeight: "700" },
  detailValue: {
    flex: 1,
    color: "#334155",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
  },
  mutedText: { color: "#7a8699", fontSize: 12, lineHeight: 18 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 14,
  },
  menuRowPressed: { opacity: 0.75 },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e6f4f1",
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1, color: "#10233f", fontSize: 14, fontWeight: "700" },
  logoutButton: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f4c7c3",
    backgroundColor: "#fff5f4",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonPressed: { opacity: 0.7 },
  logoutText: { color: "#b42318", fontSize: 15, fontWeight: "700" },
});
