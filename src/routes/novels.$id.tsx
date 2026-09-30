import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Flag, Heart, Share2, Star } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CoverArt } from "@/components/cover-art";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatCompact, formatDate } from "@/lib/format";
import { getNovelPage } from "@/lib/server/catalog";
import { submitComment, submitReport, submitReview, toggleFollow, toggleLibrary, toggleLike, toggleBookmark } from "@/lib/server/library";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/novels/$id")({ component: NovelPage });

function NovelPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useCurrentUserState();
  const q = useQuery({ queryKey: ["novel", id], queryFn: () => getNovelPage({ data: { id } }) });
  const data = q.data;
  const [review, setReview] = useState("");
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [tab, setTab] = useState<"chapters" | "reviews" | "comments">("chapters");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["novel", id] });

  if (q.isLoading) {
    return (
      <AppShell>
        <div className="h-64 animate-pulse rounded-[24px] bg-surface" />
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell>
        <p className="text-muted">This novel could not be found.</p>
      </AppShell>
    );
  }
  const n = data.novel;
  const first = data.chapters[0];
  const latest = data.chapters[data.chapters.length - 1];

  return (
    <AppShell>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <div className="mx-auto aspect-[3/4] w-[200px] overflow-hidden rounded-[22px] shadow-[var(--shadow-border)]">
          <CoverArt title={n.title} author={n.author.displayName} palette={n.coverPalette} url={n.coverUrl} />
        </div>
        <div>
          <p className="text-xs tracking-[0.18em] text-muted uppercase">{n.status}</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight md:text-4xl">{n.title}</h1>
          <Link to="/authors/$id" params={{ id: n.author.id }} className="mt-1 inline-block text-sm text-muted hover:text-fg">
            {n.author.displayName}
          </Link>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">{n.synopsis}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {n.genres.map((g) => (
              <Link key={g.id} to="/discover" search={{ genre: g.slug }} className="rounded-full bg-elevated px-3 py-1 text-xs text-muted">
                {g.name}
              </Link>
            ))}
            {data.tags.map((t) => (
              <span key={t.id} className="rounded-full px-3 py-1 text-xs text-subtle shadow-[var(--shadow-border)]">
                {t.name}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm tabular-nums text-subtle">
            {n.chapterCount} chapters · {formatCompact(n.views)} reads · {formatCompact(n.likes)} likes ·{" "}
            {n.ratingCount ? `${n.ratingAvg.toFixed(1)}★` : "Unrated"}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {first ? (
              <Link
                to="/novels/$id/chapter/$chapterId"
                params={{ id: n.id, chapterId: data.progress?.chapterId ?? first.id }}
                className="inline-flex h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-fg"
              >
                {data.progress ? `Continue · Ch ${data.progress.chapterNumber}` : "Start reading"}
              </Link>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => toggleLibrary({ data: { novelId: n.id } }).then(invalidate)}
            >
              {data.inLibrary ? "In library" : "Add to library"}
            </Button>
            <Button variant="ghost" onClick={() => toggleFollow({ data: { authorId: n.author.id } }).then(invalidate)}>
              {data.following ? "Following" : "Follow"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => toggleLike({ data: { novelId: n.id } }).then(invalidate)} aria-label="Like">
              <Heart className={data.liked ? "size-4 fill-current" : "size-4"} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => toggleBookmark({ data: { novelId: n.id } })} aria-label="Bookmark">
              <Bookmark className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Share"
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) navigator.share({ title: n.title, url }).catch(() => {});
                else navigator.clipboard.writeText(url);
              }}
            >
              <Share2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Report"
              onClick={() => submitReport({ data: { targetType: "novel", targetId: n.id, reason: "Inappropriate content" } })}
            >
              <Flag className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-4 border-b border-border text-sm">
        {(["chapters", "reviews", "comments"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={tab === t ? "border-b border-fg pb-2 capitalize" : "pb-2 text-muted capitalize"}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "chapters" ? (
        <ol className="mt-4 divide-y divide-border">
          {data.chapters.map((c) => (
            <li key={c.id}>
              <Link
                to="/novels/$id/chapter/$chapterId"
                params={{ id: n.id, chapterId: c.id }}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm">
                    <span className="mr-2 tabular-nums text-subtle">{c.chapterNumber}</span>
                    {c.title}
                  </p>
                  <p className="text-xs text-subtle">
                    {c.wordCount} words
                    {c.publishedAt ? ` · ${formatDate(c.publishedAt)}` : ""}
                  </p>
                </div>
                {c.isPremium && !c.unlocked ? (
                  <span className="rounded-full bg-elevated px-2 py-1 text-[11px] tabular-nums">{c.coinPrice} D-Coins</span>
                ) : c.isPremium ? (
                  <span className="text-[11px] text-muted">Unlocked</span>
                ) : (
                  <span className="text-[11px] text-muted">Free</span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      ) : null}

      {tab === "reviews" ? (
        <div className="mt-6 max-w-xl space-y-6">
          {user ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                submitReview({ data: { novelId: n.id, rating: stars, body: review } }).then(() => {
                  setReview("");
                  invalidate();
                });
              }}
            >
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setStars(s)} aria-label={`${s} stars`}>
                    <Star className={s <= stars ? "size-5 fill-current" : "size-5 text-subtle"} />
                  </button>
                ))}
              </div>
              <Textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="A considered note for other readers" />
              <Button type="submit" size="sm">
                Publish review
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted">
              <Link to="/login" className="underline">Sign in</Link> to review.
            </p>
          )}
          {data.reviews.map((r) => (
            <article key={r.id} className="border-t border-border pt-4">
              <p className="text-sm">
                {r.display_name} <span className="text-subtle">· {r.rating}★</span>
              </p>
              <p className="mt-1 text-sm text-muted">{r.body}</p>
            </article>
          ))}
        </div>
      ) : null}

      {tab === "comments" ? (
        <div className="mt-6 max-w-xl space-y-4">
          {user ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitComment({ data: { novelId: n.id, body: comment } }).then(() => {
                  setComment("");
                  invalidate();
                });
              }}
            >
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="A short remark" />
              <Button type="submit" size="sm" className="mt-2">
                Comment
              </Button>
            </form>
          ) : null}
          {data.comments.map((c) => (
            <article key={c.id} className="border-t border-border pt-3">
              <p className="text-sm">{c.display_name}</p>
              <p className="text-sm text-muted">{c.body}</p>
            </article>
          ))}
        </div>
      ) : null}

      {latest ? (
        <p className="mt-8 text-xs text-subtle">Latest chapter: {latest.title}</p>
      ) : null}
    </AppShell>
  );
}
