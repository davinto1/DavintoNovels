export type Role = "reader" | "author" | "moderator" | "admin" | "super_admin";

export type NovelStatus = "draft" | "ongoing" | "completed" | "hidden";

export type ChapterStatus = "draft" | "published" | "scheduled";

export type Profile = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  role: Role;
  isAuthor: boolean;
  isSuspended: boolean;
  followersCount: number;
  followingCount: number;
};

export type Genre = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export type NovelCard = {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  coverPalette: string;
  coverUrl: string | null;
  status: NovelStatus;
  ageRating: string;
  views: number;
  likes: number;
  libraryCount: number;
  ratingAvg: number;
  ratingCount: number;
  chapterCount: number;
  latestChapterAt: string | null;
  publishedAt: string | null;
  author: { id: string; username: string; displayName: string };
  genres: { id: string; name: string; slug: string }[];
};

export type ChapterMeta = {
  id: string;
  novelId: string;
  title: string;
  chapterNumber: number;
  wordCount: number;
  status: ChapterStatus;
  isPremium: boolean;
  coinPrice: number;
  views: number;
  publishedAt: string | null;
  unlocked: boolean;
};

export type CoinPackage = {
  id: string;
  name: string;
  priceKobo: number;
  coins: number;
  bonusCoins: number;
  active: boolean;
  sortOrder: number;
};

export type SiteSettings = {
  platformName: string;
  coinName: string;
  coinSymbol: string;
  authorRevenuePercent: number;
  minWithdrawalCoins: number;
  welcomeBonusCoins: number;
  defaultChapterPrice: number;
  paymentProvider: string;
  heroKicker: string;
  heroTitle: string;
  heroBody: string;
  announcement: string;
  writersCta: string;
};

export const ADMIN_ROLES: Role[] = ["moderator", "admin", "super_admin"];
export const FULL_ADMIN_ROLES: Role[] = ["admin", "super_admin"];
