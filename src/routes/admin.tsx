import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { getAdminOverview } from "@/lib/server/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin")({ component: AdminHome });

function AdminHome() {
  const { user } = useCurrentUserState();
  const q = useQuery({ queryKey: ["admin-ov"], queryFn: () => getAdminOverview(), enabled: !!user });
  const s = q.data;
  return (
    <AdminShell>
      <h1 className="font-display text-3xl tracking-tight">Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card k="Users" v={s?.users} />
        <Card k="Authors" v={s?.authors} />
        <Card k="Novels" v={s?.novels} />
        <Card k="Chapters" v={s?.chapters} />
        <Card k="Free chapters" v={s?.freeCh} />
        <Card k="Premium chapters" v={s?.premCh} />
        <Card k="Coins purchased" v={s?.coinsPurchased} />
        <Card k="Coin purchases" v={s?.purchases} />
        <Card k="Chapter unlocks" v={s?.unlocks} />
        <Card k="Platform revenue" v={s?.platformRev} />
        <Card k="Author earnings" v={s?.authorEarn} />
        <Card k="Pending withdrawals" v={s?.pendingWd} />
        <Card k="Completed withdrawals" v={s?.paidWd} />
        <Card k="Failed payments" v={s?.failedPay} />
      </div>
    </AdminShell>
  );
}

function Card({ k, v }: { k: string; v?: number }) {
  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="text-xs text-muted">{k}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{(v ?? 0).toLocaleString()}</p>
    </div>
  );
}
