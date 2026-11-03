import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNetInfo } from "@react-native-community/netinfo";

export function OfflineBanner() {
  const netInfo = useNetInfo();

  if (netInfo.isConnected !== false) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View testID="offline-banner" style={styles.row}>
        <Ionicons name="cloud-offline-outline" size={16} color="#78350f" />
        <Text style={styles.text}>
          You're offline. Some features will not work until your connection
          returns.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#fef3c7" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "#fef3c7",
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
  },
  text: { flex: 1, color: "#78350f", fontSize: 12, lineHeight: 17 },
});
