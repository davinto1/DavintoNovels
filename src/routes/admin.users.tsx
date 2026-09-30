import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { adminAdjustWallet, adminListUsers, adminSetUserRole } from "@/lib/server/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const { user } = useCurrentUserState();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => adminListUsers(), enabled: !!user });
  const role = useMutation({
    mutationFn: (d: { userId: string; role: Role; suspended?: boolean }) => adminSetUserRole({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const adj = useMutation({
    mutationFn: (d: { userId: string; amount: number; reason: string }) => adminAdjustWallet({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  return (
    <AdminShell>
      <h1 className="font-display text-3xl tracking-tight">Users</h1>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-2">Name</th>
              <th>Role</th>
              <th>Coins</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((u) => (
              <tr key={u.user_id} className="border-t border-border">
                <td className="py-3">
                  {u.display_name}
                  <span className="block text-xs text-subtle">
                    @{u.username}
                    {u.is_system ? " · catalogue" : ""}
                    {u.is_suspended ? " · suspended" : ""}
                  </span>
                </td>
                <td>
                  <select
                    value={u.role}
                    className="h-9 rounded-md bg-elevated px-2 text-xs"
                    onChange={(e) => role.mutate({ userId: u.user_id, role: e.target.value as Role })}
                  >
                    {["reader", "author", "moderator", "admin", "super_admin"].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="tabular-nums">{u.balance}</td>
                <td className="space-x-2 text-xs">
                  <button type="button" className="text-muted" onClick={() => role.mutate({ userId: u.user_id, role: u.role, suspended: !u.is_suspended })}>
                    {u.is_suspended ? "Unsuspend" : "Suspend"}
                  </button>
                  <button
                    type="button"
                    className="text-muted"
                    onClick={() => {
                      const amount = Number(prompt("Adjustment amount (negative to deduct)", "50"));
                      const reason = prompt("Reason (recorded in the ledger)", "Admin adjustment") ?? "";
                      if (!amount || !reason) return;
                      adj.mutate({ userId: u.user_id, amount, reason });
                    }}
                  >
                    Adjust coins
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
