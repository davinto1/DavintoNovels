import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CoverArt } from "@/components/cover-art";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatDate } from "@/lib/format";
import { getAuthorDashboard, listMyWithdrawals, requestWithdrawal } from "@/lib/server/author";

export const Route = createFileRoute("/author/dashboard")({ component: AuthorDash });

function AuthorDash() {
  const { user, isPending } = useCurrentUserState();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["author-dash"], queryFn: () => getAuthorDashboard(), enabled: !!user });
  const wd = useQuery({ queryKey: ["my-wd"], queryFn: () => listMyWithdrawals(), enabled: !!user });
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [accName, setAccName] = useState("");
  const [accNum, setAccNum] = useState("");
  const req = useMutation({
    mutationFn: () =>
      requestWithdrawal({
        data: { amount: Number(amount), bankName: bank, accountName: accName, accountNumber: accNum },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["author-dash"] });
      qc.invalidateQueries({ queryKey: ["my-wd"] });
    },
  });
  if (isPending) return <AppShell><div className="h-40 animate-pulse rounded-xl bg-surface" /></AppShell>;
  if (!user) return <RedirectToSignIn />;
  const d = q.data;
  if (q.isError) {
    return (
      <AppShell>
        <p className="text-muted">{(q.error as Error).message}</p>
        <Link to="/write" className="mt-4 inline-block text-sm underline">
          Become an author
        </Link>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Author desk</h1>
          <p className="text-sm text-muted">Revenue share {d?.revenuePercent ?? "—"}% · min withdrawal {d?.minWithdrawal ?? "—"} coins</p>
        </div>
        <Link to="/author/novels/new" className="inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg">
          New novel
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Reads" value={d?.stats.views ?? 0} />
        <Stat label="Likes" value={d?.stats.likes ?? 0} />
        <Stat label="Libraries" value={d?.stats.library ?? 0} />
        <Stat label="Unlocks" value={d?.stats.unlocks ?? 0} />
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Stat label="Available" value={d?.earnings.available ?? 0} />
        <Stat label="Pending" value={d?.earnings.pending ?? 0} />
        <Stat label="Withdrawn" value={d?.earnings.withdrawn ?? 0} />
      </div>
      <h2 className="mt-10 font-display text-xl">Novels</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {(d?.novels ?? []).map((n) => (
          <Link key={n.id} to="/author/novels/$id" params={{ id: n.id }}>
            <div className="aspect-[3/4] overflow-hidden rounded-[18px] shadow-[var(--shadow-border)]">
              <CoverArt title={n.title} palette={n.cover_palette} />
            </div>
            <p className="mt-2 truncate font-display text-sm">{n.title}</p>
            <p className="text-xs text-muted capitalize">{n.status} · {n.chapter_count} ch</p>
          </Link>
        ))}
      </div>
      <h2 className="mt-10 font-display text-xl">Withdraw</h2>
      <p className="mt-1 text-sm text-muted">
        Payouts are reviewed by the house. Money is not sent automatically until a payout API is connected.
      </p>
      <form
        className="mt-4 grid max-w-lg gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          req.mutate();
        }}
      >
        <div>
          <Label>Amount (coins)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <Label>Bank</Label>
          <Input value={bank} onChange={(e) => setBank(e.target.value)} required />
        </div>
        <div>
          <Label>Account name</Label>
          <Input value={accName} onChange={(e) => setAccName(e.target.value)} required />
        </div>
        <div>
          <Label>Account number</Label>
          <Input value={accNum} onChange={(e) => setAccNum(e.target.value)} required />
        </div>
        {req.isError ? <p className="text-sm text-danger">{(req.error as Error).message}</p> : null}
        <Button type="submit" disabled={req.isPending}>
          Request withdrawal
        </Button>
      </form>
      <ul className="mt-6 max-w-lg divide-y divide-border text-sm">
        {(wd.data ?? []).map((w) => (
          <li key={w.id} className="flex justify-between py-2">
            <span>
              {w.amount} · {w.status}
              <span className="block text-xs text-subtle">{formatDate(w.created_at)}</span>
            </span>
            <span className="text-xs text-muted">{w.payout_reference}</span>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
