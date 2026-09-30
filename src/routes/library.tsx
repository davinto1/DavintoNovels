import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CoverArt } from "@/components/cover-art";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getLibraryPage } from "@/lib/server/library";

export const Route = createFileRoute("/library")({ component: LibraryPage });

function LibraryPage() {
  const { user, isPending } = useCurrentUserState();
  const q = useQuery({ queryKey: ["library"], queryFn: () => getLibraryPage(), enabled: !!user });
  if (isPending) return <AppShell><div className="h-40 animate-pulse rounded-xl bg-surface" /></AppShell>;
  if (!user) return <RedirectToSignIn />;
  const d = q.data;
  return (
    <AppShell>
      <h1 className="font-display text-3xl tracking-tight">Library</h1>
      <section className="mt-8">
        <h2 className="font-display text-xl">Saved novels</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {(d?.library ?? []).map((n) => (
            <Link key={n.id} to="/novels/$id" params={{ id: n.id }}>
              <div className="aspect-[3/4] overflow-hidden rounded-[18px] shadow-[var(--shadow-border)]">
                <CoverArt title={n.title} palette={n.cover_palette} url={n.cover_url} />
              </div>
              <p className="mt-2 truncate font-display text-sm">{n.title}</p>
              <p className="text-xs text-muted">
                {n.chapter_title ? `Continue: ${n.chapter_title}` : n.author}
              </p>
            </Link>
          ))}
        </div>
        {d?.library.length === 0 ? <p className="mt-4 text-sm text-muted">Nothing saved yet. Browse the house and keep what you love.</p> : null}
      </section>
      <section className="mt-10">
        <h2 className="font-display text-xl">Reading history</h2>
        <ul className="mt-3 divide-y divide-border">
          {(d?.history ?? []).map((h) => (
            <li key={h.id + h.chapter_id} className="py-3">
              <Link to="/novels/$id/chapter/$chapterId" params={{ id: h.id, chapterId: h.chapter_id }} className="text-sm">
                {h.title} · {h.chapter_title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-xl">Followed authors</h2>
        <ul className="mt-3 space-y-2">
          {(d?.following ?? []).map((a) => (
            <li key={a.user_id}>
              <Link to="/authors/$id" params={{ id: a.user_id }} className="text-sm">
                {a.display_name}
              </Link>
              <p className="text-xs text-muted">{a.bio}</p>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
