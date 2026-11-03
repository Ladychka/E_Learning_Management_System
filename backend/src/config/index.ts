import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET;
const isProduction = nodeEnv === "production";

if (isProduction && !jwtSecret) {
  throw new Error(
    "JWT_SECRET must be set in production. Refusing to start with the insecure development fallback."
  );
}

export const config = {
  nodeEnv,
  isProduction,
  port: parseInt(process.env.PORT || "5000", 10),

  databaseUrl: process.env.DATABASE_URL || "",

  jwt: {
    secret: jwtSecret || "fallback-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
  },

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "ELMS <noreply@elms.edu>",
  },

  payments: {
    khqrApiKey: process.env.KHQR_API_KEY || "",
    abaMerchantId: process.env.ABA_PAYWAY_MERCHANT_ID || "",
    abaPaywayApiKey: process.env.ABA_PAYWAY_API_KEY || "",
    abaPaywayApiSecret: process.env.ABA_PAYWAY_API_SECRET || "",
    abaPaywayBaseUrl: process.env.ABA_PAYWAY_BASE_URL || "https://checkout-sandbox.payway.com.kh",
    bakongApiKey: process.env.BAKONG_API_KEY || "",
    abaPayLink: process.env.ABA_PAY_LINK || "",
    acledaPayLink: process.env.ACLEDA_PAY_LINK || "",
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "",
    allowSandboxConfirm:
      process.env.ALLOW_SANDBOX_PAYMENT_CONFIRM === "true" && !isProduction,
  },

  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || "http://localhost:5000",
} as const;

export type AppConfig = typeof config;