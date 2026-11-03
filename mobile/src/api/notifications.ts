import { apiClient } from "./client";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
};

export async function getMyNotifications() {
  const response = await apiClient.get("/notifications/my", {
    params: { limit: 50 },
  });
  return {
    notifications: (response.data?.data ?? []) as AppNotification[],
    meta: response.data?.meta as NotificationMeta,
  };
}

export async function getUnreadNotificationCount() {
  const response = await apiClient.get("/notifications/unread-count");
  return response.data.data.unreadCount as number;
}

export async function markNotificationRead(notificationId: string) {
  const response = await apiClient.patch(
    `/notifications/${notificationId}/read`
  );
  return response.data.data as AppNotification;
}

export async function markAllNotificationsRead() {
  await apiClient.patch("/notifications/read-all");
}
