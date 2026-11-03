import { useMemo, useState } from "react";
import {
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
import type { HomeStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<HomeStackParamList, "FinanceTools">;

function parseAmount(value: string, fallback = 0) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function FinanceToolsScreen({ navigation }: Props) {
  const [initial, setInitial] = useState("1000");
  const [monthly, setMonthly] = useState("100");
  const [rate, setRate] = useState("6");
  const [years, setYears] = useState("5");

  const result = useMemo(() => {
    const principal = parseAmount(initial);
    const contribution = parseAmount(monthly);
    const annualRate = parseAmount(rate) / 100;
    const periods = Math.max(0, Math.min(60, Math.floor(parseAmount(years)))) * 12;
    const monthlyRate = annualRate / 12;

    let balance = principal;
    for (let month = 0; month < periods; month += 1) {
      balance = balance * (1 + monthlyRate) + contribution;
    }

    const contributed = principal + contribution * periods;
    return {
      balance,
      contributed,
      interest: balance - contributed,
      periods,
    };
  }, [initial, monthly, rate, years]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            testID="finance-tools-back"
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={18} color="#0f766e" />
            <Text style={styles.backButtonText}>Home</Text>
          </Pressable>
          <Text style={styles.eyebrow}>Planning</Text>
          <Text testID="finance-tools-title" style={styles.title}>
            Savings calculator
          </Text>
          <Text style={styles.subtitle}>
            Estimate how regular saving and compound growth can add up over
            time.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Starting amount (USD)</Text>
            <TextInput
              testID="finance-initial"
              value={initial}
              onChangeText={setInitial}
              keyboardType="decimal-pad"
              placeholder="1000"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <Text style={styles.label}>Monthly contribution (USD)</Text>
            <TextInput
              testID="finance-monthly"
              value={monthly}
              onChangeText={setMonthly}
              keyboardType="decimal-pad"
              placeholder="100"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <Text style={styles.label}>Annual interest rate (%)</Text>
            <TextInput
              testID="finance-rate"
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
              placeholder="6"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            <Text style={styles.label}>Years</Text>
            <TextInput
              testID="finance-years"
              value={years}
              onChangeText={setYears}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Estimated balance</Text>
            <Text testID="finance-result" style={styles.resultValue}>
              USD {formatMoney(result.balance)}
            </Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultMeta}>Total contributed</Text>
              <Text style={styles.resultMetaValue}>
                USD {formatMoney(result.contributed)}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultMeta}>Estimated growth</Text>
              <Text style={styles.resultMetaValue}>
                USD {formatMoney(result.interest)}
              </Text>
            </View>
            <Text style={styles.resultNote}>
              Over {result.periods} months. This is an estimate, not financial
              advice.
            </Text>
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
  subtitle: { color: "#5b677a", fontSize: 14, lineHeight: 21, marginTop: 4 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 18,
    gap: 6,
    marginTop: 8,
  },
  label: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
  },
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
  resultCard: {
    backgroundColor: "#10233f",
    borderRadius: 18,
    padding: 20,
  },
  resultLabel: {
    color: "#99f6e4",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultValue: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 6,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  resultMeta: { color: "#cbd5e1", fontSize: 12 },
  resultMetaValue: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  resultNote: { color: "#94a3b8", fontSize: 10, lineHeight: 16, marginTop: 16 },
});
