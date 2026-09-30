-- DavintoNovels core schema. Financial data lives here, never in the browser.

create table if not exists profiles (
  user_id text primary key,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_url text,
  role text not null default 'reader'
    check (role in ('reader', 'author', 'moderator', 'admin', 'super_admin')),
  is_author boolean not null default false,
  is_suspended boolean not null default false,
  warning_count integer not null default 0,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wallets (
  user_id text primary key references profiles(user_id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_purchased integer not null default 0,
  lifetime_spent integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists genres (
  id text primary key,
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  sort_order integer not null default 0
);

create table if not exists tags (
  id text primary key,
  name text not null unique,
  slug text not null unique
);

create table if not exists novels (
  id text primary key,
  author_id text not null references profiles(user_id),
  title text not null,
  slug text not null unique,
  synopsis text not null default '',
  cover_palette text not null default 'ink',
  cover_url text,
  status text not null default 'draft'
    check (status in ('draft', 'ongoing', 'completed', 'hidden')),
  age_rating text not null default 'all'
    check (age_rating in ('all', '13', '16', '18')),
  comments_enabled boolean not null default true,
  featured boolean not null default false,
  views integer not null default 0,
  likes integer not null default 0,
  library_count integer not null default 0,
  rating_sum integer not null default 0,
  rating_count integer not null default 0,
  chapter_count integer not null default 0,
  word_count integer not null default 0,
  latest_chapter_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists novels_author_idx on novels (author_id);
create index if not exists novels_status_idx on novels (status);
create index if not exists novels_featured_idx on novels (featured);
create index if not exists novels_views_idx on novels (views desc);
create index if not exists novels_updated_idx on novels (latest_chapter_at desc);

create table if not exists novel_genres (
  novel_id text not null references novels(id) on delete cascade,
  genre_id text not null references genres(id) on delete cascade,
  primary key (novel_id, genre_id)
);

create table if not exists novel_tags (
  novel_id text not null references novels(id) on delete cascade,
  tag_id text not null references tags(id) on delete cascade,
  primary key (novel_id, tag_id)
);

create table if not exists chapters (
  id text primary key,
  novel_id text not null references novels(id) on delete cascade,
  author_id text not null references profiles(user_id),
  title text not null,
  body text not null default '',
  chapter_number integer not null,
  word_count integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'scheduled')),
  is_premium boolean not null default false,
  coin_price integer not null default 0 check (coin_price >= 0),
  views integer not null default 0,
  published_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (novel_id, chapter_number)
);

create index if not exists chapters_novel_idx on chapters (novel_id, chapter_number);
create index if not exists chapters_status_idx on chapters (status);

create table if not exists libraries (
  user_id text not null references profiles(user_id) on delete cascade,
  novel_id text not null references novels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

create table if not exists bookmarks (
  user_id text not null references profiles(user_id) on delete cascade,
  novel_id text not null references novels(id) on delete cascade,
  chapter_id text references chapters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

create table if not exists reading_progress (
  user_id text not null references profiles(user_id) on delete cascade,
  novel_id text not null references novels(id) on delete cascade,
  chapter_id text not null references chapters(id) on delete cascade,
  position_percent integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

create table if not exists follows (
  follower_id text not null references profiles(user_id) on delete cascade,
  author_id text not null references profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, author_id),
  check (follower_id <> author_id)
);

create table if not exists novel_likes (
  user_id text not null references profiles(user_id) on delete cascade,
  novel_id text not null references novels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

create table if not exists reviews (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  novel_id text not null references novels(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, novel_id)
);

create table if not exists comments (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  novel_id text not null references novels(id) on delete cascade,
  chapter_id text references chapters(id) on delete cascade,
  parent_id text,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists comments_novel_idx on comments (novel_id, created_at desc);

create table if not exists coin_packages (
  id text primary key,
  name text not null,
  price_kobo integer not null check (price_kobo > 0),
  coins integer not null check (coins > 0),
  bonus_coins integer not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists wallet_transactions (
  id text primary key,
  user_id text not null references profiles(user_id),
  amount integer not null,
  balance_after integer not null,
  kind text not null
    check (kind in (
      'purchase', 'unlock', 'bonus', 'refund', 'adjustment',
      'author_earning', 'withdrawal'
    )),
  description text not null default '',
  reference_id text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_tx_user_idx on wallet_transactions (user_id, created_at desc);

create table if not exists payments (
  id text primary key,
  user_id text not null references profiles(user_id),
  package_id text not null references coin_packages(id),
  provider text not null,
  amount_kobo integer not null,
  coins integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'successful', 'failed', 'refunded')),
  provider_reference text unique,
  authorization_url text,
  verified boolean not null default false,
  verified_at timestamptz,
  metadata_json text not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_idx on payments (user_id, created_at desc);
create index if not exists payments_status_idx on payments (status);

create table if not exists chapter_purchases (
  id text primary key,
  user_id text not null references profiles(user_id),
  chapter_id text not null references chapters(id),
  novel_id text not null references novels(id),
  author_id text not null,
  coins_spent integer not null,
  author_share integer not null,
  platform_share integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, chapter_id)
);

create index if not exists chapter_purchases_user_idx on chapter_purchases (user_id);
create index if not exists chapter_purchases_author_idx on chapter_purchases (author_id);

create table if not exists author_earnings (
  id text primary key,
  author_id text not null references profiles(user_id),
  novel_id text not null references novels(id),
  chapter_id text not null references chapters(id),
  purchase_id text not null references chapter_purchases(id),
  coins integer not null,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists author_earnings_author_idx on author_earnings (author_id, created_at desc);

create table if not exists author_balances (
  author_id text primary key references profiles(user_id) on delete cascade,
  available integer not null default 0 check (available >= 0),
  pending integer not null default 0 check (pending >= 0),
  withdrawn integer not null default 0 check (withdrawn >= 0),
  lifetime integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists withdrawals (
  id text primary key,
  author_id text not null references profiles(user_id),
  amount integer not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'paid')),
  payout_reference text,
  admin_notes text not null default '',
  bank_name text not null default '',
  account_name text not null default '',
  account_number_last4 text not null default '',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists withdrawals_author_idx on withdrawals (author_id, created_at desc);

create table if not exists notifications (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

create table if not exists reports (
  id text primary key,
  reporter_id text not null references profiles(user_id),
  target_type text not null check (target_type in ('novel', 'chapter', 'comment', 'review', 'user')),
  target_id text not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open'
    check (status in ('open', 'dismissed', 'actioned')),
  admin_notes text not null default '',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_logs (
  id text primary key,
  admin_id text not null,
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  details text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_idx on admin_audit_logs (created_at desc);

create table if not exists site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists homepage_banners (
  id text primary key,
  title text not null,
  subtitle text not null default '',
  href text,
  novel_id text references novels(id) on delete set null,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists announcements (
  id text primary key,
  title text not null,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into genres (id, name, slug, description, sort_order) values
  ('g_romance', 'Romance', 'romance', 'Love stories, slow burns, and heart-led fiction.', 1),
  ('g_fantasy', 'Fantasy', 'fantasy', 'Magic, courts, and other worlds.', 2),
  ('g_thriller', 'Thriller', 'thriller', 'High-stakes tension and pursuit.', 3),
  ('g_mystery', 'Mystery', 'mystery', 'Secrets, clues, and unanswered questions.', 4),
  ('g_action', 'Action', 'action', 'Physical stakes, heists, and survival.', 5),
  ('g_scifi', 'Sci-Fi', 'sci-fi', 'Future tech, space, and the almost-possible.', 6),
  ('g_african', 'African Fiction', 'african-fiction', 'Stories rooted in African life, cities, and memory.', 7),
  ('g_campus', 'Campus', 'campus', 'University life, first loves, and becoming.', 8),
  ('g_drama', 'Drama', 'drama', 'Family, class, and the cost of choosing.', 9)
on conflict (id) do nothing;

insert into tags (id, name, slug) values
  ('t_lagos', 'Lagos', 'lagos'),
  ('t_slowburn', 'Slow burn', 'slow-burn'),
  ('t_foundfamily', 'Found family', 'found-family'),
  ('t_political', 'Political', 'political'),
  ('t_ghosts', 'Ghosts', 'ghosts'),
  ('t_heist', 'Heist', 'heist'),
  ('t_firstlove', 'First love', 'first-love'),
  ('t_nobility', 'Court intrigue', 'court-intrigue'),
  ('t_ai', 'Artificial intelligence', 'ai'),
  ('t_faith', 'Faith', 'faith')
on conflict (id) do nothing;

insert into coin_packages (id, name, price_kobo, coins, bonus_coins, sort_order) values
  ('pkg_500', 'Starter', 50000, 500, 0, 1),
  ('pkg_1000', 'Reader', 100000, 1000, 50, 2),
  ('pkg_2000', 'Devoted', 200000, 2000, 200, 3),
  ('pkg_5000', 'Patron', 500000, 5000, 750, 4),
  ('pkg_10000', 'House', 1000000, 10000, 2000, 5)
on conflict (id) do nothing;

insert into site_settings (key, value) values
  ('platform_name', 'DavintoNovels'),
  ('coin_name', 'Davinto Coins'),
  ('coin_symbol', 'D-Coins'),
  ('author_revenue_percent', '70'),
  ('min_withdrawal_coins', '5000'),
  ('welcome_bonus_coins', '150'),
  ('default_chapter_price', '20'),
  ('payment_provider', 'paystack'),
  ('hero_kicker', 'A house for stories'),
  ('hero_title', 'Read. Write. Earn.'),
  ('hero_body', 'DavintoNovels is a publishing house in your pocket — original novels, a quiet reading room, and a fair way for writers to be paid.'),
  ('announcement', ''),
  ('writers_cta', 'Have a story to tell? Start writing on DavintoNovels.')
on conflict (key) do nothing;
