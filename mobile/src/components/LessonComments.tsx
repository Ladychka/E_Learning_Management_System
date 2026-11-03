import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getApiErrorMessage } from "../api/client";
import {
  createLessonComment,
  deleteLessonComment,
  getLessonComments,
  LessonComment,
} from "../api/comments";
import { useAuth } from "../auth/AuthContext";

function authorName(comment: LessonComment) {
  return `${comment.user.firstName} ${comment.user.lastName}`.trim();
}

function CommentRow({
  comment,
  currentUserId,
  onDelete,
  deleting,
}: {
  comment: LessonComment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const canDelete = currentUserId === comment.userId;
  return (
    <View testID={`lesson-comment-${comment.id}`} style={styles.commentRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {comment.user.firstName.charAt(0)}
          {comment.user.lastName.charAt(0)}
        </Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.author}>{authorName(comment)}</Text>
          {comment.user.role ? (
            <Text style={styles.role}>{comment.user.role}</Text>
          ) : null}
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
        {canDelete ? (
          <Pressable
            accessibilityRole="button"
            disabled={deleting}
            onPress={() => onDelete(comment.id)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>
              {deleting ? "Deleting..." : "Delete"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function LessonComments({ lessonId }: { lessonId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setComments(await getLessonComments(lessonId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const value = content.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createLessonComment(lessonId, value);
      setContent("");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (commentId: string) => {
    if (deletingId) return;
    setDeletingId(commentId);
    setError(null);
    try {
      await deleteLessonComment(commentId);
      setComments((current) =>
        current.filter((comment) => comment.id !== commentId)
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Discussion</Text>
        <Text style={styles.count}>{comments.length}</Text>
      </View>
      <Text style={styles.helper}>
        Ask a question or share what you learned with the class.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#0f766e" />
          <Text style={styles.muted}>Loading comments...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={load}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : comments.length === 0 ? (
        <Text style={styles.muted}>
          No comments yet. Start the discussion.
        </Text>
      ) : (
        comments.map((comment) => (
          <View key={comment.id}>
            <CommentRow
              comment={comment}
              currentUserId={user?.id}
              onDelete={remove}
              deleting={deletingId === comment.id}
            />
            {comment.replies?.length
              ? comment.replies.map((reply) => (
                  <View key={reply.id} style={styles.replyWrap}>
                    <CommentRow
                      comment={reply}
                      currentUserId={user?.id}
                      onDelete={remove}
                      deleting={deletingId === reply.id}
                    />
                  </View>
                ))
              : null}
          </View>
        ))
      )}

      <View style={styles.composer}>
        <TextInput
          testID="lesson-comment-input"
          value={content}
          onChangeText={setContent}
          placeholder="Write a comment..."
          placeholderTextColor="#94a3b8"
          multiline
          style={styles.input}
          editable={!submitting}
        />
        <Pressable
          testID="lesson-comment-submit"
          accessibilityRole="button"
          disabled={submitting || !content.trim()}
          onPress={submit}
          style={({ pressed }) => [
            styles.submitButton,
            (pressed || submitting || !content.trim()) &&
              styles.submitButtonDisabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="send" size={16} color="#ffffff" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e3e8f0",
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#10233f", fontSize: 15, fontWeight: "800" },
  count: { color: "#7a8699", fontSize: 11, fontWeight: "700" },
  helper: { color: "#7a8699", fontSize: 11, lineHeight: 17 },
  muted: { color: "#7a8699", fontSize: 12, lineHeight: 18 },
  center: { flexDirection: "row", alignItems: "center", gap: 8 },
  errorBox: { gap: 6 },
  errorText: {
    color: "#b42318",
    backgroundColor: "#fff5f4",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
  retryButton: { alignSelf: "flex-start", minHeight: 32, justifyContent: "center" },
  retryText: { color: "#0f766e", fontSize: 12, fontWeight: "800" },
  commentRow: { flexDirection: "row", gap: 10, paddingTop: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  commentBody: { flex: 1 },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  author: { color: "#10233f", fontSize: 12, fontWeight: "800" },
  role: {
    color: "#0f766e",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  commentText: {
    color: "#5b677a",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  deleteButton: { alignSelf: "flex-start", paddingVertical: 6 },
  deleteText: { color: "#b42318", fontSize: 10, fontWeight: "800" },
  replyWrap: { marginLeft: 44 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 6,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d8dee9",
    borderRadius: 12,
    backgroundColor: "#fbfcfe",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#10233f",
    fontSize: 13,
    minHeight: 44,
    maxHeight: 110,
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0f766e",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: { opacity: 0.5 },
});
