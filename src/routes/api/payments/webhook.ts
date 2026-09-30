import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getPaymentConfig } from "@/lib/payments/config.server";
import { creditPayment } from "@/lib/server/wallet";

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cfg = getPaymentConfig();
        const raw = await request.text();
        if (!cfg.webhookSecret || !cfg.configured) {
          return new Response("Provider not configured", { status: 503 });
        }
        if (cfg.provider === "paystack") {
          const sig = request.headers.get("x-paystack-signature") ?? "";
          const hash = createHmac("sha512", cfg.webhookSecret).update(raw).digest("hex");
          if (!safeEqual(hash, sig)) return new Response("Invalid signature", { status: 401 });
          const payload = JSON.parse(raw) as {
            event?: string;
            data?: { reference?: string; status?: string };
          };
          if (payload.event === "charge.success" && payload.data?.reference) {
            await creditPayment({
              reference: payload.data.reference,
              providerReference: payload.data.reference,
            });
          }
          return new Response("ok");
        }
        if (cfg.provider === "flutterwave") {
          const sig = request.headers.get("verif-hash") ?? "";
          if (!safeEqual(cfg.webhookSecret, sig)) return new Response("Invalid signature", { status: 401 });
          const payload = JSON.parse(raw) as {
            event?: string;
            data?: { tx_ref?: string; status?: string; id?: number };
          };
          if (payload.data?.status === "successful" && payload.data.tx_ref) {
            await creditPayment({
              reference: payload.data.tx_ref,
              providerReference: String(payload.data.id ?? payload.data.tx_ref),
            });
          }
          return new Response("ok");
        }
        return new Response("Unsupported provider", { status: 400 });
      },
    },
  },
});

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
