import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { makeId } from "@/lib/ids";
import { ensureProfile, notify } from "./helpers";

export const toggleLibrary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { novelId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile({ userId: context.userId, displayName: null, email: null, avatarUrl: null });
    const existing = await sql`
      select 1 from libraries where user_id = ${context.userId} and novel_id = ${data.novelId}
    `;
    if (existing.length) {
      await sql`delete from libraries where user_id = ${context.userId} and novel_id = ${data.novelId}`;
      await sql`update novels set library_count = greatest(library_count - 1, 0) where id = ${data.novelId}`;
      return { inLibrary: false };
    }
    await sql`insert into libraries (user_id, novel_id) values (${context.userId}, ${data.novelId}) on conflict do nothing`;
    await sql`update novels set library_count = library_count + 1 where id = ${data.novelId}`;
    return { inLibrary: true };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { novelId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile({ userId: context.userId, displayName: null, email: null, avatarUrl: null });
    const existing = await sql`
      select 1 from novel_likes where user_id = ${context.userId} and novel_id = ${data.novelId}
    `;
    if (existing.length) {
      await sql`delete from novel_likes where user_id = ${context.userId} and novel_id = ${data.novelId}`;
      await sql`update novels set likes = greatest(likes - 1, 0) where id = ${data.novelId}`;
      return { liked: false };
    }
    await sql`insert into novel_likes (user_id, novel_id) values (${context.userId}, ${data.novelId}) on conflict do nothing`;
    await sql`update novels set likes = likes + 1 where id = ${data.novelId}`;
    return { liked: true };
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { authorId: string }) => d)
  .handler(async ({ context, data }) => {
    if (data.authorId === context.userId) throw new Error("You cannot follow yourself");
    const sql = await getSql();
    await ensureProfile({ userId: context.userId, displayName: null, email: null, avatarUrl: null });
    const existing = await sql`
      select 1 from follows where follower_id = ${context.userId} and author_id = ${data.authorId}
    `;
    if (existing.length) {
      await sql`delete from follows where follower_id = ${context.userId} and author_id = ${data.authorId}`;
      await sql`update profiles set followers_count = greatest(followers_count - 1, 0) where user_id = ${data.authorId}`;
      await sql`update profiles set following_count = greatest(following_count - 1, 0) where user_id = ${context.userId}`;
      return { following: false };
    }
    await sql`
      insert into follows (follower_id, author_id) values (${context.userId}, ${data.authorId})
      on conflict do nothing
    `;
    await sql`update profiles set followers_count = followers_count + 1 where user_id = ${data.authorId}`;
    await sql`update profiles set following_count = following_count + 1 where user_id = ${context.userId}`;
    const me = await sql<{ display_name: string }>`select display_name from profiles where user_id = ${context.userId}`;
    await notify(
      data.authorId,
      "follow",
      "New follower",
      `${me[0]?.display_name ?? "A reader"} started following you.`,
      `/authors/${context.userId}`,
    );
    return { following: true };
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { novelId: string; chapterId?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql`
      select 1 from bookmarks where user_id = ${context.userId} and novel_id = ${data.novelId}
    `;
    if (existing.length && !data.chapterId) {
      await sql`delete from bookmarks where user_id = ${context.userId} and novel_id = ${data.novelId}`;
      return { bookmarked: false };
    }
    await sql`
      insert into bookmarks (user_id, novel_id, chapter_id)
      values (${context.userId}, ${data.novelId}, ${data.chapterId ?? null})
      on conflict (user_id, novel_id) do update set chapter_id = excluded.chapter_id, created_at = now()
    `;
    return { bookmarked: true };
  });

export const submitReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { novelId: string; rating: number; body: string }) => d)
  .handler(async ({ context, data }) => {
    const rating = Math.max(1, Math.min(5, Math.round(data.rating)));
    const body = data.body.trim().slice(0, 2000);
    const sql = await getSql();
    await ensureProfile({ userId: context.userId, displayName: null, email: null, avatarUrl: null });
    const prev = await sql<{ rating: number }>`
      select rating from reviews where user_id = ${context.userId} and novel_id = ${data.novelId}
    `;
    if (prev[0]) {
      await sql`
        update reviews set rating = ${rating}, body = ${body}, updated_at = now()
        where user_id = ${context.userId} and novel_id = ${data.novelId}
      `;
      await sql`
        update novels
        set rating_sum = rating_sum - ${prev[0].rating} + ${rating}
        where id = ${data.novelId}
      `;
    } else {
      await sql`
        insert into reviews (id, user_id, novel_id, rating, body)
        values (${makeId("rv")}, ${context.userId}, ${data.novelId}, ${rating}, ${body})
      `;
      await sql`
        update novels
        set rating_sum = rating_sum + ${rating}, rating_count = rating_count + 1
        where id = ${data.novelId}
      `;
    }
    return { ok: true };
  });

