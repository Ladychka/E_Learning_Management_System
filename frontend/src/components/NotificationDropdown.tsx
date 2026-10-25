import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { notificationApi } from "@/lib/api";
import { Bell, CheckCheck, Loader2, Award, BookOpen, AlertCircle, Info } from "lucide-react";
import toast from "react-hot-toast";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnread = async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(res.data.data?.unreadCount || 0);
    } catch {
      // quiet
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getMyNotifications({ limit: 10 });
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.meta?.unreadCount || 0);
    } catch {
      // quiet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications read");
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await notificationApi.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    }
    setOpen(false);

    // Route based on entity
    if (item.entityType === "Grade" || item.type.includes("GRADE")) {
      navigate("/my-grades");
    } else if (item.entityType === "Course" && item.entityId) {
      navigate(`/courses/${item.entityId}`);
    } else if (item.entityType === "Enrollment") {
      navigate("/my-enrollments");
    }
  };

  const getIcon = (type: string) => {
    if (type.includes("GRADE")) {
      return <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    }
    if (type.includes("COURSE") || type.includes("ENROLLMENT")) {
      return <BookOpen className="h-4 w-4 text-primary-600 dark:text-primary-400" />;
    }
    if (type.includes("ALERT") || type.includes("WARNING")) {
      return <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    }
    return <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-800 focus:outline-none"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <Loader2 className="mx-auto h-5 w-5 animate-spin mb-1" />
                <span className="text-xs">Loading updates...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="mx-auto h-8 w-8 stroke-[1.5] text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-xs font-medium">No notifications yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5">You're completely caught up!</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`flex items-start gap-3 p-3.5 text-left text-xs transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    !item.isRead ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                  }`}
                >
                  <div className="mt-0.5 rounded-full p-1.5 bg-slate-100 dark:bg-slate-800 shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${!item.isRead ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                      {item.title}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {item.message}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {!item.isRead && (
                    <span className="h-2 w-2 rounded-full bg-primary-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
