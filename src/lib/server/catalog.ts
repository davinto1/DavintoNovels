import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { ratingAvg } from "@/lib/format";
import type { ChapterMeta, Genre, NovelCard } from "@/lib/types";
import { ensureProfile } from "./helpers";
import { ensureSeeded } from "./seed";

type NovelRow = {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  cover_palette: string;
  cover_url: string | null;
  status: NovelCard["status"];
  age_rating: string;
  views: number;
  likes: number;
  library_count: number;
  rating_sum: number;
  rating_count: number;
  chapter_count: number;
  latest_chapter_at: string | null;
  published_at: string | null;
  author_id: string;
  username: string;
  display_name: string;
};

function mapNovel(r: NovelRow, genres: NovelCard["genres"]): NovelCard {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    synopsis: r.synopsis,
    coverPalette: r.cover_palette,
    coverUrl: r.cover_url,
    status: r.status,
    ageRating: r.age_rating,
    views: r.views,
    likes: r.likes,
    libraryCount: r.library_count,
    ratingAvg: ratingAvg(r.rating_sum, r.rating_count),
    ratingCount: r.rating_count,
    chapterCount: r.chapter_count,
    latestChapterAt: r.latest_chapter_at,
    publishedAt: r.published_at,
    author: { id: r.author_id, username: r.username, displayName: r.display_name },
    genres,
  };
}

async function attachGenres(novels: NovelRow[]): Promise<NovelCard[]> {
  if (!novels.length) return [];
  const sql = await getSql();
  const ids = novels.map((n) => n.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const rows = await sql.query<{ novel_id: string; id: string; name: string; slug: string }>(
    `select ng.novel_id, g.id, g.name, g.slug
     from novel_genres ng join genres g on g.id = ng.genre_id
     where ng.novel_id in (${placeholders})`,
    ids,
  );
  const map = new Map<string, NovelCard["genres"]>();
  for (const r of rows) {
    const list = map.get(r.novel_id) ?? [];
    list.push({ id: r.id, name: r.name, slug: r.slug });
    map.set(r.novel_id, list);
  }
  return novels.map((n) => mapNovel(n, map.get(n.id) ?? []));
}

const NOVEL_SELECT = `
  select n.id, n.title, n.slug, n.synopsis, n.cover_palette, n.cover_url, n.status,
         n.age_rating, n.views, n.likes, n.library_count, n.rating_sum, n.rating_count,
         n.chapter_count, n.latest_chapter_at, n.published_at, n.author_id,
         p.username, p.display_name
  from novels n
  join profiles p on p.user_id = n.author_id
`;

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeeded();
  const { getSettings } = await import("./helpers");
  return getSettings();
});

export const listGenres = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeeded();
  const sql = await getSql();
  return sql<Genre>`select id, name, slug, description from genres order by sort_order`;
});

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeeded();
  const sql = await getSql();
  const featuredRows = await sql.query<NovelRow>(
    `${NOVEL_SELECT} where n.status in ('ongoing','completed') and n.featured = true order by n.views desc limit 8`,
  );
  const trending = await sql.query<NovelRow>(
    `${NOVEL_SELECT} where n.status in ('ongoing','completed') order by n.likes desc, n.views desc limit 10`,
  );
  const popular = await sql.query<NovelRow>(
    `${NOVEL_SELECT} where n.status in ('ongoing','completed') order by n.views desc limit 10`,
  );
  const updated = await sql.query<NovelRow>(
    `${NOVEL_SELECT} where n.status in ('ongoing','completed') order by n.latest_chapter_at desc nulls last limit 10`,
  );
  const newest = await sql.query<NovelRow>(
    `${NOVEL_SELECT} where n.status in ('ongoing','completed') order by n.published_at desc nulls last limit 10`,
  );
  const completed = await sql.query<NovelRow>(
    `${NOVEL_SELECT} where n.status = 'completed' order by n.views desc limit 8`,
  );
  const authors = await sql<{
    user_id: string;
    username: string;
    display_name: string;
    bio: string;
    followers_count: number;
    novels: number;
  }>`
    select p.user_id, p.username, p.display_name, p.bio, p.followers_count,
           (select count(*)::int from novels n where n.author_id = p.user_id and n.status in ('ongoing','completed')) as novels
    from profiles p
    where p.is_author = true
    order by p.followers_count desc
    limit 8
  `;
  const genres = await sql<Genre>`select id, name, slug, description from genres order by sort_order`;
  const banners = await sql<{
    id: string;
    title: string;
    subtitle: string;
    href: string | null;
    novel_id: string | null;
  }>`select id, title, subtitle, href, novel_id from homepage_banners where active = true order by sort_order`;

  return {
    featured: await attachGenres(featuredRows),
    trending: await attachGenres(trending),
    popular: await attachGenres(popular),
    updated: await attachGenres(updated),
    newest: await attachGenres(newest),
    completed: await attachGenres(completed),
    authors,
    genres,
    banners,
  };
});

