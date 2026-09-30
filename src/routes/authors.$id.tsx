import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { NovelCard } from "@/components/novel-card";
import { getAuthorPublic } from "@/lib/server/catalog";
import { initials } from "@/lib/utils";

export const Route = createFileRoute("/authors/$id")({ component: AuthorPublic });

function AuthorPublic() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["author", id], queryFn: () => getAuthorPublic({ data: { id } }) });
  if (!q.data) {
    return (
      <AppShell>
        {q.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-surface" /> : <p className="text-muted">Author not found.</p>}
      </AppShell>
    );
  }
  const p = q.data.profile;
  return (
    <AppShell>
      <div className="grid size-14 place-items-center rounded-full bg-elevated font-display text-lg">{initials(p.display_name)}</div>
      <h1 className="mt-4 font-display text-3xl tracking-tight">{p.display_name}</h1>
      <p className="text-sm text-muted">@{p.username} · {p.followers_count} followers</p>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{p.bio}</p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {q.data.novels.map((n) => (
          <NovelCard key={n.id} novel={n} />
        ))}
      </div>
    </AppShell>
  );
}
