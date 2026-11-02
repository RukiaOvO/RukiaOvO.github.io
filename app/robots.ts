import type { MetadataRoute } from "next";
import { absoluteUrl, isPreview } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", ...(isPreview ? { disallow: "/" } : { allow: "/", disallow: ["/admin/", "/api/"] }) },
    ...(!isPreview ? { sitemap: absoluteUrl("/sitemap.xml") } : {}) };
}