export const searchNovels = createServerFn({ method: "GET" })
  .validator((d: { q?: string; genre?: string; sort?: string; status?: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    await ensureSeeded();
    const sql = await getSql();
    const q = (data.q ?? "").trim();
    const sort = data.sort ?? "popular";
    const limit = Math.min(data.limit ?? 24, 60);
    const order =
      sort === "newest"
        ? "n.published_at desc nulls last"
        : sort === "updated"
          ? "n.latest_chapter_at desc nulls last"
          : sort === "rating"
            ? "n.rating_sum desc"
            : "n.views desc";
    const clauses = [`n.status in ('ongoing','completed')`];
    const params: unknown[] = [];
    if (q) {
      params.push(`%${q}%`);
      clauses.push(
        `(n.title ilike $${params.length} or p.display_name ilike $${params.length} or n.synopsis ilike $${params.length})`,
      );
    }
    if (data.status === "completed" || data.status === "ongoing") {
      params.push(data.status);
      clauses.push(`n.status = $${params.length}`);
    }
    if (data.genre) {
      params.push(data.genre);
      clauses.push(
        `exists (select 1 from novel_genres ng where ng.novel_id = n.id and (ng.genre_id = $${params.length} or exists (select 1 from genres g where g.id = ng.genre_id and g.slug = $${params.length})))`,
      );
    }
    params.push(limit);
    const rows = await sql.query<NovelRow>(
      `${NOVEL_SELECT} where ${clauses.join(" and ")} order by ${order} limit $${params.length}`,
      params,
    );
    return attachGenres(rows);
  });

export const searchSuggest = createServerFn({ method: "GET" })
  .validator((d: { q: string }) => d)
  .handler(async ({ data }) => {
    await ensureSeeded();
    const q = data.q.trim();
    if (q.length < 2) return { novels: [] as { id: string; title: string }[], authors: [] as { id: string; name: string }[] };
    const sql = await getSql();
    const like = `%${q}%`;
    const novels = await sql<{ id: string; title: string }>`
      select id, title from novels
      where status in ('ongoing','completed') and title ilike ${like}
      order by views desc limit 6
    `;
    const authors = await sql<{ id: string; name: string }>`
      select user_id as id, display_name as name from profiles
      where is_author = true and (display_name ilike ${like} or username ilike ${like})
      limit 4
    `;
    return { novels, authors };
  });

export const getNovelPage = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await ensureSeeded();
    const sql = await getSql();
    const rows = await sql.query<NovelRow>(`${NOVEL_SELECT} where n.id = $1 or n.slug = $1 limit 1`, [data.id]);
    if (!rows[0]) return null;
    const novel = (await attachGenres(rows))[0];
    const tags = await sql<{ id: string; name: string; slug: string }>`
      select t.id, t.name, t.slug from novel_tags nt join tags t on t.id = nt.tag_id where nt.novel_id = ${novel.id}
    `;
    const chapters = await sql<{
      id: string;
      novel_id: string;
      title: string;
      chapter_number: number;
      word_count: number;
      status: ChapterMeta["status"];
      is_premium: boolean;
      coin_price: number;
      views: number;
      published_at: string | null;
    }>`
      select id, novel_id, title, chapter_number, word_count, status, is_premium, coin_price, views, published_at
      from chapters
      where novel_id = ${novel.id} and status = 'published'
        and (published_at is null or published_at <= now())
      order by chapter_number
    `;
    const reviews = await sql<{
      id: string;
      rating: number;
      body: string;
      created_at: string;
      display_name: string;
      username: string;
    }>`
      select r.id, r.rating, r.body, r.created_at, p.display_name, p.username
      from reviews r join profiles p on p.user_id = r.user_id
      where r.novel_id = ${novel.id} and r.hidden = false
      order by r.created_at desc limit 20
    `;
    const comments = await sql<{
      id: string;
      body: string;
      created_at: string;
      display_name: string;
      username: string;
    }>`
      select c.id, c.body, c.created_at, p.display_name, p.username
      from comments c join profiles p on p.user_id = c.user_id
      where c.novel_id = ${novel.id} and c.hidden = false and c.chapter_id is null
      order by c.created_at desc limit 30
    `;

    let inLibrary = false;
    let following = false;
    let liked = false;
    let progress: { chapterId: string; chapterNumber: number; title: string } | null = null;
    let unlocked = new Set<string>();
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    if (user) {
      await ensureProfile({
        userId: user.id,
        displayName: user.email,
        email: user.email,
        avatarUrl: null,
      });
      const lib = await sql`select 1 from libraries where user_id = ${user.id} and novel_id = ${novel.id}`;
      inLibrary = lib.length > 0;
      const fol = await sql`select 1 from follows where follower_id = ${user.id} and author_id = ${novel.author.id}`;
      following = fol.length > 0;
      const lk = await sql`select 1 from novel_likes where user_id = ${user.id} and novel_id = ${novel.id}`;
      liked = lk.length > 0;
      const pr = await sql<{ chapter_id: string; chapter_number: number; title: string }>`
        select rp.chapter_id, ch.chapter_number, ch.title
        from reading_progress rp join chapters ch on ch.id = rp.chapter_id
        where rp.user_id = ${user.id} and rp.novel_id = ${novel.id}
      `;
      if (pr[0]) progress = { chapterId: pr[0].chapter_id, chapterNumber: pr[0].chapter_number, title: pr[0].title };
      const un = await sql<{ chapter_id: string }>`
        select chapter_id from chapter_purchases where user_id = ${user.id} and novel_id = ${novel.id}
      `;
      unlocked = new Set(un.map((u) => u.chapter_id));
    }

    await sql`update novels set views = views + 1 where id = ${novel.id}`;

    const chapterMeta: ChapterMeta[] = chapters.map((c) => ({
      id: c.id,
      novelId: c.novel_id,
      title: c.title,
      chapterNumber: c.chapter_number,
      wordCount: c.word_count,
      status: c.status,
      isPremium: c.is_premium,
      coinPrice: c.coin_price,
      views: c.views,
      publishedAt: c.published_at,
      unlocked: !c.is_premium || unlocked.has(c.id),
    }));

    return {
      novel,
      tags,
      chapters: chapterMeta,
      reviews,
      comments,
      inLibrary,
      following,
      liked,
      progress,
    };
  });

