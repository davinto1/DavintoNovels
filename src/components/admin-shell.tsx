import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/server/me";
import { useQuery } from "@tanstack/react-query";

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/novels", "Novels"],
  ["/admin/payments", "Payments"],
  ["/admin/coins", "Coins"],
  ["/admin/withdrawals", "Withdrawals"],
  ["/admin/reports", "Reports"],
  ["/admin/settings", "Settings"],
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe(), enabled: !!user });
  if (isPending) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-surface" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  const role = me.data?.profile.role;
  if (me.data && role !== "admin" && role !== "super_admin" && role !== "moderator") {
    return (
      <AppShell>
        <p className="text-muted">This desk is reserved for house staff.</p>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <p className="text-xs tracking-[0.2em] text-muted uppercase">House office</p>
      <nav className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {LINKS.map(([href, label]) => (
          <Link key={href} to={href} className="shrink-0 rounded-full bg-elevated px-3 py-1.5 text-xs text-muted shadow-[var(--shadow-border)]">
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </AppShell>
  );
}
