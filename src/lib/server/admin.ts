import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { Role } from "@/lib/types";
import { audit, getSettings, requireRole, setSetting } from "./helpers";
import { ensureSeeded } from "./seed";

const STAFF: Role[] = ["moderator", "admin", "super_admin"];
const ADMINS: Role[] = ["admin", "super_admin"];

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeeded();
    await requireRole(context.userId, STAFF);
    const sql = await getSql();
    const n = async (q: string) => {
      const r = await sql.query<{ c: number }>(q);
      return r[0]?.c ?? 0;
    };
    const users = await n(`select count(*)::int as c from profiles where is_system = false`);
    const authors = await n(`select count(*)::int as c from profiles where is_author = true`);
    const novels = await n(`select count(*)::int as c from novels`);
    const chapters = await n(`select count(*)::int as c from chapters`);
    const freeCh = await n(`select count(*)::int as c from chapters where is_premium = false`);
    const premCh = await n(`select count(*)::int as c from chapters where is_premium = true`);
    const coinsPurchased = await n(
      `select coalesce(sum(coins),0)::int as c from payments where status = 'successful'`,
    );
    const purchases = await n(`select count(*)::int as c from payments where status = 'successful'`);
    const unlocks = await n(`select count(*)::int as c from chapter_purchases`);
    const platformRev = await n(`select coalesce(sum(platform_share),0)::int as c from chapter_purchases`);
    const authorEarn = await n(`select coalesce(sum(author_share),0)::int as c from chapter_purchases`);
    const pendingWd = await n(`select coalesce(sum(amount),0)::int as c from withdrawals where status = 'pending'`);
    const paidWd = await n(`select coalesce(sum(amount),0)::int as c from withdrawals where status = 'paid'`);
    const failedPay = await n(`select count(*)::int as c from payments where status = 'failed'`);
    return {
      users,
      authors,
      novels,
      chapters,
      freeCh,
      premCh,
      coinsPurchased,
      purchases,
      unlocks,
      platformRev,
      authorEarn,
      pendingWd,
      paidWd,
      failedPay,
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, STAFF);
    const sql = await getSql();
    return sql<{
      user_id: string;
      username: string;
      display_name: string;
      role: Role;
      is_author: boolean;
      is_suspended: boolean;
      is_system: boolean;
      balance: number;
    }>`
      select p.user_id, p.username, p.display_name, p.role, p.is_author, p.is_suspended, p.is_system,
             coalesce(w.balance, 0)::int as balance
      from profiles p
      left join wallets w on w.user_id = p.user_id
      order by p.created_at desc
      limit 200
    `;
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string; role: Role; suspended?: boolean }) => d)
  .handler(async ({ context, data }) => {
    const admin = await requireRole(context.userId, ADMINS);
    if (data.role === "super_admin" && admin.role !== "super_admin") {
      throw new Error("Only a super admin can grant that role");
    }
    const sql = await getSql();
    await sql`
      update profiles set
        role = ${data.role},
        is_author = ${data.role !== "reader"},
        is_suspended = coalesce(${data.suspended ?? null}, is_suspended),
        updated_at = now()
      where user_id = ${data.userId}
    `;
    await audit(context.userId, "set_role", "user", data.userId, `${data.role} suspended=${data.suspended ?? ""}`);
    return { ok: true };
  });

export const adminAdjustWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string; amount: number; reason: string }) => d)
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ADMINS);
    const amount = Math.floor(data.amount);
    if (!amount) throw new Error("Amount required");
    const sql = await getSql();
    const updated = await sql<{ balance: number }>`
      update wallets
      set balance = balance + ${amount}, updated_at = now()
      where user_id = ${data.userId} and balance + ${amount} >= 0
      returning balance
    `;
    if (!updated[0]) throw new Error("Adjustment failed");
    const { makeId } = await import("@/lib/ids");
    await sql`
      insert into wallet_transactions (id, user_id, amount, balance_after, kind, description)
      values (${makeId("tx")}, ${data.userId}, ${amount}, ${updated[0].balance}, 'adjustment', ${data.reason.slice(0, 200)})
    `;
    await audit(context.userId, "wallet_adjust", "user", data.userId, `${amount} ${data.reason}`);
    return { ok: true, balance: updated[0].balance };
  });

export const adminListNovels = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, STAFF);
    const sql = await getSql();
    return sql<{
      id: string;
      title: string;
      status: string;
      featured: boolean;
      views: number;
      author: string;
    }>`
      select n.id, n.title, n.status, n.featured, n.views, p.display_name as author
      from novels n join profiles p on p.user_id = n.author_id
      order by n.updated_at desc limit 200
    `;
  });

