import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureSeeded } from "./seed";
import { ensureProfile } from "./helpers";

export const getChapterPage = createServerFn({ method: "GET" })
  .validator((d: { novelId: string; chapterId: string }) => d)
  .handler(async ({ data }) => {
    await ensureSeeded();
    const sql = await getSql();
    const novel = await sql<{
      id: string;
      title: string;
      slug: string;
      author_id: string;
      cover_palette: string;
      comments_enabled: boolean;
    }>`
      select id, title, slug, author_id, cover_palette, comments_enabled
      from novels where id = ${data.novelId} or slug = ${data.novelId} limit 1
    `;
    if (!novel[0]) return { error: "not_found" as const };
    const ch = await sql<{
      id: string;
      novel_id: string;
      author_id: string;
      title: string;
      body: string;
      chapter_number: number;
      word_count: number;
      is_premium: boolean;
      coin_price: number;
      status: string;
      published_at: string | null;
    }>`
      select id, novel_id, author_id, title, body, chapter_number, word_count,
             is_premium, coin_price, status, published_at
      from chapters where id = ${data.chapterId} and novel_id = ${novel[0].id}
    `;
    if (!ch[0] || ch[0].status !== "published") return { error: "not_found" as const };

    const toc = await sql<{
      id: string;
      title: string;
      chapter_number: number;
      is_premium: boolean;
    }>`
      select id, title, chapter_number, is_premium
      from chapters
      where novel_id = ${novel[0].id} and status = 'published'
        and (published_at is null or published_at <= now())
      order by chapter_number
    `;

    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    let unlocked = !ch[0].is_premium;
    let balance = 0;
    if (user) {
      await ensureProfile({ userId: user.id, displayName: user.email, email: user.email, avatarUrl: null });
      if (user.id === ch[0].author_id) unlocked = true;
      else if (ch[0].is_premium) {
        const p = await sql`
          select 1 from chapter_purchases where user_id = ${user.id} and chapter_id = ${ch[0].id}
        `;
        unlocked = p.length > 0;
      } else unlocked = true;
      const w = await sql<{ balance: number }>`select balance from wallets where user_id = ${user.id}`;
      balance = w[0]?.balance ?? 0;
    }

    if (unlocked) {
      await sql`update chapters set views = views + 1 where id = ${ch[0].id}`;
    }

    const idx = toc.findIndex((t) => t.id === ch[0].id);
    const prev = idx > 0 ? toc[idx - 1] : null;
    const next = idx >= 0 && idx < toc.length - 1 ? toc[idx + 1] : null;

    return {
      error: null as null,
      novel: novel[0],
      chapter: {
        id: ch[0].id,
        title: ch[0].title,
        body: unlocked ? ch[0].body : "",
        chapterNumber: ch[0].chapter_number,
        wordCount: ch[0].word_count,
        isPremium: ch[0].is_premium,
        coinPrice: ch[0].coin_price,
        unlocked,
      },
      toc,
      prev,
      next,
      signedIn: Boolean(user),
      balance,
      commentsEnabled: novel[0].comments_enabled,
    };
  });

export const saveProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { novelId: string; chapterId: string; position: number }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into reading_progress (user_id, novel_id, chapter_id, position_percent, updated_at)
      values (${context.userId}, ${data.novelId}, ${data.chapterId}, ${data.position}, now())
      on conflict (user_id, novel_id) do update set
        chapter_id = excluded.chapter_id,
        position_percent = excluded.position_percent,
        updated_at = now()
    `;
    return { ok: true };
  });