export const submitComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { novelId: string; chapterId?: string; body: string }) => d)
  .handler(async ({ context, data }) => {
    const body = data.body.trim().slice(0, 2000);
    if (!body) throw new Error("Comment cannot be empty");
    const sql = await getSql();
    await ensureProfile({ userId: context.userId, displayName: null, email: null, avatarUrl: null });
    const enabled = await sql<{ comments_enabled: boolean }>`
      select comments_enabled from novels where id = ${data.novelId}
    `;
    if (!enabled[0]?.comments_enabled) throw new Error("Comments are closed");
    await sql`
      insert into comments (id, user_id, novel_id, chapter_id, body)
      values (${makeId("cm")}, ${context.userId}, ${data.novelId}, ${data.chapterId ?? null}, ${body})
    `;
    return { ok: true };
  });

export const submitReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { targetType: "novel" | "chapter" | "comment" | "review" | "user"; targetId: string; reason: string; details?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into reports (id, reporter_id, target_type, target_id, reason, details)
      values (
        ${makeId("rp")}, ${context.userId}, ${data.targetType}, ${data.targetId},
        ${data.reason.slice(0, 80)}, ${(data.details ?? "").slice(0, 1000)}
      )
    `;
    return { ok: true };
  });

export const getLibraryPage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const library = await sql<{
      id: string;
      title: string;
      cover_palette: string;
      cover_url: string | null;
      status: string;
      author: string;
      chapter_id: string | null;
      chapter_title: string | null;
    }>`
      select n.id, n.title, n.cover_palette, n.cover_url, n.status, p.display_name as author,
             rp.chapter_id, ch.title as chapter_title
      from libraries l
      join novels n on n.id = l.novel_id
      join profiles p on p.user_id = n.author_id
      left join reading_progress rp on rp.user_id = l.user_id and rp.novel_id = n.id
      left join chapters ch on ch.id = rp.chapter_id
      where l.user_id = ${context.userId}
      order by l.created_at desc
    `;
    const bookmarks = await sql<{
      id: string;
      title: string;
      cover_palette: string;
      chapter_id: string | null;
    }>`
      select n.id, n.title, n.cover_palette, b.chapter_id
      from bookmarks b join novels n on n.id = b.novel_id
      where b.user_id = ${context.userId}
      order by b.created_at desc
    `;
    const history = await sql<{
      id: string;
      title: string;
      cover_palette: string;
      chapter_id: string;
      chapter_title: string;
      updated_at: string;
    }>`
      select n.id, n.title, n.cover_palette, rp.chapter_id, ch.title as chapter_title, rp.updated_at
      from reading_progress rp
      join novels n on n.id = rp.novel_id
      join chapters ch on ch.id = rp.chapter_id
      where rp.user_id = ${context.userId}
      order by rp.updated_at desc limit 30
    `;
    const following = await sql<{
      user_id: string;
      username: string;
      display_name: string;
      bio: string;
    }>`
      select p.user_id, p.username, p.display_name, p.bio
      from follows f join profiles p on p.user_id = f.author_id
      where f.follower_id = ${context.userId}
      order by f.created_at desc
    `;
    return { library, bookmarks, history, following };
  });
