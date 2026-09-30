import { coverPalette } from "@/lib/covers";
import { cn } from "@/lib/utils";

export function CoverArt({
  title,
  author,
  palette,
  url,
  className,
}: {
  title: string;
  author?: string;
  palette: string;
  url?: string | null;
  className?: string;
}) {
  const p = coverPalette(palette);
  if (url) {
    return (
      <img
        src={url}
        alt={title}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn("relative flex h-full w-full flex-col justify-end overflow-hidden p-4", className)}
      style={{
        background: `linear-gradient(165deg, ${p.from} 0%, ${p.to} 100%)`,
        color: p.fg,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-12deg, transparent, transparent 18px, currentColor 18px, currentColor 19px)",
        }}
      />
      <div
        className="mb-auto h-px w-10"
        style={{ background: p.accent }}
        aria-hidden
      />
      <p className="font-display text-[1.05rem] leading-snug tracking-tight text-balance">{title}</p>
      {author ? (
        <p className="mt-2 text-[11px] tracking-[0.14em] uppercase opacity-70">{author}</p>
      ) : null}
    </div>
  );
}
