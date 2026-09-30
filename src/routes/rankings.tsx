import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CoverArt } from "@/components/cover-art";
import { formatCompact } from "@/lib/format";
import { getRankings } from "@/lib/server/catalog";
import type { NovelCard } from "@/lib/types";

export const Route = createFileRoute("/rankings")({ component: Rankings });

function Rankings() {
  const q = useQuery({ queryKey: ["rankings"], queryFn: () => getRankings() });
  return (
    <AppShell>
      <h1 className="font-display text-3xl tracking-tight">Rankings</h1>
      <p className="mt-1 text-sm text-muted">What the house is reading now.</p>
      <div className="mt-8 grid gap-10 md:grid-cols-3">
        <Col title="Power" items={q.data?.power ?? []} metric={(n) => `${formatCompact(n.views)} reads`} />
        <Col title="Collection" items={q.data?.collection ?? []} metric={(n) => `${formatCompact(n.libraryCount)} in libraries`} />
        <Col title="Rated" items={q.data?.rated ?? []} metric={(n) => `${n.ratingAvg.toFixed(1)} · ${n.ratingCount}`} />
      </div>
    </AppShell>
  );
}

function Col({ title, items, metric }: { title: string; items: NovelCard[]; metric: (n: NovelCard) => string }) {
  return (
    <div>
      <h2 className="mb-4 font-display text-xl">{title}</h2>
      <ol className="space-y-3">
        {items.map((n, i) => (
          <li key={n.id}>
            <Link to="/novels/$id" params={{ id: n.id }} className="flex gap-3">
              <span className="w-6 pt-1 text-sm tabular-nums text-subtle">{i + 1}</span>
              <div className="h-[72px] w-[52px] overflow-hidden rounded-md shadow-[var(--shadow-border)]">
                <CoverArt title={n.title} palette={n.coverPalette} url={n.coverUrl} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-[15px]">{n.title}</p>
                <p className="text-xs text-muted">{n.author.displayName}</p>
                <p className="text-[11px] tabular-nums text-subtle">{metric(n)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
