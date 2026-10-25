import React, { useEffect, useState } from "react";
import { commentApi } from "../lib/api";
import { MessageSquare, Send, Reply, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface CommentItem {
  id: string;
  userId: string;
  lessonId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    role: string;
  };
  replies?: CommentItem[];
}

export const LessonDiscussion: React.FC<{ lessonId: string; currentUserId?: string }> = ({
  lessonId,
  currentUserId,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await commentApi.getLessonComments(lessonId);
      setComments(res.data.data);
    } catch (err) {
      console.error("Failed to load lesson comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lessonId) {
      fetchComments();
    }
  }, [lessonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await commentApi.createComment(lessonId, {
        content: newComment.trim(),
        parentId: replyTo ? replyTo.id : undefined,
      });
      setNewComment("");
      setReplyTo(null);
      toast.success("Comment posted");
      fetchComments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await commentApi.deleteComment(commentId);
      toast.success("Comment removed");
      fetchComments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete comment");
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <MessageSquare className="w-5 h-5 text-primary-600" />
        <h3 className="font-bold text-gray-900 text-base">Lesson Discussion & Questions</h3>
        <span className="text-xs text-gray-500 font-medium ml-1">
          ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)} comments)
        </span>
      </div>

      {/* Post form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {replyTo && (
          <div className="flex items-center justify-between text-xs bg-primary-50 text-primary-800 px-3 py-1.5 rounded-lg border border-primary-200">
            <span>
              Replying to <span className="font-semibold">{replyTo.user.firstName} {replyTo.user.lastName}</span>
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="font-bold text-primary-600 hover:text-primary-800"
            >
              ✕ Cancel
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={replyTo ? "Write a helpful reply..." : "Ask a question or share a thought on this lesson..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-1.5" />
            {submitting ? "..." : replyTo ? "Reply" : "Post"}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="text-xs text-gray-500 py-4 text-center">Loading discussions...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No questions or comments yet. Be the first to start the discussion!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                    {c.user.firstName[0]}
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-gray-900">
                      {c.user.firstName} {c.user.lastName}
                    </span>
                    {c.user.role === "INSTRUCTOR" && (
                      <span className="ml-1.5 px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[10px] rounded font-bold">
                        Instructor
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 ml-2">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReplyTo(c)}
                    className="text-gray-500 hover:text-primary-600 text-xs flex items-center gap-1"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Reply
                  </button>
                  {currentUserId === c.userId && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-gray-400 hover:text-red-600 text-xs"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-800 pl-9 leading-relaxed">{c.content}</p>

              {/* Replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="pl-9 pt-2 space-y-2 border-t border-gray-200 mt-2">
                  {c.replies.map((reply) => (
                    <div key={reply.id} className="p-2.5 bg-white rounded-lg border border-gray-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-gray-900">
                            {reply.user.firstName} {reply.user.lastName}
                          </span>
                          {reply.user.role === "INSTRUCTOR" && (
                            <span className="px-1 py-0.2 bg-purple-100 text-purple-700 text-[9px] rounded font-bold">
                              Instructor
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(reply.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {currentUserId === reply.userId && (
                          <button
                            onClick={() => handleDelete(reply.id)}
                            className="text-gray-400 hover:text-red-600 text-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-700">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
