import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { becomeAuthor, getMe } from "@/lib/server/me";

export const Route = createFileRoute("/write")({ component: WritePage });

function WritePage() {
  const { user, isPending } = useCurrentUserState();
  const nav = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe(), enabled: !!user });
  const go = useMutation({
    mutationFn: () => becomeAuthor(),
    onSuccess: () => nav({ to: "/author/dashboard" }),
  });
  if (isPending) return <AppShell><div className="h-40 animate-pulse rounded-xl bg-surface" /></AppShell>;
  if (!user) return <RedirectToSignIn />;
  if (me.data?.profile.isAuthor) return <Navigate to="/author/dashboard" />;
  return (
    <AppShell>
      <p className="text-xs tracking-[0.2em] text-muted uppercase">The writing desk</p>
      <h1 className="mt-2 max-w-xl font-display text-4xl tracking-tight">Have a story to tell?</h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
        Publish on DavintoNovels, mark chapters free or premium, and earn Davinto Coins when readers unlock your work.
        Revenue share is set by the house — currently visible in your author dashboard.
      </p>
      <Button className="mt-8" onClick={() => go.mutate()} disabled={go.isPending}>
        {go.isPending ? "Opening desk…" : "Become an author"}
      </Button>
      <p className="mt-6 text-xs text-subtle">
        Already writing?{" "}
        <Link to="/author/dashboard" className="underline">
          Go to dashboard
        </Link>
      </p>
    </AppShell>
  );
}
