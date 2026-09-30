import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatNaira } from "@/lib/format";
import { completeSandboxPayment, getWallet, initializeCoinPurchase } from "@/lib/server/wallet";
import { useState } from "react";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  const { user, isPending } = useCurrentUserState();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wallet"], queryFn: () => getWallet(), enabled: !!user });
  const [pending, setPending] = useState<{ reference: string; coins: number; amountKobo: number; url: string | null; provider: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const buy = useMutation({
    mutationFn: (packageId: string) => initializeCoinPurchase({ data: { packageId } }),
    onSuccess: (res) => {
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
        return;
      }
      setPending({
        reference: res.reference,
        coins: res.coins,
        amountKobo: res.amountKobo,
        url: res.authorizationUrl,
        provider: res.provider,
      });
    },
    onError: (e) => setMsg((e as Error).message),
  });

  const confirm = useMutation({
    mutationFn: (reference: string) => completeSandboxPayment({ data: { reference } }),
    onSuccess: (res) => {
      setPending(null);
      setMsg(res.already ? "This payment was already credited." : "Davinto Coins added to your wallet.");
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e) => setMsg((e as Error).message),
  });

  if (isPending) return <AppShell><div className="h-40 animate-pulse rounded-xl bg-surface" /></AppShell>;
  if (!user) return <RedirectToSignIn />;
  const w = q.data;

  return (
    <AppShell>
      <p className="text-xs tracking-[0.2em] text-muted uppercase">Wallet</p>
      <h1 className="mt-1 font-display text-3xl tracking-tight">Davinto Coins</h1>
      <p className="mt-6 font-display text-5xl tabular-nums tracking-tight">{(w?.balance ?? 0).toLocaleString()}</p>
      <p className="text-sm text-muted">{w?.coinSymbol ?? "D-Coins"} · purchased {(w?.lifetimePurchased ?? 0).toLocaleString()} · spent {(w?.lifetimeSpent ?? 0).toLocaleString()}</p>
      <div className="mt-6 flex gap-3">
        <Link to="/wallet/transactions" className="inline-flex h-11 items-center rounded-md px-4 text-sm shadow-[var(--shadow-border)]">
          Transaction history
        </Link>
      </div>

      <h2 className="mt-10 font-display text-xl">Buy Davinto Coins</h2>
      <p className="mt-1 text-sm text-muted">
        {w?.payment.configured
          ? `Checkout is handled by ${w.payment.provider}. Coins are credited only after the provider confirms the payment.`
          : "Payment provider keys are not configured yet. Sandbox checkout still creates a real pending transaction and credits coins only when you confirm it here — never by opening a success page."}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(w?.packages ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => buy.mutate(p.id)}
            className="rounded-xl bg-surface p-4 text-left shadow-[var(--shadow-border)]"
          >
            <p className="text-sm text-muted">{p.name}</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{(p.coins + p.bonusCoins).toLocaleString()}</p>
            <p className="text-xs text-subtle">
              {p.coins.toLocaleString()} + {p.bonusCoins.toLocaleString()} bonus
            </p>
            <p className="mt-2 text-sm">{formatNaira(p.priceKobo)}</p>
          </button>
        ))}
      </div>
      {msg ? <p className="mt-4 text-sm text-muted">{msg}</p> : null}

      {pending ? (
        <div className="mt-8 rounded-xl bg-elevated p-5 shadow-[var(--shadow-border)]">
          <h3 className="font-display text-lg">Confirm sandbox payment</h3>
          <p className="mt-2 text-sm text-muted">
            Reference {pending.reference}. {pending.coins.toLocaleString()} Davinto Coins for {formatNaira(pending.amountKobo)}.
            This step stands in for a verified {pending.provider} webhook.
          </p>
          <Button className="mt-4" onClick={() => confirm.mutate(pending.reference)} disabled={confirm.isPending}>
            {confirm.isPending ? "Verifying…" : "Confirm payment"}
          </Button>
        </div>
      ) : null}
    </AppShell>
  );
}
