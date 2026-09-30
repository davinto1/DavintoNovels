import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { makeId, txId } from "@/lib/ids";
import { ensureProfile, getSettings, notify } from "./helpers";
import { ensureSeeded } from "./seed";

export const getWallet = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeeded();
    await ensureProfile({ userId: context.userId, displayName: null, email: null, avatarUrl: null });
    const sql = await getSql();
    const w = await sql<{
      balance: number;
      lifetime_purchased: number;
      lifetime_spent: number;
    }>`select balance, lifetime_purchased, lifetime_spent from wallets where user_id = ${context.userId}`;
    const packages = await sql<{
      id: string;
      name: string;
      price_kobo: number;
      coins: number;
      bonus_coins: number;
    }>`select id, name, price_kobo, coins, bonus_coins from coin_packages where active = true order by sort_order`;
    const { getPaymentConfig } = await import("@/lib/payments/config.server");
    const pay = getPaymentConfig();
    const settings = await getSettings();
    return {
      balance: w[0]?.balance ?? 0,
      lifetimePurchased: w[0]?.lifetime_purchased ?? 0,
      lifetimeSpent: w[0]?.lifetime_spent ?? 0,
      packages: packages.map((p) => ({
        id: p.id,
        name: p.name,
        priceKobo: p.price_kobo,
        coins: p.coins,
        bonusCoins: p.bonus_coins,
      })),
      payment: {
        provider: pay.provider,
        configured: pay.configured,
        publicKey: pay.publicKey,
      },
      coinName: settings.coinName,
      coinSymbol: settings.coinSymbol,
    };
  });

export const listWalletTransactions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      id: string;
      amount: number;
      balance_after: number;
      kind: string;
      description: string;
      created_at: string;
    }>`
      select id, amount, balance_after, kind, description, created_at
      from wallet_transactions where user_id = ${context.userId}
      order by created_at desc limit 80
    `;
  });

export const listPurchasedChapters = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      id: string;
      coins_spent: number;
      created_at: string;
      chapter_title: string;
      novel_title: string;
      novel_id: string;
      chapter_id: string;
    }>`
      select cp.id, cp.coins_spent, cp.created_at, ch.title as chapter_title,
             n.title as novel_title, n.id as novel_id, ch.id as chapter_id
      from chapter_purchases cp
      join chapters ch on ch.id = cp.chapter_id
      join novels n on n.id = cp.novel_id
      where cp.user_id = ${context.userId}
      order by cp.created_at desc
    `;
  });

export const initializeCoinPurchase = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { packageId: string }) => d)
  .handler(async ({ context, data }) => {
    await ensureSeeded();
    const sql = await getSql();
    await ensureProfile({ userId: context.userId, displayName: null, email: null, avatarUrl: null });
    const pkg = await sql<{
      id: string;
      price_kobo: number;
      coins: number;
      bonus_coins: number;
      name: string;
    }>`select id, price_kobo, coins, bonus_coins, name from coin_packages where id = ${data.packageId} and active = true`;
    if (!pkg[0]) throw new Error("Package not found");
    const totalCoins = pkg[0].coins + pkg[0].bonus_coins;
    const { getPaymentConfig } = await import("@/lib/payments/config.server");
    const pay = getPaymentConfig();
    const id = txId();
    const reference = `DN-${id}`;

    let authorizationUrl: string | null = null;
    if (pay.configured && pay.secretKey && pay.provider === "paystack") {
      const user = await sql<{ username: string }>`select username from profiles where user_id = ${context.userId}`;
      const email = `${user[0]?.username ?? "reader"}@users.davintonovels.local`;
      const origin = process.env.BETTER_AUTH_URL ?? "";
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pay.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: pkg[0].price_kobo,
          reference,
          callback_url: origin ? `${origin}/wallet?payment=pending` : undefined,
          metadata: { userId: context.userId, packageId: pkg[0].id, paymentId: id },
        }),
      });
      const json = (await res.json()) as {
        status: boolean;
        message?: string;
        data?: { authorization_url: string; reference: string };
      };
      if (!json.status || !json.data) throw new Error(json.message ?? "Unable to start payment");
      authorizationUrl = json.data.authorization_url;
    } else if (pay.configured && pay.secretKey && pay.provider === "flutterwave") {
      authorizationUrl = null;
    }

    await sql`
      insert into payments (
        id, user_id, package_id, provider, amount_kobo, coins, status, provider_reference, authorization_url
      ) values (
        ${id}, ${context.userId}, ${pkg[0].id}, ${pay.provider}, ${pkg[0].price_kobo},
        ${totalCoins}, 'pending', ${reference}, ${authorizationUrl}
      )
    `;

    return {
      paymentId: id,
      reference,
      authorizationUrl,
      provider: pay.provider,
      amountKobo: pkg[0].price_kobo,
      coins: totalCoins,
      packageName: pkg[0].name,
    };
  });

