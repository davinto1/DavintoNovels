import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { formatDate, formatNaira } from "@/lib/format";
import { adminFailPayment, adminListPayments } from "@/lib/server/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin/payments")({ component: AdminPayments });

function AdminPayments() {
  const { user } = useCurrentUserState();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-pay"], queryFn: () => adminListPayments(), enabled: !!user });
  const fail = useMutation({
    mutationFn: (id: string) => adminFailPayment({ data: { id, note: "Marked failed by admin" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pay"] }),
  });
  return (
    <AdminShell>
      <h1 className="font-display text-3xl tracking-tight">Payments</h1>
      <p className="mt-1 text-sm text-muted">
        Successful credits only happen after provider verification. Staff cannot mark a payment successful from this table — that would skip the webhook.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-2">ID</th>
              <th>User</th>
              <th>Provider</th>
              <th>Amount</th>
              <th>Coins</th>
              <th>Status</th>
              <th>Verified</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-3 font-mono text-xs">{p.id}</td>
                <td>{p.username}</td>
                <td>{p.provider}</td>
                <td>{formatNaira(p.amount_kobo)}</td>
                <td className="tabular-nums">{p.coins}</td>
                <td>{p.status}</td>
                <td>{p.verified ? "yes" : "no"}</td>
                <td>
                  {p.status === "pending" ? (
                    <button type="button" className="text-xs text-muted" onClick={() => fail.mutate(p.id)}>
                      Mark failed
                    </button>
                  ) : (
                    <span className="text-xs text-subtle">{formatDate(p.created_at)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
