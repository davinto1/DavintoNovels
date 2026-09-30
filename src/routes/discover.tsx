import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { NovelCard } from "@/components/novel-card";
import { listGenres, searchNovels } from "@/lib/server/catalog";

type Search = { q?: string; genre?: string; sort?: string; status?: string };

export const Route = createFileRoute("/discover")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    genre: typeof s.genre === "string" ? s.genre : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  component: Discover,
});

function Discover() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const genres = useQuery({ queryKey: ["genres"], queryFn: () => listGenres() });
  const novels = useQuery({
    queryKey: ["discover", search],
    queryFn: () => searchNovels({ data: search }),
  });

  function set(partial: Search) {
    navigate({ search: { ...search, ...partial } });
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl tracking-tight">Discover</h1>
      <p className="mt-1 text-sm text-muted">Browse the catalogue by mood, genre, and pace.</p>
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          set({ q: String(fd.get("q") || "") || undefined });
        }}
      >
        <input
          name="q"
          defaultValue={search.q ?? ""}
          placeholder="Search titles, authors, synopses"
          className="h-12 w-full rounded-lg bg-elevated px-4 text-sm shadow-[var(--shadow-border)] outline-none placeholder:text-subtle"
        />
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip active={!search.genre} onClick={() => set({ genre: undefined })}>
          All genres
        </Chip>
        {(genres.data ?? []).map((g) => (
          <Chip key={g.id} active={search.genre === g.slug || search.genre === g.id} onClick={() => set({ genre: g.slug })}>
            {g.name}
          </Chip>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          ["popular", "Popular"],
          ["updated", "Updated"],
          ["newest", "Newest"],
          ["rating", "Top rated"],
        ].map(([v, l]) => (
          <Chip key={v} active={(search.sort ?? "popular") === v} onClick={() => set({ sort: v })}>
            {l}
          </Chip>
        ))}
        <Chip active={search.status === "ongoing"} onClick={() => set({ status: search.status === "ongoing" ? undefined : "ongoing" })}>
          Ongoing
        </Chip>
        <Chip active={search.status === "completed"} onClick={() => set({ status: search.status === "completed" ? undefined : "completed" })}>
          Completed
        </Chip>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {(novels.data ?? []).map((n) => (
          <NovelCard key={n.id} novel={n} />
        ))}
      </div>
      {novels.data && novels.data.length === 0 ? (
        <p className="mt-10 text-sm text-muted">No novels match that filter yet.</p>
      ) : null}
    </AppShell>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
          : "rounded-full bg-elevated px-3 py-1.5 text-xs text-muted shadow-[var(--shadow-border)]"
      }
    >
      {children}
    </button>
  );
}
