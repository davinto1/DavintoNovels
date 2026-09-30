import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { adminListNovels, adminUpdateNovel } from "@/lib/server/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin/novels")({ component: AdminNovels });

function AdminNovels() {
  const { user } = useCurrentUserState();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-novels"], queryFn: () => adminListNovels(), enabled: !!user });
  const mut = useMutation({
    mutationFn: (d: { id: string; status?: string; featured?: boolean }) => adminUpdateNovel({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-novels"] }),
  });
  return (
    <AdminShell>
      <h1 className="font-display text-3xl tracking-tight">Novels</h1>
      <ul className="mt-4 divide-y divide-border">
        {(q.data ?? []).map((n) => (
          <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <Link to="/novels/$id" params={{ id: n.id }} className="font-display">
                {n.title}
              </Link>
              <p className="text-xs text-muted">
                {n.author} · {n.status} · {n.views} reads {n.featured ? "· featured" : ""}
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <button type="button" className="rounded-full bg-elevated px-3 py-1" onClick={() => mut.mutate({ id: n.id, featured: !n.featured })}>
                {n.featured ? "Unfeature" : "Feature"}
              </button>
              <button type="button" className="rounded-full bg-elevated px-3 py-1" onClick={() => mut.mutate({ id: n.id, status: n.status === "hidden" ? "ongoing" : "hidden" })}>
                {n.status === "hidden" ? "Restore" : "Hide"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
