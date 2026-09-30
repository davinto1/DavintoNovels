import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe, updateMyProfile } from "@/lib/server/me";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, isPending } = useCurrentUserState();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe(), enabled: !!user });
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => {
    if (!me.data) return;
    setName(me.data.profile.displayName);
    setUsername(me.data.profile.username);
    setBio(me.data.profile.bio);
  }, [me.data]);
  const save = useMutation({
    mutationFn: () => updateMyProfile({ data: { displayName: name, username, bio } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
  if (isPending) return <AppShell><div className="h-40 animate-pulse rounded-xl bg-surface" /></AppShell>;
  if (!user) return <RedirectToSignIn />;
  return (
    <AppShell>
      <h1 className="font-display text-3xl tracking-tight">Settings</h1>
      <form
        className="mt-8 max-w-md space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div>
          <Label>Display name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        {save.isError ? <p className="text-sm text-danger">{(save.error as Error).message}</p> : null}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </form>
    </AppShell>
  );
}
