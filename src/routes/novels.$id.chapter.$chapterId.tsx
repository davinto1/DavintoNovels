import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, List, Settings2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { renderChapterHtml } from "@/lib/markdown";
import { getChapterPage, saveProgress } from "@/lib/server/reading";
import { unlockChapter } from "@/lib/server/wallet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/novels/$id/chapter/$chapterId")({ component: Reader });

type Theme = "dark" | "light" | "sepia";

function Reader() {
  const { id, chapterId } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["chapter", id, chapterId],
    queryFn: () => getChapterPage({ data: { novelId: id, chapterId } }),
  });
  const [theme, setTheme] = useState<Theme>("dark");
  const [size, setSize] = useState(18);
  const [width, setWidth] = useState(42);
  const [toc, setToc] = useState(false);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dn-reader");
      if (!raw) return;
      const s = JSON.parse(raw) as { theme?: Theme; size?: number; width?: number };
      if (s.theme) setTheme(s.theme);
      if (s.size) setSize(s.size);
      if (s.width) setWidth(s.width);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dn-reader", JSON.stringify({ theme, size, width }));
  }, [theme, size, width]);

  useEffect(() => {
    if (!q.data || q.data.error || !q.data.chapter.unlocked) return;
    saveProgress({ data: { novelId: q.data.novel.id, chapterId, position: 0 } }).catch(() => {});
  }, [q.data, chapterId]);

  const unlock = useMutation({
    mutationFn: () => unlockChapter({ data: { chapterId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chapter", id, chapterId] }),
  });

  if (q.isLoading) {
    return <div className="grid min-h-dvh place-items-center bg-bg text-muted">Setting the type…</div>;
  }
  const data = q.data;
  if (!data || data.error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <p className="text-muted">Chapter not found.</p>
      </div>
    );
  }

  const bg = theme === "light" ? "bg-paper text-sepia-fg" : theme === "sepia" ? "bg-sepia text-sepia-fg" : "bg-bg text-fg";
  const muted = theme === "dark" ? "text-muted" : "text-[#6b5e4e]";

  return (
    <div className={cn("min-h-dvh", bg)}>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 px-3 md:px-6">
        <Link to="/novels/$id" params={{ id: data.novel.id }} className={cn("grid size-11 place-items-center rounded-md", muted)} aria-label="Back">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs tracking-wide uppercase opacity-70">{data.novel.title}</p>
          <p className="truncate font-display text-sm">{data.chapter.title}</p>
        </div>
        <button type="button" className="grid size-11 place-items-center" onClick={() => setToc(true)} aria-label="Contents">
          <List className="size-5" />
        </button>
        <button type="button" className="grid size-11 place-items-center" onClick={() => setSettings(true)} aria-label="Reading settings">
          <Settings2 className="size-5" />
        </button>
      </header>

      <article
        className="mx-auto px-5 py-8 pb-28"
        style={{ maxWidth: `${width}rem`, fontSize: `${size}px`, lineHeight: 1.7, fontFamily: "var(--font-serif)" }}
      >
        <p className={cn("text-xs tracking-[0.18em] uppercase", muted)}>Chapter {data.chapter.chapterNumber}</p>
        <h1 className="mt-2 font-display text-[1.65em] leading-tight tracking-tight">{data.chapter.title}</h1>

        {!data.chapter.unlocked ? (
          <div className="mt-10 rounded-xl bg-elevated/40 p-6 shadow-[var(--shadow-border)]">
            <p className="text-xs tracking-[0.18em] uppercase opacity-70">Premium chapter</p>
            <h2 className="mt-2 font-display text-2xl">This chapter requires {data.chapter.coinPrice} Davinto Coins.</h2>
            <p className="mt-2 text-[0.95em] opacity-80">
              Unlock it once and keep it forever. Your balance is {data.balance.toLocaleString()} D-Coins.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {data.signedIn ? (
                <Button onClick={() => unlock.mutate()} disabled={unlock.isPending}>
                  {unlock.isPending ? "Unlocking…" : "Unlock chapter"}
                </Button>
              ) : (
                <Link to="/login" className="inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg">
                  Sign in to unlock
                </Link>
              )}
              <Link to="/wallet" className="inline-flex h-11 items-center rounded-md px-4 text-sm shadow-[var(--shadow-border)]">
                Buy Davinto Coins
              </Link>
            </div>
            {unlock.isError ? (
              <p className="mt-3 text-sm text-danger">{(unlock.error as Error).message}</p>
            ) : null}
          </div>
        ) : (
          <div className="chapter-body mt-8" dangerouslySetInnerHTML={{ __html: renderChapterHtml(data.chapter.body) }} />
        )}
      </article>

      <nav className="fixed inset-x-0 bottom-0 flex h-16 items-center justify-between border-t border-current/10 px-4 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {data.prev ? (
          <Link
            to="/novels/$id/chapter/$chapterId"
            params={{ id: data.novel.id, chapterId: data.prev.id }}
            className="inline-flex h-11 items-center gap-1 text-sm"
          >
            <ChevronLeft className="size-4" /> Previous
          </Link>
        ) : (
          <span />
        )}
        {data.next ? (
          <Link
            to="/novels/$id/chapter/$chapterId"
            params={{ id: data.novel.id, chapterId: data.next.id }}
            className="inline-flex h-11 items-center gap-1 text-sm"
          >
            Next <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className="text-sm opacity-60">End of available chapters</span>
        )}
      </nav>

      {toc ? (
        <div className="fixed inset-0 z-40 bg-bg/80" onClick={() => setToc(false)}>
          <aside
            className="absolute top-0 right-0 h-full w-[min(100%,360px)] overflow-y-auto bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg">Contents</h2>
              <button type="button" className="grid size-10 place-items-center" onClick={() => setToc(false)}>
                <X className="size-4" />
              </button>
            </div>
            <ol>
              {data.toc.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/novels/$id/chapter/$chapterId"
                    params={{ id: data.novel.id, chapterId: c.id }}
                    className={cn("block py-2 text-sm", c.id === chapterId ? "text-fg" : "text-muted")}
                    onClick={() => setToc(false)}
                  >
                    {c.chapter_number}. {c.title}
                    {c.is_premium ? <span className="ml-2 text-[10px] uppercase">Premium</span> : null}
                  </Link>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      ) : null}

      {settings ? (
        <div className="fixed inset-0 z-40 grid place-items-end bg-bg/60 p-4" onClick={() => setSettings(false)}>
          <div className="w-full max-w-md rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg">Reading room</h2>
            <p className="mt-4 text-xs tracking-wide text-muted uppercase">Theme</p>
            <div className="mt-2 flex gap-2">
              {(["dark", "light", "sepia"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={cn("h-10 flex-1 rounded-md capitalize", theme === t ? "bg-accent text-accent-fg" : "bg-elevated")}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs tracking-wide text-muted uppercase">Type size</p>
            <input type="range" min={16} max={24} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-2 w-full" />
            <p className="mt-4 text-xs tracking-wide text-muted uppercase">Measure</p>
            <input type="range" min={32} max={48} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="mt-2 w-full" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
