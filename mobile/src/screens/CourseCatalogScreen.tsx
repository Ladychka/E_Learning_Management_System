import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getApiErrorMessage } from "../api/client";
import {
  CategoryWithCount,
  CourseListParams,
  CourseSummary,
  getCategories,
  getCourses,
} from "../api/courses";
import { CourseThumbnail } from "../components/CourseThumbnail";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "CourseCatalog">;

type PriceFilter = "ALL" | "FREE" | "PAID";

const LEVEL_FILTERS = [
  { label: "All levels", value: "" },
  { label: "Beginner", value: "BEGINNER" },
  { label: "Intermediate", value: "INTERMEDIATE" },
  { label: "Advanced", value: "ADVANCED" },
];

const PRICE_FILTERS: { label: string; value: PriceFilter }[] = [
  { label: "All prices", value: "ALL" },
  { label: "Free", value: "FREE" },
  { label: "Paid", value: "PAID" },
];

function formatDuration(minutes?: number | null) {
  if (!minutes) return "Self-paced";
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hr`;
  }
  return `${minutes} min`;
}

function titleCase(value?: string | null) {
  if (!value) return "All levels";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function CourseCatalogScreen({ navigation }: Props) {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [level, setLevel] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    getCategories()
      .then((data) => {
        if (!active) return;
        setCategories(data.filter((category) => !category.parentId));
      })
      .catch(() => {
        // The catalog still works with search and level/price filters.
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      const id = ++requestId.current;
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const params: CourseListParams = {
          limit: 50,
          sortBy: "createdAt",
          order: "desc",
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (level) params.level = level;
        if (categoryId) params.categoryId = categoryId;
        if (priceFilter !== "ALL") params.isFree = priceFilter === "FREE";

        const result = await getCourses(params);
        if (id !== requestId.current) return;
        setCourses(result.courses);
        setTotal(result.meta.total);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(getApiErrorMessage(err));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [debouncedSearch, level, categoryId, priceFilter]
  );

  useEffect(() => {
    load("initial");
  }, [load]);

  const resetFilters = () => {
    setSearch("");
    setLevel("");
    setCategoryId("");
    setPriceFilter("ALL");
  };

  const renderCourse = useCallback(({ item }: { item: CourseSummary }) => {
    const price = Number(item.price ?? 0);
    const isFree = item.isFree || !price || price === 0;

    return (
      <Pressable
        testID={`course-card-${item.slug}`}
        accessibilityRole="button"
        onPress={() =>
          navigation.navigate("CourseDetail", {
            courseId: item.id,
            title: item.title,
          })
        }
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <CourseThumbnail
          title={item.title}
          thumbnailUrl={item.thumbnailUrl}
          level={item.level}
        />
        <View style={styles.cardBody}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {item.category?.name ?? "FinTech"}
              </Text>
            </View>
            <View
              style={[
                styles.priceBadge,
                isFree ? styles.freeBadge : styles.paidBadge,
              ]}
            >
              <Text
                style={[
                  styles.priceBadgeText,
                  isFree ? styles.freeText : styles.paidText,
                ]}
              >
                {isFree ? "Free" : `$${price.toFixed(2)}`}
              </Text>
            </View>
          </View>

          <Text numberOfLines={2} style={styles.courseTitle}>
            {item.title}
          </Text>
          <Text numberOfLines={2} style={styles.courseDesc}>
            {item.shortDesc || item.description}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>
              {item._count?.enrollments ?? 0} students
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{titleCase(item.level)}</Text>
          </View>

          <Text style={styles.viewLink}>View course</Text>
        </View>
      </Pressable>
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Course catalog</Text>
        <Text style={styles.title}>Find your next course</Text>
        <Text style={styles.subtitle}>
          Browse finance and fintech courses, then enroll in free courses
          instantly.
        </Text>

        <TextInput
          testID="course-search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search courses, topics, or keywords"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchInput}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {LEVEL_FILTERS.map((filter) => {
            const active = level === filter.value;
            return (
              <Pressable
                key={filter.value || "all-levels"}
                accessibilityRole="button"
                onPress={() => setLevel(filter.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {[
            { label: "All topics", value: "" },
            ...categories.map((category) => ({
              label: category.name,
              value: category.id,
            })),
          ].map((filter) => {
            const active = categoryId === filter.value;
            return (
              <Pressable
                key={filter.value || "all-topics"}
                accessibilityRole="button"
                onPress={() => setCategoryId(filter.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {PRICE_FILTERS.map((filter) => {
            const active = priceFilter === filter.value;
            return (
              <Pressable
                key={filter.value}
                accessibilityRole="button"
                onPress={() => setPriceFilter(filter.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.resultCount}>
          {loading
            ? "Loading courses..."
            : `${total} course${total === 1 ? "" : "s"} available`}
        </Text>
      </View>

      <View style={styles.listArea}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0f766e" />
            <Text style={styles.centerText}>Loading the catalog...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Could not load courses</Text>
            <Text style={styles.centerText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => load("initial")}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            testID="course-list"
            data={courses}
            keyExtractor={(item) => item.id}
            renderItem={renderCourse}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => load("refresh")}
                tintColor="#0f766e"
              />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.errorTitle}>No courses found</Text>
                <Text style={styles.centerText}>
                  Try a different search or reset your filters.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={resetFilters}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Reset filters</Text>
                </Pressable>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
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
    marginTop: 6,
  },
  subtitle: {
    color: "#5b677a",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e3e8f0",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#10233f",
    marginTop: 16,
  },
  chipRow: { gap: 8, paddingVertical: 12, paddingRight: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: "#0f766e", borderColor: "#0f766e" },
  chipText: { color: "#5b677a", fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#ffffff" },
  resultCount: {
    color: "#7a8699",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  listArea: { flex: 1 },
  listContent: { padding: 20, paddingTop: 12, gap: 16, flexGrow: 1 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.85 },
  cardBody: { padding: 16 },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: "#e6f4f1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: { color: "#0f766e", fontSize: 11, fontWeight: "800" },
  priceBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  freeBadge: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  paidBadge: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
  priceBadgeText: { fontSize: 11, fontWeight: "800" },
  freeText: { color: "#047857" },
  paidText: { color: "#3730a3" },
  courseTitle: {
    color: "#10233f",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  courseDesc: {
    color: "#5b677a",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 12,
  },
  metaText: { color: "#7a8699", fontSize: 12, fontWeight: "600" },
  metaDot: { color: "#c3cbd8", fontSize: 12, marginHorizontal: 6 },
  viewLink: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 10,
  },
  centerText: {
    color: "#5b677a",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  errorTitle: { color: "#10233f", fontSize: 17, fontWeight: "800" },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonPressed: { opacity: 0.8 },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  secondaryButton: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonPressed: { opacity: 0.7 },
  secondaryButtonText: { color: "#0f766e", fontSize: 14, fontWeight: "800" },
});
