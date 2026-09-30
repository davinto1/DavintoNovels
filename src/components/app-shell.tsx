import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Compass, Home, PenLine, Search, UserRound, Wallet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getOptionalMe } from "@/lib/server/me";
import { searchSuggest } from "@/lib/server/catalog";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function AppShell({ children, bleed }: { children: ReactNode; bleed?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hideChrome = path.includes("/chapter/");
  if (hideChrome) return <>{children}</>;
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <DesktopNav />
      <main className={cn(bleed ? "" : "mx-auto w-full max-w-6xl px-4 pb-24 pt-4 md:pb-12 md:pt-6")}>{children}</main>
      <MobileNav path={path} />
    </div>
  );
}

function DesktopNav() {
  const [q, setQ] = useState("");
  const [sug, setSug] = useState<{ novels: { id: string; title: string }[]; authors: { id: string; name: string }[] }>({
    novels: [],
    authors: [],
  });
  useEffect(() => {
    if (q.trim().length < 2) {
      setSug({ novels: [], authors: [] });
      return;
    }
    const t = setTimeout(() => {
      searchSuggest({ data: { q } })
        .then(setSug)
        .catch(() => setSug({ novels: [], authors: [] }));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-bg/90 backdrop-blur-md md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="font-display text-lg tracking-tight">
          DavintoNovels
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link to="/" className="hover:text-fg">
            Home
          </Link>
          <Link to="/discover" className="hover:text-fg">
            Discover
          </Link>
          <Link to="/rankings" className="hover:text-fg">
            Rankings
          </Link>
          <Link to="/write" className="hover:text-fg">
            Write
          </Link>
          <Link to="/library" className="hover:text-fg">
            Library
          </Link>
        </nav>
        <div className="relative ml-auto w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles, authors"
            className="h-10 w-full rounded-md bg-elevated pr-3 pl-9 text-sm outline-none shadow-[var(--shadow-border)] placeholder:text-subtle"
          />
          {(sug.novels.length || sug.authors.length) && q.length >= 2 ? (
            <div className="absolute top-[calc(100%+6px)] right-0 left-0 overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-border)]">
              {sug.novels.map((n) => (
                <Link
                  key={n.id}
                  to="/novels/$id"
                  params={{ id: n.id }}
                  className="block px-3 py-2 text-sm hover:bg-elevated"
                  onClick={() => setQ("")}
                >
                  {n.title}
                </Link>
              ))}
              {sug.authors.map((a) => (
                <Link
                  key={a.id}
                  to="/authors/$id"
                  params={{ id: a.id }}
                  className="block px-3 py-2 text-sm text-muted hover:bg-elevated"
                  onClick={() => setQ("")}
                >
                  {a.name}
                </Link>
              ))}
              <Link
                to="/discover"
                search={{ q }}
                className="block border-t border-border px-3 py-2 text-xs text-muted"
                onClick={() => setQ("")}
              >
                View all results
              </Link>
            </div>
          ) : null}
        </div>
        <AuthCluster />
      </div>
    </header>
  );
}

function AuthCluster() {
  const { user, isPending } = useCurrentUserState();
  const [me, setMe] = useState<{ profile: Profile; balance: number; unread: number } | null>(null);
  useEffect(() => {
    if (!user) {
      setMe(null);
      return;
    }
    getOptionalMe()
      .then(setMe)
      .catch(() => setMe(null));
  }, [user]);

  if (isPending) return <div className="size-9 animate-pulse rounded-full bg-elevated" />;
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/wallet"
        className="hidden h-10 items-center rounded-md bg-elevated px-3 text-sm tabular-nums shadow-[var(--shadow-border)] lg:inline-flex"
      >
        <Wallet className="mr-2 size-3.5" />
        {me ? me.balance.toLocaleString() : "—"}
      </Link>
      <SignedOut>
        <Link to="/login" className="h-10 rounded-md bg-accent px-4 text-sm leading-10 font-medium text-accent-fg">
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        {me?.profile.role === "admin" || me?.profile.role === "super_admin" || me?.profile.role === "moderator" ? (
          <Link to="/admin" className="text-xs text-muted hover:text-fg">
            Admin
          </Link>
        ) : null}
        <UserButton />
      </SignedIn>
    </div>
  );
}

function MobileNav({ path }: { path: string }) {
  const items = [
    { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    { to: "/discover", label: "Discover", icon: Compass, match: (p: string) => p.startsWith("/discover") || p.startsWith("/rankings") },
    { to: "/library", label: "Library", icon: BookOpen, match: (p: string) => p.startsWith("/library") },
    { to: "/write", label: "Write", icon: PenLine, match: (p: string) => p.startsWith("/write") || p.startsWith("/author") },
    { to: "/profile", label: "Profile", icon: UserRound, match: (p: string) => p.startsWith("/profile") || p.startsWith("/wallet") || p.startsWith("/settings") },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.match(path);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
                  active ? "text-fg" : "text-muted",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Section({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        {href ? (
          <Link to={href} className="text-sm text-muted hover:text-fg">
            See all
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}