export const getRankings = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeeded();
  const sql = await getSql();
  const power = await sql.query<NovelRow>(
    `${NOVEL_SELECT} where n.status in ('ongoing','completed') order by (n.views + n.likes * 8 + n.library_count * 5) desc limit 20`,
  );
  const collection = await sql.query<NovelRow>(
    `${NOVEL_SELECT} where n.status in ('ongoing','completed') order by n.library_count desc, n.views desc limit 20`,
  );
  const rated = await sql.query<NovelRow>(
    `${NOVEL_SELECT} where n.status in ('ongoing','completed') and n.rating_count > 0 order by (n.rating_sum::float / n.rating_count) desc, n.rating_count desc limit 20`,
  );
  return {
    power: await attachGenres(power),
    collection: await attachGenres(collection),
    rated: await attachGenres(rated),
  };
});

export const getAuthorPublic = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await ensureSeeded();
    const sql = await getSql();
    const p = await sql<{
      user_id: string;
      username: string;
      display_name: string;
      bio: string;
      followers_count: number;
      is_author: boolean;
    }>`
      select user_id, username, display_name, bio, followers_count, is_author
      from profiles where user_id = ${data.id} or username = ${data.id} limit 1
    `;
    if (!p[0]) return null;
    const novels = await sql.query<NovelRow>(
      `${NOVEL_SELECT} where n.author_id = $1 and n.status in ('ongoing','completed') order by n.latest_chapter_at desc`,
      [p[0].user_id],
    );
    return { profile: p[0], novels: await attachGenres(novels) };
  });