export async function creditPayment(opts: {
  reference: string;
  providerReference?: string;
}) {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    user_id: string;
    coins: number;
    status: string;
    amount_kobo: number;
  }>`select id, user_id, coins, status, amount_kobo from payments where provider_reference = ${opts.reference} or id = ${opts.reference}`;
  const p = rows[0];
  if (!p) return { ok: false, reason: "not_found" as const };
  if (p.status === "successful") return { ok: true, already: true as const, paymentId: p.id };
  if (p.status !== "pending") return { ok: false, reason: "invalid_status" as const };

  const w = await sql<{ balance: number }>`select balance from wallets where user_id = ${p.user_id}`;
  const next = (w[0]?.balance ?? 0) + p.coins;
  await sql`
    update wallets
    set balance = ${next},
        lifetime_purchased = lifetime_purchased + ${p.coins},
        updated_at = now()
    where user_id = ${p.user_id}
  `;
  await sql`
    insert into wallet_transactions (id, user_id, amount, balance_after, kind, description, reference_id)
    values (
      ${makeId("tx")}, ${p.user_id}, ${p.coins}, ${next}, 'purchase',
      ${"Davinto Coin purchase"}, ${p.id}
    )
  `;
  await sql`
    update payments
    set status = 'successful', verified = true, verified_at = now(), updated_at = now(),
        provider_reference = coalesce(${opts.providerReference ?? null}, provider_reference)
    where id = ${p.id} and status = 'pending'
  `;
  await notify(
    p.user_id,
    "purchase",
    "Davinto Coins credited",
    `${p.coins} Davinto Coins have been added to your wallet.`,
    "/wallet",
  );
  return { ok: true, already: false as const, paymentId: p.id, coins: p.coins };
}

export const completeSandboxPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { reference: string }) => d)
  .handler(async ({ context, data }) => {
    const { getPaymentConfig } = await import("@/lib/payments/config.server");
    const pay = getPaymentConfig();
    if (pay.configured) {
      throw new Error("Sandbox checkout is disabled while a payment provider is configured.");
    }
    const sql = await getSql();
    const rows = await sql<{ id: string; user_id: string; status: string }>`
      select id, user_id, status from payments
      where (provider_reference = ${data.reference} or id = ${data.reference})
        and user_id = ${context.userId}
    `;
    if (!rows[0]) throw new Error("Payment not found");
    const result = await creditPayment({ reference: data.reference });
    if (!result.ok) throw new Error("Could not complete payment");
    const w = await sql<{ balance: number }>`select balance from wallets where user_id = ${context.userId}`;
    return { ok: true, already: result.already, balance: w[0]?.balance ?? 0 };
  });

export const unlockChapter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { chapterId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile({ userId: context.userId, displayName: null, email: null, avatarUrl: null });
    const owned = await sql`
      select 1 from chapter_purchases where user_id = ${context.userId} and chapter_id = ${data.chapterId}
    `;
    if (owned.length) return { ok: true, already: true };

    const ch = await sql<{
      id: string;
      novel_id: string;
      author_id: string;
      is_premium: boolean;
      coin_price: number;
      title: string;
      status: string;
    }>`
      select id, novel_id, author_id, is_premium, coin_price, title, status
      from chapters where id = ${data.chapterId}
    `;
    const chapter = ch[0];
    if (!chapter || chapter.status !== "published" || !chapter.is_premium) {
      throw new Error("Chapter is not available for purchase");
    }
    if (chapter.author_id === context.userId) {
      return { ok: true, already: true };
    }

    const settings = await getSettings();
    const cost = chapter.coin_price || settings.defaultChapterPrice;
    const updated = await sql<{ balance: number }>`
      update wallets
      set balance = balance - ${cost},
          lifetime_spent = lifetime_spent + ${cost},
          updated_at = now()
      where user_id = ${context.userId} and balance >= ${cost}
      returning balance
    `;
    if (!updated[0]) throw new Error("Insufficient Davinto Coins");

    const authorShare = Math.floor((cost * settings.authorRevenuePercent) / 100);
    const platformShare = cost - authorShare;
    const purchaseId = makeId("cp");
    try {
      await sql`
        insert into chapter_purchases (
          id, user_id, chapter_id, novel_id, author_id, coins_spent, author_share, platform_share
        ) values (
          ${purchaseId}, ${context.userId}, ${chapter.id}, ${chapter.novel_id},
          ${chapter.author_id}, ${cost}, ${authorShare}, ${platformShare}
        )
      `;
    } catch {
      await sql`
        update wallets
        set balance = balance + ${cost}, lifetime_spent = lifetime_spent - ${cost}, updated_at = now()
        where user_id = ${context.userId}
      `;
      return { ok: true, already: true };
    }

    await sql`
      insert into wallet_transactions (id, user_id, amount, balance_after, kind, description, reference_id)
      values (
        ${makeId("tx")}, ${context.userId}, ${-cost}, ${updated[0].balance}, 'unlock',
        ${`Unlocked: ${chapter.title}`}, ${purchaseId}
      )
    `;
    await sql`
      insert into author_earnings (id, author_id, novel_id, chapter_id, purchase_id, coins)
      values (${makeId("ae")}, ${chapter.author_id}, ${chapter.novel_id}, ${chapter.id}, ${purchaseId}, ${authorShare})
    `;
    await sql`
      insert into author_balances (author_id, available, lifetime)
      values (${chapter.author_id}, ${authorShare}, ${authorShare})
      on conflict (author_id) do update set
        available = author_balances.available + ${authorShare},
        lifetime = author_balances.lifetime + ${authorShare},
        updated_at = now()
    `;
    if (authorShare > 0) {
      await sql`
        insert into wallet_transactions (id, user_id, amount, balance_after, kind, description, reference_id)
        select ${makeId("tx")}, ${chapter.author_id}, ${authorShare}, b.available, 'author_earning',
               ${"Chapter unlock revenue"}, ${purchaseId}
        from author_balances b where b.author_id = ${chapter.author_id}
      `;
    }
    await notify(
      context.userId,
      "unlock",
      "Chapter unlocked",
      `You unlocked “${chapter.title}” for ${cost} Davinto Coins.`,
      `/novels/${chapter.novel_id}`,
    );
    return { ok: true, already: false, balance: updated[0].balance, cost };
  });
