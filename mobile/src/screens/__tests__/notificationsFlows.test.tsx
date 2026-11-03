import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("../../api/notifications", () => ({
  getMyNotifications: jest.fn(),
  getUnreadNotificationCount: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

jest.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "student-1",
      email: "student@elms.edu",
      firstName: "Sokha",
      lastName: "Student",
      role: "STUDENT",
      status: "ACTIVE",
    },
  }),
}));

import { HomeScreen } from "../HomeScreen";
import { NotificationsScreen } from "../NotificationsScreen";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications";

const notifications = [
  {
    id: "notification-1",
    type: "QUIZ_GRADED",
    title: "Quiz graded",
    message: "Your quiz has been graded.",
    entityType: "QuizAttempt",
    entityId: "attempt-1",
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "notification-2",
    type: "GRADE_PUBLISHED",
    title: "Grade published",
    message: "Your assignment grade is ready.",
    entityType: "Grade",
    entityId: null,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  },
];

function makeNavigation() {
  const parentNavigate = jest.fn();
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    popToTop: jest.fn(),
    getParent: jest.fn(() => ({ navigate: parentNavigate })),
    parentNavigate,
  } as any;
}

describe("notification flows", () => {
  beforeEach(() => {
    (getMyNotifications as jest.Mock).mockResolvedValue({
      notifications,
      meta: {
        page: 1,
        limit: 50,
        total: notifications.length,
        totalPages: 1,
        unreadCount: 2,
      },
    });
    (markNotificationRead as jest.Mock).mockResolvedValue(undefined);
    (markAllNotificationsRead as jest.Mock).mockResolvedValue(undefined);
    (getUnreadNotificationCount as jest.Mock).mockResolvedValue(5);
  });

  it("marks one notification read, navigates, and marks all remaining read", async () => {
    const navigation = makeNavigation();
    await render(
      <NotificationsScreen
        navigation={navigation}
        route={{ key: "notifications", name: "Notifications" } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("notifications-title")).toHaveTextContent(
        "Notifications"
      )
    );
    expect(screen.getByTestId("notification-unread-dot-notification-1")).toBeTruthy();
    expect(screen.getByText("2 unread notifications")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("notification-item-notification-1"));

    await waitFor(() =>
      expect(markNotificationRead).toHaveBeenCalledWith("notification-1")
    );
    expect(
      screen.queryByTestId("notification-unread-dot-notification-1")
    ).toBeNull();
    expect(navigation.popToTop).toHaveBeenCalled();
    expect(navigation.parentNavigate).toHaveBeenCalledWith("Browse", {
      screen: "QuizResult",
      params: { attemptId: "attempt-1" },
    });

    await fireEvent.press(screen.getByTestId("notifications-mark-all"));

    await waitFor(() =>
      expect(markAllNotificationsRead).toHaveBeenCalled()
    );
    expect(screen.getByText("0 unread notifications")).toBeTruthy();
    expect(
      screen.getByText("All notifications marked as read.")
    ).toBeTruthy();
  });

  it("shows the unread badge on Home and opens notifications", async () => {
    const navigation = makeNavigation();
    await render(
      <HomeScreen
        navigation={navigation}
        route={{ key: "home", name: "Home" } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("home-unread-badge")).toHaveTextContent("5")
    );

    await fireEvent.press(screen.getByTestId("home-notifications-button"));

    expect(navigation.navigate).toHaveBeenCalledWith("Notifications");
  });
});
