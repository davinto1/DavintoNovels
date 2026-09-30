import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatDate } from "@/lib/format";
import { listPurchasedChapters, listWalletTransactions } from "@/lib/server/wallet";

export const Route = createFileRoute("/wallet/transactions")({ component: TxPage });

function TxPage() {
  const { user, isPending } = useCurrentUserState();
  const tx = useQuery({ queryKey: ["wallet-tx"], queryFn: () => listWalletTransactions(), enabled: !!user });
  const bought = useQuery({ queryKey: ["purchases"], queryFn: () => listPurchasedChapters(), enabled: !!user });
  if (isPending) return <AppShell><div className="h-40 animate-pulse rounded-xl bg-surface" /></AppShell>;
  if (!user) return <RedirectToSignIn />;
  return (
    <AppShell>
      <Link to="/wallet" className="text-sm text-muted">
        Wallet
      </Link>
      <h1 className="mt-2 font-display text-3xl tracking-tight">Ledger</h1>
      <ul className="mt-6 divide-y divide-border">
        {(tx.data ?? []).map((t) => (
          <li key={t.id} className="flex items-baseline justify-between gap-4 py-3">
            <div>
              <p className="text-sm">{t.description || t.kind}</p>
              <p className="text-xs text-subtle">
                {t.id} · {formatDate(t.created_at)}
              </p>
            </div>
            <p className={`tabular-nums text-sm ${t.amount >= 0 ? "text-fg" : "text-muted"}`}>
              {t.amount > 0 ? "+" : ""}
              {t.amount}
            </p>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-display text-xl">Purchased chapters</h2>
      <ul className="mt-3 divide-y divide-border">
        {(bought.data ?? []).map((p) => (
          <li key={p.id} className="py-3">
            <Link to="/novels/$id/chapter/$chapterId" params={{ id: p.novel_id, chapterId: p.chapter_id }} className="text-sm">
              {p.novel_title} · {p.chapter_title}
            </Link>
            <p className="text-xs text-subtle">
              {p.coins_spent} D-Coins · {formatDate(p.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
