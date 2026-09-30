import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Rail, Section } from "@/components/app-shell";
import { CoverArt } from "@/components/cover-art";
import { NovelCard } from "@/components/novel-card";
import { getHomeData, getPublicSettings, listGenres } from "@/lib/server/catalog";
import { initials } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const home = useQuery({ queryKey: ["home"], queryFn: () => getHomeData() });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => getPublicSettings() });
  const genres = useQuery({ queryKey: ["genres"], queryFn: () => listGenres() });
  const d = home.data;
  const s = settings.data;

  return (
    <AppShell>
      {s?.announcement ? (
        <p className="mb-4 rounded-lg bg-elevated px-4 py-3 text-sm text-muted">{s.announcement}</p>
      ) : null}

      <section className="overflow-hidden rounded-[28px] bg-surface px-6 py-10 md:px-12 md:py-16">
        <p className="text-xs tracking-[0.22em] text-muted uppercase">{s?.heroKicker ?? "A house for stories"}</p>
        <h1 className="mt-4 max-w-xl font-display text-4xl leading-[1.05] tracking-tight md:text-6xl">
          {s?.heroTitle ?? "Read. Write. Earn."}
        </h1>
        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted">
          {s?.heroBody}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/discover" className="inline-flex h-12 items-center rounded-lg bg-accent px-5 text-sm font-medium text-accent-fg">
            Browse the house
          </Link>
          <Link to="/write" className="inline-flex h-12 items-center rounded-lg bg-elevated px-5 text-sm shadow-[var(--shadow-border)]">
            Start writing
          </Link>
        </div>
      </section>

      {d?.featured?.length ? (
        <Section title="Featured">
          <Rail>
            {d.featured.map((n) => (
              <div key={n.id} className="w-[158px] shrink-0 md:w-[180px]">
                <NovelCard novel={n} large />
              </div>
            ))}
          </Rail>
        </Section>
      ) : (
        <div className="mt-10 h-48 animate-pulse rounded-[22px] bg-surface" />
      )}

      {d?.trending?.length ? (
        <Section title="Trending" href="/rankings">
          <Rail>
            {d.trending.map((n) => (
              <div key={n.id} className="w-[148px] shrink-0">
                <NovelCard novel={n} />
              </div>
            ))}
          </Rail>
        </Section>
      ) : null}

      {d?.updated?.length ? (
        <Section title="Recently updated">
          <Rail>
            {d.updated.map((n) => (
              <div key={n.id} className="w-[148px] shrink-0">
                <NovelCard novel={n} />
              </div>
            ))}
          </Rail>
        </Section>
      ) : null}

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="mb-4 font-display text-xl tracking-tight">New releases</h2>
          <div className="space-y-3">
            {d?.newest.slice(0, 4).map((n) => (
              <Link key={n.id} to="/novels/$id" params={{ id: n.id }} className="flex gap-3">
                <div className="h-20 w-14 overflow-hidden rounded-md shadow-[var(--shadow-border)]">
                  <CoverArt title={n.title} palette={n.coverPalette} url={n.coverUrl} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display">{n.title}</p>
                  <p className="text-xs text-muted">{n.author.displayName}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-subtle">{n.synopsis}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 font-display text-xl tracking-tight">Completed</h2>
          <div className="space-y-3">
            {d?.completed.slice(0, 4).map((n) => (
              <Link key={n.id} to="/novels/$id" params={{ id: n.id }} className="flex gap-3">
                <div className="h-20 w-14 overflow-hidden rounded-md shadow-[var(--shadow-border)]">
                  <CoverArt title={n.title} palette={n.coverPalette} url={n.coverUrl} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display">{n.title}</p>
                  <p className="text-xs text-muted">{n.author.displayName}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-subtle">{n.synopsis}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {d?.authors?.length ? (
        <Section title="Popular authors">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {d.authors.map((a) => (
              <Link
                key={a.user_id}
                to="/authors/$id"
                params={{ id: a.user_id }}
                className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]"
              >
                <div className="grid size-10 place-items-center rounded-full bg-elevated font-display text-sm">
                  {initials(a.display_name)}
                </div>
                <p className="mt-3 font-medium">{a.display_name}</p>
                <p className="line-clamp-2 text-xs text-muted">{a.bio}</p>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="Genres">
        <div className="flex flex-wrap gap-2">
          {(genres.data ?? []).map((g) => (
            <Link
              key={g.id}
              to="/discover"
              search={{ genre: g.slug }}
              className="rounded-full bg-elevated px-4 py-2 text-sm shadow-[var(--shadow-border)]"
            >
              {g.name}
            </Link>
          ))}
        </div>
      </Section>

      <section className="mt-12 mb-4 rounded-[28px] bg-surface px-6 py-10 md:px-10">
        <h2 className="font-display text-2xl tracking-tight md:text-3xl">
          {s?.writersCta ?? "Have a story to tell? Start writing on DavintoNovels."}
        </h2>
        <Link to="/write" className="mt-6 inline-flex h-12 items-center rounded-lg bg-accent px-5 text-sm font-medium text-accent-fg">
          Open the writing desk
        </Link>
      </section>
    </AppShell>
  );
}
