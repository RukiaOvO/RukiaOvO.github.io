import { getPosts, postUrl } from "@/lib/posts";
import { absoluteUrl, site } from "@/lib/site";
export const dynamic = "force-static";
function xml(value: string) { return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!); }
export async function GET() {
  const posts = await getPosts();
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(site.profile.siteTitle)}</title><link>${xml(absoluteUrl("/posts/"))}</link><description>${xml(site.posts.description)}</description><language>zh-CN</language><atom:link href="${xml(absoluteUrl("/posts/index.xml"))}" rel="self" type="application/rss+xml"/>${posts.map((post) => `<item><title>${xml(post.title)}</title><link>${xml(absoluteUrl(postUrl(post)))}</link><guid>${xml(absoluteUrl(postUrl(post)))}</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate><description>${xml(post.summary)}</description></item>`).join("")}</channel></rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