export const adminUpdateNovel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; status?: string; featured?: boolean }) => d)
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, STAFF);
    const sql = await getSql();
    await sql`
      update novels set
        status = coalesce(${data.status ?? null}, status),
        featured = coalesce(${data.featured ?? null}, featured),
        updated_at = now()
      where id = ${data.id}
    `;
    await audit(context.userId, "novel_update", "novel", data.id, JSON.stringify(data));
    return { ok: true };
  });

export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, ADMINS);
    const sql = await getSql();
    return sql<{
      id: string;
      user_id: string;
      username: string;
      provider: string;
      amount_kobo: number;
      coins: number;
      status: string;
      provider_reference: string | null;
      verified: boolean;
      created_at: string;
    }>`
      select p.id, p.user_id, pr.username, p.provider, p.amount_kobo, p.coins, p.status,
             p.provider_reference, p.verified, p.created_at
      from payments p join profiles pr on pr.user_id = p.user_id
      order by p.created_at desc limit 200
    `;
  });

export const adminFailPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; note: string }) => d)
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ADMINS);
    const sql = await getSql();
    await sql`
      update payments set status = 'failed', updated_at = now()
      where id = ${data.id} and status = 'pending'
    `;
    await audit(context.userId, "payment_fail", "payment", data.id, data.note);
    return { ok: true };
  });

export const adminListPackages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, ADMINS);
    const sql = await getSql();
    return sql<{
      id: string;
      name: string;
      price_kobo: number;
      coins: number;
      bonus_coins: number;
      active: boolean;
      sort_order: number;
    }>`select id, name, price_kobo, coins, bonus_coins, active, sort_order from coin_packages order by sort_order`;
  });

export const adminSavePackage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    id?: string;
    name: string;
    priceKobo: number;
    coins: number;
    bonusCoins: number;
    active: boolean;
    sortOrder: number;
  }) => d)
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ADMINS);
    const sql = await getSql();
    const { makeId } = await import("@/lib/ids");
    const id = data.id || makeId("pkg");
    await sql`
      insert into coin_packages (id, name, price_kobo, coins, bonus_coins, active, sort_order)
      values (${id}, ${data.name}, ${data.priceKobo}, ${data.coins}, ${data.bonusCoins}, ${data.active}, ${data.sortOrder})
      on conflict (id) do update set
        name = excluded.name,
        price_kobo = excluded.price_kobo,
        coins = excluded.coins,
        bonus_coins = excluded.bonus_coins,
        active = excluded.active,
        sort_order = excluded.sort_order
    `;
    await audit(context.userId, "package_save", "coin_package", id, data.name);
    return { id };
  });

export const adminListWithdrawals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, ADMINS);
    const sql = await getSql();
    return sql<{
      id: string;
      author_id: string;
      author: string;
      amount: number;
      status: string;
      bank_name: string;
      account_name: string;
      account_number_last4: string;
      payout_reference: string | null;
      admin_notes: string;
      created_at: string;
    }>`
      select w.id, w.author_id, p.display_name as author, w.amount, w.status, w.bank_name,
             w.account_name, w.account_number_last4, w.payout_reference, w.admin_notes, w.created_at
      from withdrawals w join profiles p on p.user_id = w.author_id
      order by w.created_at desc
    `;
  });

export const adminReviewWithdrawal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    id: string;
    status: "approved" | "rejected" | "paid";
    payoutReference?: string;
    notes?: string;
  }) => d)
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ADMINS);
    const sql = await getSql();
    const row = await sql<{ author_id: string; amount: number; status: string }>`
      select author_id, amount, status from withdrawals where id = ${data.id}
    `;
    if (!row[0]) throw new Error("Not found");
    if (data.status === "rejected" && row[0].status === "pending") {
      await sql`
        update author_balances
        set pending = greatest(pending - ${row[0].amount}, 0),
            available = available + ${row[0].amount},
            updated_at = now()
        where author_id = ${row[0].author_id}
      `;
    }
    if (data.status === "paid" && (row[0].status === "pending" || row[0].status === "approved")) {
      await sql`
        update author_balances
        set pending = greatest(pending - ${row[0].amount}, 0),
            withdrawn = withdrawn + ${row[0].amount},
            updated_at = now()
        where author_id = ${row[0].author_id}
      `;
    }
    await sql`
      update withdrawals set
        status = ${data.status},
        payout_reference = coalesce(${data.payoutReference ?? null}, payout_reference),
        admin_notes = coalesce(${data.notes ?? null}, admin_notes),
        reviewed_by = ${context.userId},
        reviewed_at = now()
      where id = ${data.id}
    `;
    const { notify } = await import("./helpers");
    await notify(
      row[0].author_id,
      "withdrawal",
      "Withdrawal update",
      `Your withdrawal is now ${data.status}.`,
      "/author/dashboard",
    );
    await audit(context.userId, "withdrawal_review", "withdrawal", data.id, data.status);
    return { ok: true };
  });

