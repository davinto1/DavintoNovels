import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { makeId } from "@/lib/ids";
import { slugify, wordCount } from "@/lib/utils";
import { paletteFromTitle } from "@/lib/covers";
import { ensureProfile, getSettings } from "./helpers";

async function requireAuthor(userId: string) {
  const profile = await ensureProfile({ userId, displayName: null, email: null, avatarUrl: null });
  if (!profile.isAuthor && !["admin", "super_admin"].includes(profile.role)) {
    throw new Error("Author access required");
  }
  if (profile.isSuspended) throw new Error("Account suspended");
  return profile;
}

export const getAuthorDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAuthor(context.userId);
    const sql = await getSql();
    const novels = await sql<{
      id: string;
      title: string;
      status: string;
      views: number;
      likes: number;
      library_count: number;
      chapter_count: number;
      cover_palette: string;
    }>`
      select id, title, status, views, likes, library_count, chapter_count, cover_palette
      from novels where author_id = ${context.userId} order by updated_at desc
    `;
    const earnings = await sql<{ available: number; pending: number; withdrawn: number; lifetime: number }>`
      select available, pending, withdrawn, lifetime from author_balances where author_id = ${context.userId}
    `;
    const stats = await sql<{
      views: number;
      likes: number;
      library: number;
      unlocks: number;
    }>`
      select
        coalesce(sum(views),0)::int as views,
        coalesce(sum(likes),0)::int as likes,
        coalesce(sum(library_count),0)::int as library,
        (select count(*)::int from chapter_purchases where author_id = ${context.userId}) as unlocks
      from novels where author_id = ${context.userId}
    `;
    const settings = await getSettings();
    return {
      novels,
      earnings: earnings[0] ?? { available: 0, pending: 0, withdrawn: 0, lifetime: 0 },
      stats: stats[0],
      minWithdrawal: settings.minWithdrawalCoins,
      revenuePercent: settings.authorRevenuePercent,
    };
  });

export const createNovel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    title: string;
    synopsis: string;
    genreIds: string[];
    tags?: string;
    ageRating?: string;
    coverPalette?: string;
    coverUrl?: string;
  }) => d)
  .handler(async ({ context, data }) => {
    await requireAuthor(context.userId);
    const title = data.title.trim();
    if (title.length < 3) throw new Error("Title is too short");
    const sql = await getSql();
    const id = makeId("nov");
    let slug = slugify(title) || id;
    const taken = await sql`select 1 from novels where slug = ${slug}`;
    if (taken.length) slug = `${slug}-${id.slice(-6)}`;
    const palette = data.coverPalette || paletteFromTitle(title);
    await sql`
      insert into novels (id, author_id, title, slug, synopsis, cover_palette, cover_url, status, age_rating)
      values (
        ${id}, ${context.userId}, ${title}, ${slug}, ${data.synopsis.trim().slice(0, 4000)},
        ${palette}, ${data.coverUrl || null}, 'draft', ${data.ageRating ?? "all"}
      )
    `;
    for (const g of data.genreIds.slice(0, 4)) {
      await sql`insert into novel_genres (novel_id, genre_id) values (${id}, ${g}) on conflict do nothing`;
    }
    return { id };
  });

export const getAuthorNovel = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await requireAuthor(context.userId);
    const sql = await getSql();
    const novel = await sql<{
      id: string;
      title: string;
      synopsis: string;
      status: string;
      age_rating: string;
      cover_palette: string;
      cover_url: string | null;
      comments_enabled: boolean;
    }>`
      select id, title, synopsis, status, age_rating, cover_palette, cover_url, comments_enabled
      from novels where id = ${data.id} and author_id = ${context.userId}
    `;
    if (!novel[0]) throw new Error("Novel not found");
    const chapters = await sql<{
      id: string;
      title: string;
      chapter_number: number;
      status: string;
      is_premium: boolean;
      coin_price: number;
      word_count: number;
      published_at: string | null;
      scheduled_at: string | null;
    }>`
      select id, title, chapter_number, status, is_premium, coin_price, word_count, published_at, scheduled_at
      from chapters where novel_id = ${data.id} order by chapter_number
    `;
    const genreIds = await sql<{ genre_id: string }>`select genre_id from novel_genres where novel_id = ${data.id}`;
    const settings = await getSettings();
    return {
      novel: novel[0],
      chapters,
      genreIds: genreIds.map((g) => g.genre_id),
      defaultPrice: settings.defaultChapterPrice,
    };
  });

export const updateNovel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    id: string;
    title?: string;
    synopsis?: string;
    status?: string;
    ageRating?: string;
    coverPalette?: string;
    coverUrl?: string | null;
    commentsEnabled?: boolean;
    genreIds?: string[];
  }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const owned = await sql`select 1 from novels where id = ${data.id} and author_id = ${context.userId}`;
    if (!owned.length) throw new Error("Novel not found");
    await sql`
      update novels set
        title = coalesce(${data.title ?? null}, title),
        synopsis = coalesce(${data.synopsis ?? null}, synopsis),
        status = coalesce(${data.status ?? null}, status),
        age_rating = coalesce(${data.ageRating ?? null}, age_rating),
        cover_palette = coalesce(${data.coverPalette ?? null}, cover_palette),
        cover_url = coalesce(${data.coverUrl ?? null}, cover_url),
        comments_enabled = coalesce(${data.commentsEnabled ?? null}, comments_enabled),
        updated_at = now(),
        published_at = case
          when ${data.status ?? null} in ('ongoing','completed') and published_at is null then now()
          else published_at
        end
      where id = ${data.id} and author_id = ${context.userId}
    `;
    if (data.genreIds) {
      await sql`delete from novel_genres where novel_id = ${data.id}`;
      for (const g of data.genreIds.slice(0, 4)) {
        await sql`insert into novel_genres (novel_id, genre_id) values (${data.id}, ${g}) on conflict do nothing`;
      }
    }
    return { ok: true };
  });

