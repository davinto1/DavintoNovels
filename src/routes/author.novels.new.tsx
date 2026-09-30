import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { COVER_PALETTES } from "@/lib/covers";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listGenres } from "@/lib/server/catalog";
import { createNovel } from "@/lib/server/author";

export const Route = createFileRoute("/author/novels/new")({ component: NewNovel });

function NewNovel() {
  const { user, isPending } = useCurrentUserState();
  const nav = useNavigate();
  const genres = useQuery({ queryKey: ["genres"], queryFn: () => listGenres() });
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [palette, setPalette] = useState(COVER_PALETTES[0].id);
  const [selected, setSelected] = useState<string[]>([]);
  const [age, setAge] = useState("all");
  const save = useMutation({
    mutationFn: () =>
      createNovel({
        data: { title, synopsis, genreIds: selected, coverPalette: palette, ageRating: age },
      }),
    onSuccess: (r) => nav({ to: "/author/novels/$id", params: { id: r.id } }),
  });
  if (isPending) return <AppShell><div className="h-40 animate-pulse rounded-xl bg-surface" /></AppShell>;
  if (!user) return <RedirectToSignIn />;
  return (
    <AppShell>
      <h1 className="font-display text-3xl tracking-tight">New novel</h1>
      <form
        className="mt-8 max-w-xl space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        </div>
        <div>
          <Label>Synopsis</Label>
          <Textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} required />
        </div>
        <div>
          <Label>Genres</Label>
          <div className="flex flex-wrap gap-2">
            {(genres.data ?? []).map((g) => {
              const on = selected.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelected(on ? selected.filter((x) => x !== g.id) : [...selected, g.id].slice(0, 4))}
                  className={on ? "rounded-full bg-accent px-3 py-1 text-xs text-accent-fg" : "rounded-full bg-elevated px-3 py-1 text-xs"}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label>Age</Label>
          <select value={age} onChange={(e) => setAge(e.target.value)} className="h-11 w-full rounded-md bg-elevated px-3 text-sm">
            <option value="all">All ages</option>
            <option value="13">13+</option>
            <option value="16">16+</option>
            <option value="18">18+</option>
          </select>
        </div>
        <div>
          <Label>Cover jacket</Label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {COVER_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPalette(p.id)}
                className="h-16 rounded-md"
                style={{ background: `linear-gradient(165deg, ${p.from}, ${p.to})`, outline: palette === p.id ? "2px solid var(--color-accent)" : undefined }}
                aria-label={p.name}
              />
            ))}
          </div>
        </div>
        {save.isError ? <p className="text-sm text-danger">{(save.error as Error).message}</p> : null}
        <Button type="submit" disabled={save.isPending}>
          Create novel
        </Button>
      </form>
    </AppShell>
  );
}
