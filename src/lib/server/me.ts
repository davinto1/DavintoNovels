import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureProfile, getSettings } from "./helpers";
import { ensureSeeded } from "./seed";

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeeded();
    const sql = await getSql();
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    const profile = await ensureProfile({
      userId: context.userId,
      displayName: user?.email ?? null,
      email: user?.email ?? null,
      avatarUrl: null,
    });
    const wallet = await sql<{ balance: number }>`select balance from wallets where user_id = ${context.userId}`;
    const unread = await sql<{ c: number }>`
      select count(*)::int as c from notifications where user_id = ${context.userId} and read = false
    `;
    const settings = await getSettings();
    return {
      profile,
      balance: wallet[0]?.balance ?? 0,
      unread: unread[0]?.c ?? 0,
      settings,
    };
  });

export const getOptionalMe = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeeded();
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const user = await getSessionUser();
  if (!user) return null;
  const sql = await getSql();
  const profile = await ensureProfile({
    userId: user.id,
    displayName: user.email,
    email: user.email,
    avatarUrl: null,
  });
  const wallet = await sql<{ balance: number }>`select balance from wallets where user_id = ${user.id}`;
  const unread = await sql<{ c: number }>`
    select count(*)::int as c from notifications where user_id = ${user.id} and read = false
  `;
  return { profile, balance: wallet[0]?.balance ?? 0, unread: unread[0]?.c ?? 0 };
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { displayName?: string; bio?: string; username?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile({ userId: context.userId, displayName: data.displayName ?? null, email: null, avatarUrl: null });
    if (data.username) {
      const taken = await sql`
        select 1 from profiles where username = ${data.username} and user_id <> ${context.userId}
      `;
      if (taken.length) throw new Error("Username is taken");
    }
    await sql`
      update profiles set
        display_name = coalesce(${data.displayName ?? null}, display_name),
        bio = coalesce(${data.bio ?? null}, bio),
        username = coalesce(${data.username ?? null}, username),
        updated_at = now()
      where user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const becomeAuthor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfile({ userId: context.userId, displayName: null, email: null, avatarUrl: null });
    await sql`
      update profiles
      set is_author = true,
          role = case when role = 'reader' then 'author' else role end,
          updated_at = now()
      where user_id = ${context.userId}
    `;
    await sql`
      insert into author_balances (author_id) values (${context.userId})
      on conflict (author_id) do nothing
    `;
    return { ok: true };
  });

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      id: string;
      kind: string;
      title: string;
      body: string;
      href: string | null;
      read: boolean;
      created_at: string;
    }>`
      select id, kind, title, body, href, read, created_at
      from notifications where user_id = ${context.userId}
      order by created_at desc limit 40
    `;
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`update notifications set read = true where user_id = ${context.userId}`;
    return { ok: true };
  });
