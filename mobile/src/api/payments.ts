import { apiClient } from "./client";

export type PaymentRecord = {
  id: string;
  userId: string;
  courseId?: string | null;
  subscriptionId?: string | null;
  amount: string | number;
  currency: string;
  status: string;
  gateway: string;
  gatewayRef?: string | null;
  metadata?: Record<string, unknown> | null;
  paidAt?: string | null;
  createdAt?: string;
};

export type CheckoutData = {
  paymentId: string;
  amount: number;
  fullPrice?: number;
  currency: string;
  amountKhr?: number;
  paymentPlan?: string;
  totalInstallments?: number;
  installmentIndex?: number;
  remainingAmount?: number;
  nextDueDate?: string | null;
  status: string;
  gateway: string;
  expiresInSeconds?: number;
  pollIntervalSeconds?: number;
  qrData?: string | null;
  qrImage?: string | null;
  paymentUrl?: string | null;
  deeplink?: string | null;
  bankName?: string | null;
  note?: string | null;
  staticQr?: boolean;
  sandbox?: boolean;
  payway?: {
    action: string;
    fields: Record<string, string>;
  } | null;
};

export type CheckoutResponse = {
  payment: PaymentRecord;
  checkout: CheckoutData;
};

export type PaymentQr = {
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  gatewayRef?: string | null;
  course?: { id: string; title: string } | null;
  imageUrl: string;
  payload?: string | null;
  staticQr?: boolean;
  bankName?: string | null;
};

export type PaymentStatus = {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  gateway: string;
  gatewayRef?: string | null;
  course?: { id: string; title: string; instructorId?: string } | null;
  createdAt?: string;
  expiresAt: string;
  providerChecked: boolean;
  providerStatus: string | null;
  pollIntervalSeconds: number;
};

export async function createCourseCheckout(
  courseId: string,
  gateway = "khqr"
) {
  const response = await apiClient.post("/payments/checkout", {
    courseId,
    gateway,
  });
  return response.data.data as CheckoutResponse;
}

export async function getPaymentQr(paymentId: string) {
  const response = await apiClient.get(`/payments/${paymentId}/qr`);
  return response.data.data as PaymentQr;
}

export async function getPaymentStatus(paymentId: string) {
  const response = await apiClient.get(`/payments/${paymentId}/status`);
  return response.data.data as PaymentStatus;
}
