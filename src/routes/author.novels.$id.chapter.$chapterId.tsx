import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getChapterEditor, upsertChapter } from "@/lib/server/author";

export const Route = createFileRoute("/author/novels/$id/chapter/$chapterId")({ component: EditChapter });

function EditChapter() {
  const { id, chapterId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const nav = useNavigate();
  const q = useQuery({
    queryKey: ["ch-ed", chapterId],
    queryFn: () => getChapterEditor({ data: { novelId: id, chapterId } }),
    enabled: !!user,
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "scheduled">("draft");
  const [premium, setPremium] = useState(false);
  const [price, setPrice] = useState(20);
  useEffect(() => {
    if (!q.data) return;
    setTitle(q.data.title);
    setBody(q.data.body);
    setStatus(q.data.status as typeof status);
    setPremium(q.data.is_premium);
    setPrice(q.data.coin_price);
  }, [q.data]);
  const save = useMutation({
    mutationFn: () =>
      upsertChapter({
        data: { novelId: id, chapterId, title, body, status, isPremium: premium, coinPrice: price },
      }),
    onSuccess: () => nav({ to: "/author/novels/$id", params: { id } }),
  });
  if (isPending) return <AppShell><div className="h-40 animate-pulse rounded-xl bg-surface" /></AppShell>;
  if (!user) return <RedirectToSignIn />;
  return (
    <AppShell>
      <Link to="/author/novels/$id" params={{ id }} className="text-sm text-muted">
        Novel
      </Link>
      <h1 className="mt-2 font-display text-3xl tracking-tight">Edit chapter</h1>
      <form
        className="mt-6 max-w-2xl space-y-4"
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
          <Label>Manuscript</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-80 font-serif" />
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-11 rounded-md bg-elevated px-3 text-sm">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} />
            Premium
          </label>
          {premium ? <Input type="number" className="w-28" value={price} onChange={(e) => setPrice(Number(e.target.value))} /> : null}
        </div>
        <Button type="submit" disabled={save.isPending}>
          Save
        </Button>
      </form>
    </AppShell>
  );
}
