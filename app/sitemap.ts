import type { MetadataRoute } from "next";
import { getPosts, postUrl } from "@/lib/posts";
import { absoluteUrl, isPreview } from "@/lib/site";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isPreview) return [];
  return [...["/", "/posts/", "/projects/", "/activity/", "/about/"].map((url) => ({ url: absoluteUrl(url) })),
    ...(await getPosts()).map((post) => ({ url: absoluteUrl(postUrl(post)), lastModified: post.date }))];
}