export const adminListReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, STAFF);
    const sql = await getSql();
    return sql<{
      id: string;
      target_type: string;
      target_id: string;
      reason: string;
      details: string;
      status: string;
      created_at: string;
      reporter: string;
    }>`
      select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at,
             p.display_name as reporter
      from reports r join profiles p on p.user_id = r.reporter_id
      order by r.created_at desc limit 200
    `;
  });

export const adminHandleReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    id: string;
    action: "dismiss" | "hide" | "warn" | "suspend";
    notes?: string;
  }) => d)
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, STAFF);
    const sql = await getSql();
    const r = await sql<{ target_type: string; target_id: string }>`
      select target_type, target_id from reports where id = ${data.id}
    `;
    if (!r[0]) throw new Error("Not found");
    if (data.action === "hide") {
      if (r[0].target_type === "novel") {
        await sql`update novels set status = 'hidden' where id = ${r[0].target_id}`;
      }
      if (r[0].target_type === "comment") {
        await sql`update comments set hidden = true where id = ${r[0].target_id}`;
      }
      if (r[0].target_type === "review") {
        await sql`update reviews set hidden = true where id = ${r[0].target_id}`;
      }
      if (r[0].target_type === "chapter") {
        await sql`update chapters set status = 'draft' where id = ${r[0].target_id}`;
      }
    }
    if (data.action === "warn" || data.action === "suspend") {
      let uid = r[0].target_id;
      if (r[0].target_type !== "user") {
        // best-effort: no-op if not a user target
        uid = r[0].target_id;
      }
      if (r[0].target_type === "user") {
        await sql`
          update profiles set
            warning_count = warning_count + 1,
            is_suspended = ${data.action === "suspend"},
            updated_at = now()
          where user_id = ${uid}
        `;
      }
    }
    await sql`
      update reports set
        status = ${data.action === "dismiss" ? "dismissed" : "actioned"},
        admin_notes = ${data.notes ?? ""},
        reviewed_by = ${context.userId},
        reviewed_at = now()
      where id = ${data.id}
    `;
    await audit(context.userId, "report", "report", data.id, data.action);
    return { ok: true };
  });

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const me = await requireRole(context.userId, ADMINS);
    const settings = await getSettings();
    const { getPaymentConfig, maskAccount } = await import("@/lib/payments/config.server");
    const pay = getPaymentConfig();
    const sql = await getSql();
    const genres = await sql<{ id: string; name: string; slug: string; description: string }>`
      select id, name, slug, description from genres order by sort_order
    `;
    return {
      settings,
      genres,
      payment: {
        provider: pay.provider,
        configured: pay.configured,
        publicKey: pay.publicKey,
        settlementBank: pay.settlement.bank,
        settlementName: me.role === "super_admin" ? pay.settlement.accountName : "Hidden",
        settlementMasked: maskAccount(pay.settlement.accountNumber),
      },
    };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: Record<string, string>) => d)
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ADMINS);
    const allowed = new Set([
      "platform_name",
      "coin_name",
      "coin_symbol",
      "author_revenue_percent",
      "min_withdrawal_coins",
      "welcome_bonus_coins",
      "default_chapter_price",
      "payment_provider",
      "hero_kicker",
      "hero_title",
      "hero_body",
      "announcement",
      "writers_cta",
    ]);
    for (const [k, v] of Object.entries(data)) {
      if (allowed.has(k)) await setSetting(k, String(v));
    }
    await audit(context.userId, "settings", "site", "settings", Object.keys(data).join(","));
    return { ok: true };
  });

export const adminAddGenre = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; description?: string }) => d)
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, ADMINS);
    const { makeId } = await import("@/lib/ids");
    const { slugify } = await import("@/lib/utils");
    const sql = await getSql();
    const id = makeId("g");
    await sql`
      insert into genres (id, name, slug, description, sort_order)
      values (${id}, ${data.name.trim()}, ${slugify(data.name)}, ${data.description ?? ""}, 50)
      on conflict (slug) do nothing
    `;
    return { ok: true };
  });

export const adminListAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, ADMINS);
    const sql = await getSql();
    return sql<{
      id: string;
      admin_id: string;
      action: string;
      target_type: string;
      target_id: string;
      details: string;
      created_at: string;
    }>`
      select id, admin_id, action, target_type, target_id, details, created_at
      from admin_audit_logs order by created_at desc limit 80
    `;
  });
