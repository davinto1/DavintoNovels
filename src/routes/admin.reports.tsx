import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { formatDate } from "@/lib/format";
import { adminHandleReport, adminListReports } from "@/lib/server/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin/reports")({ component: AdminReports });

function AdminReports() {
  const { user } = useCurrentUserState();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-rep"], queryFn: () => adminListReports(), enabled: !!user });
  const mut = useMutation({
    mutationFn: (d: { id: string; action: "dismiss" | "hide" | "warn" | "suspend" }) => adminHandleReport({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-rep"] }),
  });
  return (
    <AdminShell>
      <h1 className="font-display text-3xl tracking-tight">Reports</h1>
      <ul className="mt-4 divide-y divide-border">
        {(q.data ?? []).map((r) => (
          <li key={r.id} className="py-4">
            <p className="text-sm">
              {r.target_type} · {r.reason} · {r.status}
            </p>
            <p className="text-xs text-muted">
              {r.reporter} · {formatDate(r.created_at)} · {r.details}
            </p>
            {r.status === "open" ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {(["dismiss", "hide", "warn", "suspend"] as const).map((a) => (
                  <button key={a} type="button" className="rounded-full bg-elevated px-3 py-1 capitalize" onClick={() => mut.mutate({ id: r.id, action: a })}>
                    {a}
                  </button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
