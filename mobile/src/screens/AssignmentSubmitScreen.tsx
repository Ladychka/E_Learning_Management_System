import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import { getApiErrorMessage } from "../api/client";
import {
  AssignmentDetail,
  getAssignment,
  submitAssignment,
  uploadSubmissionFile,
} from "../api/assignments";
import type { CoursesStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CoursesStackParamList, "AssignmentSubmit">;

type SubmissionFile = {
  name: string;
  url: string;
  kind: "upload" | "link";
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function isPastDue(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function initialFiles(assignment: AssignmentDetail | null): SubmissionFile[] {
  const submission = assignment?.submission ?? assignment?.submissions[0];
  if (!submission) return [];
  return submission.fileUrls.map((url, index) => ({
    name: url.startsWith("/uploads/") ? `Uploaded file ${index + 1}` : url,
    url,
    kind: url.startsWith("/uploads/") ? "upload" : "link",
  }));
}

export function AssignmentSubmitScreen({ navigation, route }: Props) {
  const { assignmentId } = route.params;
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAssignment(assignmentId);
      const submission = data.submission ?? data.submissions[0];
      setAssignment(data);
      setContent(submission?.content ?? "");
      setFiles(initialFiles(data));
    } catch (err) {
      setLoadError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const addLink = () => {
    const value = linkInput.trim();
    if (!/^https?:\/\//i.test(value)) {
      setFormError("Enter a valid http or https link.");
      return;
    }
    setFiles((current) => [...current, { name: value, url: value, kind: "link" }]);
    setLinkInput("");
    setFormError(null);
  };

  const pickFile = async () => {
    setFormError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setUploading(true);
      const uploaded = await uploadSubmissionFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        file: asset.file,
      });
      setFiles((current) => [
        ...current,
        {
          name: uploaded.originalName ?? asset.name,
          url: uploaded.url,
          kind: "upload",
        },
      ]);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async () => {
    if (!assignment) return;
    if (!content.trim() && files.length === 0) {
      setFormError("Add written content, a file, or a link before submitting.");
      return;
    }
    if (isPastDue(assignment.dueDate) && !assignment.allowLate) {
      setFormError("The deadline has passed and late submissions are not allowed.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await submitAssignment(assignment.id, {
        content: content.trim() || undefined,
        fileUrls: files.map((file) => file.url),
      });
      navigation.goBack();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.centerText}>Loading submission form...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !assignment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load this assignment</Text>
          <Text style={styles.centerText}>
            {loadError ?? "The assignment could not be found."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={load}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.textButton}
          >
            <Text style={styles.textButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const dueDate = formatDate(assignment.dueDate);
  const overdue = isPastDue(assignment.dueDate);
  const existingSubmission =
    assignment.submission ?? assignment.submissions[0] ?? null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          testID="assignment-submit-back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Assignment</Text>
        </Pressable>

        <Text style={styles.eyebrow}>Submission</Text>
        <Text testID="assignment-submit-title" style={styles.title}>
          {assignment.title}
        </Text>
        <Text style={styles.courseTitle}>{assignment.course.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Max {assignment.maxPoints} points</Text>
          <Text style={[styles.metaText, overdue && styles.overdueText]}>
            {dueDate
              ? `${overdue ? "Overdue · due " : "Due "}${dueDate}`
              : "No due date"}
          </Text>
        </View>

        {overdue && assignment.allowLate ? (
          <Text style={styles.warningText}>
            The deadline has passed. This submission will be marked late.
          </Text>
        ) : null}
        {overdue && !assignment.allowLate ? (
          <Text style={styles.errorText}>
            The deadline has passed and late submissions are not allowed for this
            assignment.
          </Text>
        ) : null}

        {assignment.instructions ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructionsText}>
              {assignment.instructions}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Written response</Text>
          <TextInput
            testID="assignment-submit-content"
            value={content}
            onChangeText={setContent}
            placeholder="Write your answer here..."
            placeholderTextColor="#94a3b8"
            multiline
            style={styles.contentInput}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Files and links</Text>
          <Text style={styles.helperText}>
            Upload a file or add a web link. You can include both.
          </Text>

          <Pressable
            testID="assignment-submit-file"
            accessibilityRole="button"
            disabled={uploading}
            onPress={pickFile}
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || uploading) && styles.buttonPressed,
            ]}
          >
            {uploading ? (
              <ActivityIndicator color="#0f766e" />
            ) : (
              <Text style={styles.secondaryButtonText}>Attach a file</Text>
            )}
          </Pressable>

          <View style={styles.linkRow}>
            <TextInput
              testID="assignment-link-input"
              value={linkInput}
              onChangeText={setLinkInput}
              placeholder="https://example.com/my-work"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.linkInput}
            />
            <Pressable
              testID="assignment-add-link"
              accessibilityRole="button"
              onPress={addLink}
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>

          {files.length > 0 ? (
            <View style={styles.fileList}>
              {files.map((file, index) => (
                <View key={`${file.url}-${index}`} style={styles.fileRow}>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileKind}>
                      {file.kind === "upload" ? "Uploaded file" : "Web link"}
                    </Text>
                  </View>
                  <Pressable
                    testID={`assignment-remove-file-${index}`}
                    accessibilityRole="button"
                    onPress={() => removeFile(index)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedText}>No files or links added yet.</Text>
          )}
        </View>

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <Pressable
          testID="assignment-submit"
          accessibilityRole="button"
          disabled={submitting}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || submitting) && styles.buttonPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {existingSubmission ? "Update submission" : "Submit assignment"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
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
  title: { color: "#10233f", fontSize: 24, fontWeight: "800", marginTop: 6 },
  courseTitle: {
    color: "#5b677a",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaText: { color: "#7a8699", fontSize: 11, fontWeight: "600" },
  overdueText: { color: "#b42318" },
  warningText: {
    color: "#92400e",
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: "#b42318",
    backgroundColor: "#fff5f4",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
  },
  sectionTitle: {
    color: "#10233f",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  instructionsText: { color: "#5b677a", fontSize: 13, lineHeight: 21 },
  contentInput: {
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 12,
    backgroundColor: "#fbfcfe",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#10233f",
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
    marginTop: 6,
  },
  helperText: { color: "#7a8699", fontSize: 11, lineHeight: 17 },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0f766e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: { color: "#0f766e", fontSize: 13, fontWeight: "800" },
  linkRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  linkInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 12,
    backgroundColor: "#fbfcfe",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#10233f",
    fontSize: 13,
  },
  addButton: {
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  addButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  fileList: { marginTop: 10, gap: 8 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
  },
  fileInfo: { flex: 1 },
  fileName: { color: "#10233f", fontSize: 12, fontWeight: "700" },
  fileKind: { color: "#94a3b8", fontSize: 10, marginTop: 2 },
  removeButton: { padding: 4 },
  removeText: { color: "#b42318", fontSize: 11, fontWeight: "800" },
  mutedText: { color: "#7a8699", fontSize: 11, marginTop: 10 },
  primaryButton: {
    marginTop: 12,
    backgroundColor: "#0f766e",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  buttonPressed: { opacity: 0.75 },
  textButton: { paddingVertical: 8 },
  textButtonText: { color: "#5b677a", fontSize: 13, fontWeight: "700" },
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
