import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { formatDate } from "@/lib/format";
import { adminListWithdrawals, adminReviewWithdrawal } from "@/lib/server/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin/withdrawals")({ component: AdminWd });

function AdminWd() {
  const { user } = useCurrentUserState();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-wd"], queryFn: () => adminListWithdrawals(), enabled: !!user });
  const mut = useMutation({
    mutationFn: (d: { id: string; status: "approved" | "rejected" | "paid"; payoutReference?: string; notes?: string }) =>
      adminReviewWithdrawal({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-wd"] }),
  });
  return (
    <AdminShell>
      <h1 className="font-display text-3xl tracking-tight">Withdrawals</h1>
      <p className="mt-1 text-sm text-muted">Marking paid records a reference. Funds are not sent automatically.</p>
      <ul className="mt-4 divide-y divide-border">
        {(q.data ?? []).map((w) => (
          <li key={w.id} className="py-4">
            <p className="text-sm">
              {w.author} · {w.amount} coins · {w.status}
            </p>
            <p className="text-xs text-subtle">
              {w.bank_name} · {w.account_name} · ••••{w.account_number_last4} · {formatDate(w.created_at)}
            </p>
            {w.status === "pending" || w.status === "approved" ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <button type="button" className="rounded-full bg-elevated px-3 py-1" onClick={() => mut.mutate({ id: w.id, status: "approved" })}>
                  Approve
                </button>
                <button type="button" className="rounded-full bg-elevated px-3 py-1" onClick={() => mut.mutate({ id: w.id, status: "rejected", notes: "Rejected" })}>
                  Reject
                </button>
                <button
                  type="button"
                  className="rounded-full bg-elevated px-3 py-1"
                  onClick={() => {
                    const ref = prompt("Payout reference") ?? "";
                    mut.mutate({ id: w.id, status: "paid", payoutReference: ref, notes: "Marked paid" });
                  }}
                >
                  Mark paid
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted">{w.payout_reference}</p>
            )}
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
