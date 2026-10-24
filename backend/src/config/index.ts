import dotenv from "dotenv";

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),

  databaseUrl: process.env.DATABASE_URL || "",

  jwt: {
    secret: process.env.JWT_SECRET || "fallback-secret-change-me",
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
    bakongApiKey: process.env.BAKONG_API_KEY || "",
    abaPayLink: process.env.ABA_PAY_LINK || "",
  },
} as const;

export type AppConfig = typeof config;