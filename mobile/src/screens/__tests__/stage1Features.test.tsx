import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("../../api/announcements", () => ({
  getMyAnnouncements: jest.fn(),
  markAnnouncementRead: jest.fn(),
}));

jest.mock("../../api/payments", () => ({
  getPaymentHistory: jest.fn(),
}));

import { AnnouncementsScreen } from "../AnnouncementsScreen";
import { PaymentHistoryScreen } from "../PaymentHistoryScreen";
import { FinanceToolsScreen } from "../FinanceToolsScreen";
import {
  getMyAnnouncements,
  markAnnouncementRead,
} from "../../api/announcements";
import { getPaymentHistory } from "../../api/payments";

const announcement = {
  id: "announcement-1",
  title: "New quiz available",
  content: "The module 2 quiz is now open.",
  priority: "normal",
  isRead: false,
  createdAt: new Date().toISOString(),
  course: { id: "course-1", title: "Personal Finance" },
  creator: { id: "instructor-1", firstName: "Rina", lastName: "Sok" },
};

const payment = {
  id: "payment-1",
  userId: "student-1",
  courseId: "course-paid",
  amount: "39.99",
  currency: "USD",
  status: "completed",
  gateway: "khqr",
  createdAt: new Date().toISOString(),
  paidAt: new Date().toISOString(),
  course: { id: "course-paid", title: "Crypto Trading" },
};

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

describe("stage 1 student features", () => {
  beforeEach(() => {
    (getMyAnnouncements as jest.Mock).mockResolvedValue([announcement]);
    (markAnnouncementRead as jest.Mock).mockResolvedValue(undefined);
    (getPaymentHistory as jest.Mock).mockResolvedValue([payment]);
  });

  it("lists announcements and marks one read", async () => {
    const navigation = makeNavigation();
    await render(
      <AnnouncementsScreen
        navigation={navigation}
        route={{ key: "announcements", name: "Announcements" } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("announcement-card-announcement-1")).toBeTruthy()
    );
    expect(
      screen.getByTestId("announcement-unread-announcement-1")
    ).toBeTruthy();

    await fireEvent.press(
      screen.getByTestId("announcement-card-announcement-1")
    );

    await waitFor(() =>
      expect(markAnnouncementRead).toHaveBeenCalledWith("announcement-1")
    );
    expect(
      screen.queryByTestId("announcement-unread-announcement-1")
    ).toBeNull();
  });

  it("lists payments and opens payment detail", async () => {
    const navigation = makeNavigation();
    await render(
      <PaymentHistoryScreen
        navigation={navigation}
        route={{ key: "payments", name: "PaymentHistory" } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("payment-history-payment-1")).toBeTruthy()
    );
    await fireEvent.press(screen.getByTestId("payment-history-payment-1"));

    expect(navigation.parentNavigate).toHaveBeenCalledWith("Browse", {
      screen: "PaymentDetail",
      params: { paymentId: "payment-1" },
    });
  });

  it("calculates estimated savings", async () => {
    const navigation = makeNavigation();
    await render(
      <FinanceToolsScreen
        navigation={navigation}
        route={{ key: "finance", name: "FinanceTools" } as any}
      />
    );

    await fireEvent.changeText(screen.getByTestId("finance-initial"), "2000");
    await fireEvent.changeText(screen.getByTestId("finance-monthly"), "200");
    await fireEvent.changeText(screen.getByTestId("finance-rate"), "8");
    await fireEvent.changeText(screen.getByTestId("finance-years"), "10");

    await waitFor(() =>
      expect(screen.getByTestId("finance-result")).toHaveTextContent(/USD/)
    );
    expect(screen.getByTestId("finance-result")).not.toHaveTextContent(
      "USD 0.00"
    );
    expect(screen.getByText(/Over 120 months/)).toBeTruthy();
  });
});
