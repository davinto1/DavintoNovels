import { Link } from "@tanstack/react-router";
import { CoverArt } from "@/components/cover-art";
import { formatCompact } from "@/lib/format";
import type { NovelCard as NovelCardT } from "@/lib/types";

export function NovelCard({ novel, large }: { novel: NovelCardT; large?: boolean }) {
  return (
    <Link
      to="/novels/$id"
      params={{ id: novel.id }}
      className="group block min-w-0"
    >
      <div
        className={
          large
            ? "aspect-[3/4] overflow-hidden rounded-[22px] shadow-[var(--shadow-border)] transition-transform duration-250 group-hover:-translate-y-0.5"
            : "aspect-[3/4] overflow-hidden rounded-[18px] shadow-[var(--shadow-border)] transition-transform duration-250 group-hover:-translate-y-0.5"
        }
      >
        <CoverArt title={novel.title} author={novel.author.displayName} palette={novel.coverPalette} url={novel.coverUrl} />
      </div>
      <div className="mt-3 min-w-0">
        <h3 className="truncate font-display text-[15px] leading-snug tracking-tight">{novel.title}</h3>
        <p className="mt-0.5 truncate text-xs text-muted">{novel.author.displayName}</p>
        <p className="mt-1 text-[11px] tabular-nums text-subtle">
          {formatCompact(novel.views)} reads · {novel.chapterCount} ch
        </p>
      </div>
    </Link>
  );
}

export function NovelRow({ novel }: { novel: NovelCardT }) {
  return (
    <Link to="/novels/$id" params={{ id: novel.id }} className="flex gap-3 py-2">
      <div className="h-[88px] w-[64px] shrink-0 overflow-hidden rounded-md shadow-[var(--shadow-border)]">
        <CoverArt title={novel.title} palette={novel.coverPalette} url={novel.coverUrl} />
      </div>
      <div className="min-w-0">
        <h3 className="truncate font-display text-[15px]">{novel.title}</h3>
        <p className="text-xs text-muted">{novel.author.displayName}</p>
        <p className="mt-1 line-clamp-2 text-xs text-subtle">{novel.synopsis}</p>
      </div>
    </Link>
  );
}
