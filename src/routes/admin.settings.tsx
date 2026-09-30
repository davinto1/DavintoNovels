import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { adminAddGenre, adminGetSettings, adminListAudit, adminSaveSettings } from "@/lib/server/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function AdminSettings() {
  const { user } = useCurrentUserState();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-set"], queryFn: () => adminGetSettings(), enabled: !!user });
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => adminListAudit(), enabled: !!user });
  const [form, setForm] = useState<Record<string, string>>({});
  const [genre, setGenre] = useState("");
  useEffect(() => {
    if (!q.data) return;
    const s = q.data.settings;
    setForm({
      platform_name: s.platformName,
      coin_name: s.coinName,
      coin_symbol: s.coinSymbol,
      author_revenue_percent: String(s.authorRevenuePercent),
      min_withdrawal_coins: String(s.minWithdrawalCoins),
      welcome_bonus_coins: String(s.welcomeBonusCoins),
      default_chapter_price: String(s.defaultChapterPrice),
      payment_provider: s.paymentProvider,
      hero_kicker: s.heroKicker,
      hero_title: s.heroTitle,
      hero_body: s.heroBody,
      announcement: s.announcement,
      writers_cta: s.writersCta,
    });
  }, [q.data]);
  const save = useMutation({
    mutationFn: () => adminSaveSettings({ data: form }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-set"] }),
  });
  const addG = useMutation({
    mutationFn: () => adminAddGenre({ data: { name: genre } }),
    onSuccess: () => {
      setGenre("");
      qc.invalidateQueries({ queryKey: ["admin-set"] });
    },
  });
  const pay = q.data?.payment;
  return (
    <AdminShell>
      <h1 className="font-display text-3xl tracking-tight">Site settings</h1>
      <form
        className="mt-6 grid max-w-xl gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {Object.entries(form).map(([k, v]) => (
          <div key={k}>
            <Label className="capitalize">{k.replace(/_/g, " ")}</Label>
            {k.includes("body") || k.includes("announcement") || k.includes("cta") ? (
              <Textarea value={v} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            ) : (
              <Input value={v} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            )}
          </div>
        ))}
        <Button type="submit" disabled={save.isPending}>
          Save settings
        </Button>
      </form>

      <h2 className="mt-10 font-display text-xl">Payment provider</h2>
      <div className="mt-3 max-w-xl rounded-xl bg-surface p-4 text-sm shadow-[var(--shadow-border)]">
        <p>Mode: {pay?.configured ? pay.provider : "sandbox (no secret key)"}</p>
        <p className="mt-1 text-muted">Public key: {pay?.publicKey ?? "not set"}</p>
        <p className="mt-1 text-muted">
          Settlement: {pay?.settlementBank} · {pay?.settlementName} · {pay?.settlementMasked}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-subtle">
          Configure on the server only: PAYMENT_PROVIDER, PAYMENT_PUBLIC_KEY, PAYMENT_SECRET_KEY, PAYMENT_WEBHOOK_SECRET,
          SETTLEMENT_BANK, SETTLEMENT_ACCOUNT_NAME, SETTLEMENT_ACCOUNT_NUMBER. Never put secret keys in the client.
          Webhook path: /api/payments/webhook. Coins credit only after signature verification.
        </p>
      </div>

      <h2 className="mt-10 font-display text-xl">Genres</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {(q.data?.genres ?? []).map((g) => (
          <span key={g.id} className="rounded-full bg-elevated px-3 py-1 text-xs">
            {g.name}
          </span>
        ))}
      </div>
      <form
        className="mt-3 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addG.mutate();
        }}
      >
        <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="New genre" />
        <Button type="submit">Add</Button>
      </form>

      <h2 className="mt-10 font-display text-xl">Audit log</h2>
      <ul className="mt-3 max-w-xl divide-y divide-border text-xs">
        {(audit.data ?? []).map((a) => (
          <li key={a.id} className="py-2">
            {a.action} · {a.target_type} {a.target_id} · {formatDate(a.created_at)}
            <span className="block text-subtle">{a.details}</span>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
