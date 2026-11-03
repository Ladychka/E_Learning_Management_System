import { apiClient } from "./client";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority?: string | null;
  isRead: boolean;
  createdAt: string;
  course?: { id: string; title: string } | null;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  } | null;
};

export async function getMyAnnouncements() {
  const response = await apiClient.get("/announcements/my");
  return (response.data?.data ?? []) as Announcement[];
}

export async function markAnnouncementRead(announcementId: string) {
  await apiClient.post(`/announcements/${announcementId}/read`);
}
