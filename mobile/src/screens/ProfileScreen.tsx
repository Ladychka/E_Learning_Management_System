import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

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
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.meta}>{user?.email}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{user?.role}</Text>
          </View>
        </View>

        <Pressable
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
            <Text style={styles.logoutText}>Sign out</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { flex: 1, padding: 24 },
  title: { color: "#10233f", fontSize: 28, fontWeight: "800" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e3e8f0",
  },
  name: { color: "#10233f", fontSize: 20, fontWeight: "800" },
  meta: { color: "#5b677a", fontSize: 14, marginTop: 6 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e6f4f1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  badgeText: { color: "#0f766e", fontSize: 12, fontWeight: "800" },
  logoutButton: {
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f4c7c3",
    backgroundColor: "#fff5f4",
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutButtonPressed: { opacity: 0.7 },
  logoutText: { color: "#b42318", fontSize: 15, fontWeight: "700" },
});
