import { getSql } from "@/lib/db";
import { makeId } from "@/lib/ids";
import type { Profile, Role, SiteSettings } from "@/lib/types";
import { slugify } from "@/lib/utils";

export async function getSettings(): Promise<SiteSettings> {
  const sql = await getSql();
  const rows = await sql<{ key: string; value: string }>`select key, value from site_settings`;
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    platformName: m.platform_name ?? "DavintoNovels",
    coinName: m.coin_name ?? "Davinto Coins",
    coinSymbol: m.coin_symbol ?? "D-Coins",
    authorRevenuePercent: Number(m.author_revenue_percent ?? 70),
    minWithdrawalCoins: Number(m.min_withdrawal_coins ?? 5000),
    welcomeBonusCoins: Number(m.welcome_bonus_coins ?? 150),
    defaultChapterPrice: Number(m.default_chapter_price ?? 20),
    paymentProvider: m.payment_provider ?? "paystack",
    heroKicker: m.hero_kicker ?? "A house for stories",
    heroTitle: m.hero_title ?? "Read. Write. Earn.",
    heroBody:
      m.hero_body ??
      "DavintoNovels is a publishing house in your pocket.",
    announcement: m.announcement ?? "",
    writersCta: m.writers_cta ?? "Have a story to tell? Start writing on DavintoNovels.",
  };
}

export async function setSetting(key: string, value: string) {
  const sql = await getSql();
  await sql`
    insert into site_settings (key, value, updated_at)
    values (${key}, ${value}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  role: Role;
  is_author: boolean;
  is_suspended: boolean;
  followers_count: number;
  following_count: number;
};

export function mapProfile(r: ProfileRow): Profile {
  return {
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    bio: r.bio,
    avatarUrl: r.avatar_url,
    role: r.role,
    isAuthor: r.is_author,
    isSuspended: r.is_suspended,
    followersCount: r.followers_count,
    followingCount: r.following_count,
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const sql = await getSql();
  const rows = await sql<ProfileRow>`
    select user_id, username, display_name, bio, avatar_url, role, is_author,
           is_suspended, followers_count, following_count
    from profiles where user_id = ${userId}
  `;
  return rows[0] ? mapProfile(rows[0]) : null;
}

export async function ensureProfile(input: {
  userId: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}): Promise<Profile> {
  const sql = await getSql();
  const existing = await getProfile(input.userId);
  if (existing) {
    if (input.avatarUrl && !existing.avatarUrl) {
      await sql`update profiles set avatar_url = ${input.avatarUrl}, updated_at = now() where user_id = ${input.userId}`;
    }
    return (await getProfile(input.userId))!;
  }

  const base =
    slugify(input.displayName || input.email?.split("@")[0] || "reader") || "reader";
  let username = base;
  for (let i = 0; i < 8; i++) {
    const taken = await sql`select 1 from profiles where username = ${username} limit 1`;
    if (!taken.length) break;
    username = `${base}${Math.floor(Math.random() * 900 + 100)}`;
  }

  const admins = await sql`select 1 from profiles where role in ('admin','super_admin') and is_system = false limit 1`;
  const role: Role = admins.length ? "reader" : "super_admin";

  const display = input.displayName?.trim() || username;
  await sql`
    insert into profiles (user_id, username, display_name, avatar_url, role, is_author)
    values (${input.userId}, ${username}, ${display}, ${input.avatarUrl}, ${role}, ${role !== "reader"})
    on conflict (user_id) do nothing
  `;

  const settings = await getSettings();
  const bonus = settings.welcomeBonusCoins;
  await sql`
    insert into wallets (user_id, balance, lifetime_purchased)
    values (${input.userId}, ${bonus}, 0)
    on conflict (user_id) do nothing
  `;
  if (bonus > 0) {
    const already = await sql`
      select 1 from wallet_transactions
      where user_id = ${input.userId} and kind = 'bonus' and description = 'Welcome bonus'
      limit 1
    `;
    if (!already.length) {
      const w = await sql<{ balance: number }>`select balance from wallets where user_id = ${input.userId}`;
      await sql`
        insert into wallet_transactions (id, user_id, amount, balance_after, kind, description)
        values (${makeId("tx")}, ${input.userId}, ${bonus}, ${w[0]?.balance ?? bonus}, 'bonus', 'Welcome bonus')
      `;
      await sql`
        insert into notifications (id, user_id, kind, title, body, href)
        values (
          ${makeId("nt")}, ${input.userId}, 'bonus',
          'Welcome to DavintoNovels',
          ${`Your wallet now holds ${bonus} Davinto Coins. Use them to unlock premium chapters.`},
          '/wallet'
        )
      `;
    }
  }

  return (await getProfile(input.userId))!;
}

export async function notify(
  userId: string,
  kind: string,
  title: string,
  body: string,
  href?: string,
) {
  const sql = await getSql();
  await sql`
    insert into notifications (id, user_id, kind, title, body, href)
    values (${makeId("nt")}, ${userId}, ${kind}, ${title}, ${body}, ${href ?? null})
  `;
}

export async function audit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details = "",
) {
  const sql = await getSql();
  await sql`
    insert into admin_audit_logs (id, admin_id, action, target_type, target_id, details)
    values (${makeId("log")}, ${adminId}, ${action}, ${targetType}, ${targetId}, ${details})
  `;
}

export function isAdminRole(role: Role) {
  return role === "moderator" || role === "admin" || role === "super_admin";
}

export function isFullAdmin(role: Role) {
  return role === "admin" || role === "super_admin";
}

export async function requireRole(userId: string, allowed: Role[]) {
  const profile = await getProfile(userId);
  if (!profile || profile.isSuspended) {
    throw new Error("Forbidden");
  }
  if (!allowed.includes(profile.role)) {
    throw new Error("Forbidden");
  }
  return profile;
}
