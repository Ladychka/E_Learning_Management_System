import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

jest.mock("../../api/payments", () => ({
  getPaymentQr: jest.fn(),
  getPaymentStatus: jest.fn(),
}));

import { CheckoutScreen } from "../CheckoutScreen";
import { getPaymentQr, getPaymentStatus } from "../../api/payments";

const qr = {
  paymentId: "payment-1",
  amount: 39.99,
  currency: "USD",
  status: "pending",
  imageUrl: "/uploads/qr.png",
  payload: null,
  staticQr: true,
  bankName: "ACLEDA KHQR",
};

const pendingStatus = {
  paymentId: "payment-1",
  status: "pending",
  amount: 39.99,
  currency: "USD",
  gateway: "khqr",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
  providerChecked: false,
  providerStatus: null,
  pollIntervalSeconds: 3,
};

function makeNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    getParent: jest.fn(() => ({ navigate: jest.fn() })),
  } as any;
}

function makeRoute(expiresInSeconds = 300) {
  return {
    key: "checkout",
    name: "Checkout",
    params: {
      paymentId: "payment-1",
      courseId: "course-paid",
      courseTitle: "Crypto Trading",
      amount: 39.99,
      currency: "USD",
      expiresInSeconds,
    },
  } as any;
}

describe("paid checkout", () => {
  beforeEach(() => {
    (getPaymentQr as jest.Mock).mockResolvedValue(qr);
    (getPaymentStatus as jest.Mock).mockResolvedValue(pendingStatus);
  });

  it("polls pending payments and shows success when the provider confirms", async () => {
    const navigation = makeNavigation();
    (getPaymentStatus as jest.Mock)
      .mockResolvedValueOnce(pendingStatus)
      .mockResolvedValue({
        ...pendingStatus,
        status: "completed",
        providerChecked: true,
        providerStatus: "paid",
      });

    await render(<CheckoutScreen navigation={navigation} route={makeRoute()} />);

    await waitFor(() =>
      expect(screen.getByTestId("checkout-status")).toHaveTextContent(
        "Waiting for payment"
      )
    );
    expect(screen.getByTestId("checkout-amount")).toHaveTextContent("USD 39.99");

    await waitFor(
      () => expect(screen.getByTestId("checkout-success")).toBeTruthy(),
      { timeout: 6000 }
    );
    expect(screen.getByText("Payment confirmed")).toBeTruthy();
  });

  it("shows the expired state", async () => {
    const navigation = makeNavigation();
    (getPaymentStatus as jest.Mock).mockResolvedValue({
      ...pendingStatus,
      status: "expired",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    await render(<CheckoutScreen navigation={navigation} route={makeRoute(0)} />);

    await waitFor(() =>
      expect(screen.getByTestId("checkout-expired")).toHaveTextContent(
        "Payment session expired"
      )
    );
  });

  it("shows the failed state", async () => {
    const navigation = makeNavigation();
    (getPaymentStatus as jest.Mock).mockResolvedValue({
      ...pendingStatus,
      status: "failed",
      providerStatus: "failed",
    });

    await render(<CheckoutScreen navigation={navigation} route={makeRoute()} />);

    await waitFor(() =>
      expect(screen.getByTestId("checkout-failed")).toHaveTextContent(
        "Payment failed"
      )
    );
  });
});
