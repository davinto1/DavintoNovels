import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { COVER_PALETTES } from "@/lib/covers";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listGenres } from "@/lib/server/catalog";
import { getAuthorNovel, updateNovel, upsertChapter } from "@/lib/server/author";

export const Route = createFileRoute("/author/novels/$id")({ component: EditNovel });

function EditNovel() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["author-novel", id], queryFn: () => getAuthorNovel({ data: { id } }), enabled: !!user });
  const genres = useQuery({ queryKey: ["genres"], queryFn: () => listGenres() });
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [status, setStatus] = useState("draft");
  const [palette, setPalette] = useState("ink");
  const [selected, setSelected] = useState<string[]>([]);
  const [chTitle, setChTitle] = useState("");
  const [chBody, setChBody] = useState("");
  const [premium, setPremium] = useState(false);
  const [price, setPrice] = useState(20);
  const [chStatus, setChStatus] = useState<"draft" | "published" | "scheduled">("draft");

  useEffect(() => {
    if (!q.data) return;
    setTitle(q.data.novel.title);
    setSynopsis(q.data.novel.synopsis);
    setStatus(q.data.novel.status);
    setPalette(q.data.novel.cover_palette);
    setSelected(q.data.genreIds);
    setPrice(q.data.defaultPrice);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      updateNovel({
        data: { id, title, synopsis, status, coverPalette: palette, genreIds: selected },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["author-novel", id] }),
  });
  const addCh = useMutation({
    mutationFn: () =>
      upsertChapter({
        data: {
          novelId: id,
          title: chTitle,
          body: chBody,
          status: chStatus,
          isPremium: premium,
          coinPrice: price,
        },
      }),
    onSuccess: () => {
      setChTitle("");
      setChBody("");
      qc.invalidateQueries({ queryKey: ["author-novel", id] });
    },
  });

  if (isPending) return <AppShell><div className="h-40 animate-pulse rounded-xl bg-surface" /></AppShell>;
  if (!user) return <RedirectToSignIn />;
  if (q.isError) return <AppShell><p className="text-muted">{(q.error as Error).message}</p></AppShell>;

  return (
    <AppShell>
      <Link to="/author/dashboard" className="text-sm text-muted">
        Desk
      </Link>
      <h1 className="mt-2 font-display text-3xl tracking-tight">Edit novel</h1>
      <form
        className="mt-6 max-w-xl space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Synopsis</Label>
          <Textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
        </div>
        <div>
          <Label>Status</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-full rounded-md bg-elevated px-3 text-sm">
            <option value="draft">Draft</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {(genres.data ?? []).map((g) => {
            const on = selected.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelected(on ? selected.filter((x) => x !== g.id) : [...selected, g.id])}
                className={on ? "rounded-full bg-accent px-3 py-1 text-xs text-accent-fg" : "rounded-full bg-elevated px-3 py-1 text-xs"}
              >
                {g.name}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {COVER_PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPalette(p.id)}
              className="h-12 rounded-md"
              style={{ background: `linear-gradient(165deg, ${p.from}, ${p.to})`, outline: palette === p.id ? "2px solid var(--color-accent)" : undefined }}
            />
          ))}
        </div>
        <Button type="submit" disabled={save.isPending}>
          Save novel
        </Button>
      </form>

      <h2 className="mt-10 font-display text-xl">Chapters</h2>
      <ul className="mt-3 max-w-xl divide-y divide-border">
        {(q.data?.chapters ?? []).map((c) => (
          <li key={c.id} className="flex justify-between py-3 text-sm">
            <span>
              {c.chapter_number}. {c.title}
              <span className="ml-2 text-xs text-subtle">
                {c.status}
                {c.is_premium ? ` · ${c.coin_price} D-Coins` : " · free"}
              </span>
            </span>
            <Link to="/author/novels/$id/chapter/$chapterId" params={{ id, chapterId: c.id }} className="text-muted">
              Edit
            </Link>
          </li>
        ))}
      </ul>

      <h3 className="mt-8 font-display text-lg">New chapter</h3>
      <form
        className="mt-3 max-w-xl space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          addCh.mutate();
        }}
      >
        <Input value={chTitle} onChange={(e) => setChTitle(e.target.value)} placeholder="Chapter title" required />
        <Textarea value={chBody} onChange={(e) => setChBody(e.target.value)} placeholder="Write in plain language. **bold**, *italic*, and # headings work." className="min-h-48 font-serif" required />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select value={chStatus} onChange={(e) => setChStatus(e.target.value as typeof chStatus)} className="h-11 rounded-md bg-elevated px-3">
            <option value="draft">Draft</option>
            <option value="published">Publish now</option>
            <option value="scheduled">Schedule</option>
          </select>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} />
            Premium
          </label>
          {premium ? (
            <Input type="number" className="w-28" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          ) : null}
        </div>
        {addCh.isError ? <p className="text-sm text-danger">{(addCh.error as Error).message}</p> : null}
        <Button type="submit" disabled={addCh.isPending}>
          Save chapter
        </Button>
      </form>
    </AppShell>
  );
}