export const upsertChapter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    novelId: string;
    chapterId?: string;
    title: string;
    body: string;
    status: "draft" | "published" | "scheduled";
    isPremium: boolean;
    coinPrice: number;
    scheduledAt?: string | null;
  }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const novel = await sql`select 1 from novels where id = ${data.novelId} and author_id = ${context.userId}`;
    if (!novel.length) throw new Error("Novel not found");
    const wc = wordCount(data.body);
    const title = data.title.trim() || "Untitled chapter";
    const publishedAt = data.status === "published" ? new Date().toISOString() : null;
    const scheduledAt = data.status === "scheduled" ? data.scheduledAt ?? null : null;
    if (data.chapterId) {
      await sql`
        update chapters set
          title = ${title}, body = ${data.body}, word_count = ${wc},
          status = ${data.status}, is_premium = ${data.isPremium},
          coin_price = ${Math.max(0, Math.floor(data.coinPrice))},
          published_at = coalesce(published_at, ${publishedAt}),
          scheduled_at = ${scheduledAt},
          updated_at = now()
        where id = ${data.chapterId} and author_id = ${context.userId}
      `;
      await recount(data.novelId);
      return { id: data.chapterId };
    }
    const max = await sql<{ n: number }>`
      select coalesce(max(chapter_number), 0)::int as n from chapters where novel_id = ${data.novelId}
    `;
    const id = makeId("ch");
    await sql`
      insert into chapters (
        id, novel_id, author_id, title, body, chapter_number, word_count, status,
        is_premium, coin_price, published_at, scheduled_at
      ) values (
        ${id}, ${data.novelId}, ${context.userId}, ${title}, ${data.body}, ${max[0].n + 1},
        ${wc}, ${data.status}, ${data.isPremium}, ${Math.max(0, Math.floor(data.coinPrice))},
        ${publishedAt}, ${scheduledAt}
      )
    `;
    await recount(data.novelId);
    if (data.status === "published") {
      const followers = await sql<{ follower_id: string }>`
        select follower_id from follows where author_id = ${context.userId}
      `;
      const nov = await sql<{ title: string }>`select title from novels where id = ${data.novelId}`;
      for (const f of followers.slice(0, 50)) {
        await sql`
          insert into notifications (id, user_id, kind, title, body, href)
          values (
            ${makeId("nt")}, ${f.follower_id}, 'chapter',
            ${"New chapter"}, ${`${nov[0]?.title}: ${title}`},
            ${`/novels/${data.novelId}/chapter/${id}`}
          )
        `;
      }
    }
    return { id };
  });

export const getChapterEditor = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { novelId: string; chapterId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const ch = await sql<{
      id: string;
      title: string;
      body: string;
      status: string;
      is_premium: boolean;
      coin_price: number;
      scheduled_at: string | null;
    }>`
      select id, title, body, status, is_premium, coin_price, scheduled_at
      from chapters where id = ${data.chapterId} and novel_id = ${data.novelId} and author_id = ${context.userId}
    `;
    if (!ch[0]) throw new Error("Chapter not found");
    return ch[0];
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { amount: number; bankName: string; accountName: string; accountNumber: string }) => d)
  .handler(async ({ context, data }) => {
    await requireAuthor(context.userId);
    const settings = await getSettings();
    const amount = Math.floor(data.amount);
    if (amount < settings.minWithdrawalCoins) {
      throw new Error(`Minimum withdrawal is ${settings.minWithdrawalCoins} coins`);
    }
    const sql = await getSql();
    const moved = await sql<{ available: number }>`
      update author_balances
      set available = available - ${amount},
          pending = pending + ${amount},
          updated_at = now()
      where author_id = ${context.userId} and available >= ${amount}
      returning available
    `;
    if (!moved[0]) throw new Error("Insufficient available earnings");
    const last4 = data.accountNumber.replace(/\D/g, "").slice(-4);
    const id = makeId("wd");
    await sql`
      insert into withdrawals (id, author_id, amount, bank_name, account_name, account_number_last4)
      values (${id}, ${context.userId}, ${amount}, ${data.bankName.trim()}, ${data.accountName.trim()}, ${last4})
    `;
    return { id };
  });

export const listMyWithdrawals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      id: string;
      amount: number;
      status: string;
      payout_reference: string | null;
      created_at: string;
      admin_notes: string;
    }>`
      select id, amount, status, payout_reference, created_at, admin_notes
      from withdrawals where author_id = ${context.userId}
      order by created_at desc
    `;
  });

async function recount(novelId: string) {
  const sql = await getSql();
  await sql`
    update novels set
      chapter_count = (select count(*) from chapters where novel_id = ${novelId} and status = 'published'),
      word_count = (select coalesce(sum(word_count),0) from chapters where novel_id = ${novelId} and status = 'published'),
      latest_chapter_at = (select max(published_at) from chapters where novel_id = ${novelId} and status = 'published'),
      updated_at = now()
    where id = ${novelId}
  `;
}
