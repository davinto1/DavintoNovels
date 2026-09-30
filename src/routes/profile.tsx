import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMyNotifications, getMe, markNotificationsRead } from "@/lib/server/me";
import { initials } from "@/lib/utils";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, isPending } = useCurrentUserState();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe(), enabled: !!user });
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => listMyNotifications(), enabled: !!user });
  if (isPending) return <AppShell><div className="h-40 animate-pulse rounded-xl bg-surface" /></AppShell>;
  if (!user) return <RedirectToSignIn />;
  const p = me.data?.profile;
  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="grid size-14 place-items-center rounded-full bg-elevated font-display">
            {initials(p?.displayName || user.displayName || "R")}
          </div>
          <div>
            <h1 className="font-display text-2xl">{p?.displayName ?? user.displayName}</h1>
            <p className="text-sm text-muted">@{p?.username} · {p?.role}</p>
          </div>
        </div>
        <UserButton />
      </div>
      <p className="mt-4 max-w-xl text-sm text-muted">{p?.bio || "No bio yet."}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link to="/wallet" className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs text-muted">Balance</p>
          <p className="mt-1 font-display text-xl tabular-nums">{(me.data?.balance ?? 0).toLocaleString()}</p>
        </Link>
        <Link to="/library" className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs text-muted">Library</p>
          <p className="mt-1 text-sm">Continue reading</p>
        </Link>
        <Link to="/settings" className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs text-muted">Account</p>
          <p className="mt-1 text-sm">Settings</p>
        </Link>
        <Link to="/write" className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs text-muted">Desk</p>
          <p className="mt-1 text-sm">Write</p>
        </Link>
      </div>
      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-xl">Notifications</h2>
        <button type="button" className="text-xs text-muted" onClick={() => markNotificationsRead().then(() => notes.refetch())}>
          Mark read
        </button>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {(notes.data ?? []).map((n) => (
          <li key={n.id} className="py-3">
            <p className="text-sm">{n.title}</p>
            <p className="text-xs text-muted">{n.body}</p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
