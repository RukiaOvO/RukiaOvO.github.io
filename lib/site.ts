import { siteContent } from "@/data/site";

export const site = siteContent;
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
export const siteUrl = new URL(process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000"));
if (!["http:", "https:"].includes(siteUrl.protocol) || siteUrl.username || siteUrl.password || siteUrl.pathname !== "/" || siteUrl.search || siteUrl.hash) {
  throw new Error("SITE_URL must be an HTTP(S) origin without credentials or a path.");
}
export const isPreview = process.env.VERCEL_ENV === "preview" || process.env.SITE_NOINDEX === "true";
export function absoluteUrl(pathname: string) { return new URL(pathname, siteUrl).href; }
export type CommentConfig = typeof site.comments;
