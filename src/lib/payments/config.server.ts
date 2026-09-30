import { env } from "@/lib/env.server";

export type PaymentProviderId = "paystack" | "flutterwave" | "sandbox";

/**
 * Server-only payment configuration.
 *
 * Set these in the deployment environment (never in client code):
 *   PAYMENT_PROVIDER          paystack | flutterwave
 *   PAYMENT_PUBLIC_KEY        publishable key (safe to echo to admin)
 *   PAYMENT_SECRET_KEY        secret key — server only
 *   PAYMENT_WEBHOOK_SECRET    webhook HMAC secret — server only
 *   SETTLEMENT_BANK           e.g. OPay
 *   SETTLEMENT_ACCOUNT_NAME   merchant account name
 *   SETTLEMENT_ACCOUNT_NUMBER merchant settlement account
 *
 * Coins are credited only after a verified webhook (or the explicit sandbox
 * confirmation endpoint when no secret key is configured). Visiting a success
 * page never mutates a wallet.
 */
export function getPaymentConfig() {
  const secret = env("PAYMENT_SECRET_KEY");
  const publicKey = env("PAYMENT_PUBLIC_KEY");
  const webhookSecret = env("PAYMENT_WEBHOOK_SECRET");
  const requested = (env("PAYMENT_PROVIDER") ?? "paystack").toLowerCase();
  const provider: PaymentProviderId = secret
    ? requested === "flutterwave"
      ? "flutterwave"
      : "paystack"
    : "sandbox";

  return {
    provider,
    publicKey: publicKey ?? null,
    secretKey: secret ?? null,
    webhookSecret: webhookSecret ?? secret ?? null,
    configured: Boolean(secret),
    settlement: {
      bank: env("SETTLEMENT_BANK") ?? "OPay",
      accountName: env("SETTLEMENT_ACCOUNT_NAME") ?? "Chima Chimdindu Macdonald",
      accountNumber: env("SETTLEMENT_ACCOUNT_NUMBER") ?? "",
    },
  };
}

export function maskAccount(num: string) {
  if (!num || num.length < 4) return "Not configured";
  return `${"•".repeat(Math.max(0, num.length - 4))}${num.slice(-4)}`;
}
