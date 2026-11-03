import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <OfflineBanner />
          <RootNavigator />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
