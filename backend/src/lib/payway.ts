import crypto from "crypto";
import { config } from "../config";

export function isPaywayConfigured(): boolean {
  // The API secret is required to verify PayWay callbacks. Without it every
  // real payment would remain pending forever, so treat the gateway as
  // unconfigured until all three credentials are present.
  return Boolean(
    config.payments.abaMerchantId &&
      config.payments.abaPaywayApiKey &&
      config.payments.abaPaywayApiSecret
  );
}

function formatReqTime(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function base64Json(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function sanitizeName(value?: string | null): string {
  const cleaned = (value || "").replace(/[0-9]/g, "").trim();
  return cleaned.slice(0, 100) || "Student";
}

export function paywayPaymentOption(gateway: string): string {
  return gateway === "card" ? "cards" : "abapay_khqr";
}

export interface PaywayFieldArgs {
  paymentId: string;
  tranId: string;
  amount: number;
  currency: string;
  gateway: string;
  courseId: string;
  courseTitle: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PaywayCheckoutPayload {
  action: string;
  fields: Record<string, string>;
}

/**
 * Builds the multipart form fields for ABA PayWay's eCommerce Purchase API.
 * The `hash` is an HMAC-SHA512 over the documented field order using the
 * merchant API key (public key), base64 encoded.
 */
export function buildPaywayCheckout(args: PaywayFieldArgs): PaywayCheckoutPayload {
  const baseUrl = config.payments.abaPaywayBaseUrl.replace(/\/+$/, "");
  const amount =
    args.currency === "KHR" ? String(Math.round(args.amount)) : Number(args.amount).toFixed(2);

  const req_time = formatReqTime();
  const merchant_id = config.payments.abaMerchantId;
  const tran_id = args.tranId;
  const items = base64Json([
    { name: args.courseTitle, quantity: 1, price: Number(amount) },
  ]);
  const shipping = "0";
  const firstname = sanitizeName(args.firstName);
  const lastname = sanitizeName(args.lastName);
  const email = args.email || "";
  const phone = args.phone || "";
  const type = "purchase";
  const payment_option = paywayPaymentOption(args.gateway);

  const returnUrl = `${config.backendPublicUrl.replace(/\/+$/, "")}/api/v1/payments/payway/callback`;
  const return_url = Buffer.from(returnUrl, "utf8").toString("base64");
  const cancel_url = `${config.frontendUrl.replace(/\/+$/, "")}/checkout/${args.courseId}`;
  const continue_success_url = `${config.frontendUrl.replace(/\/+$/, "")}/courses/${args.courseId}?payment=success`;
  const return_deeplink = "";
  const currency = args.currency;
  const custom_fields = base64Json({ paymentId: args.paymentId, courseId: args.courseId });
  const return_params = JSON.stringify({ paymentId: args.paymentId, courseId: args.courseId });
  const payout = "";
  const lifetime = "10";
  const additional_params = "";
  const google_pay_token = "";
  const skip_success_page = "1";

  const beforeHash = [
    req_time,
    merchant_id,
    tran_id,
    amount,
    items,
    shipping,
    firstname,
    lastname,
    email,
    phone,
    type,
    payment_option,
    return_url,
    cancel_url,
    continue_success_url,
    return_deeplink,
    currency,
    custom_fields,
    return_params,
    payout,
    lifetime,
    additional_params,
    google_pay_token,
    skip_success_page,
  ].join("");

  const hash = crypto
    .createHmac("sha512", config.payments.abaPaywayApiKey)
    .update(beforeHash, "utf8")
    .digest("base64");

  return {
    action: `${baseUrl}/api/payment-gateway/v1/payments/purchase`,
    fields: {
      req_time,
      merchant_id,
      tran_id,
      amount,
      items,
      shipping,
      firstname,
      lastname,
      email,
      phone,
      type,
      payment_option,
      return_url,
      cancel_url,
      continue_success_url,
      return_deeplink,
      currency,
      custom_fields,
      return_params,
      payout,
      lifetime,
      additional_params,
      google_pay_token,
      skip_success_page,
      hash,
    },
  };
}

/**
 * Verifies the X-PayWay-Hmac-Sha512 header on callback/return requests.
 * Fields are sorted by key, values concatenated, then HMAC-SHA512 with the
 * merchant API secret and base64 encoded.
 */
export type PaywayCheckStatus = "paid" | "pending" | "failed" | "unknown";

export interface PaywayCheckResult {
  status: PaywayCheckStatus;
  raw: unknown;
}

/**
 * Queries ABA PayWay's server-to-server Check Transaction API. This is the
 * authoritative source for a PayWay transaction; it must never be based on a
 * client-supplied "paid" flag.
 */
export async function checkPaywayTransaction(
  tranId: string
): Promise<PaywayCheckResult | null> {
  if (!isPaywayConfigured() || !tranId) return null;

  const baseUrl = config.payments.abaPaywayBaseUrl.replace(/\/+$/, "");
  const req_time = formatReqTime();
  const merchant_id = config.payments.abaMerchantId;
  const hash = crypto
    .createHmac("sha512", config.payments.abaPaywayApiKey)
    .update(`${req_time}${merchant_id}${tranId}`, "utf8")
    .digest("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${baseUrl}/api/payment-gateway/v1/payments/check-transaction`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          req_time,
          merchant_id,
          tran_id: tranId,
          hash,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;

    const root = payload as any;
    const rawStatus = String(
      root?.data?.status ??
        root?.data?.payment_status ??
        root?.data?.transaction_status ??
        root?.payment_status ??
        root?.result ??
        ""
    ).toLowerCase();

    if (["approved", "success", "completed", "paid"].includes(rawStatus)) {
      return { status: "paid", raw: payload };
    }
    if (
      ["failed", "declined", "rejected", "error", "cancelled", "canceled"].includes(
        rawStatus
      )
    ) {
      return { status: "failed", raw: payload };
    }
    if (["pending", "processing", "in_progress"].includes(rawStatus)) {
      return { status: "pending", raw: payload };
    }

    const apiCode = String(
      root?.status?.code ?? root?.status?.status ?? root?.status ?? ""
    ).toLowerCase();
    if (apiCode === "0" || apiCode === "00" || apiCode === "success") {
      return { status: "pending", raw: payload };
    }

    return { status: "unknown", raw: payload };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function verifyPaywaySignature(
  payload: Record<string, unknown>,
  receivedSignature: string
): boolean {
  const secret = config.payments.abaPaywayApiSecret;
  if (!secret || !receivedSignature) return false;

  const sortedKeys = Object.keys(payload).sort();
  let beforeHash = "";
  for (const key of sortedKeys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      beforeHash += JSON.stringify(value);
    } else if (value !== null && typeof value === "object") {
      beforeHash += JSON.stringify(value);
    } else {
      beforeHash += value == null ? "" : String(value);
    }
  }

  const expected = crypto.createHmac("sha512", secret).update(beforeHash, "utf8").digest("base64");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(receivedSignature, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
