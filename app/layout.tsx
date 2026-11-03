import type { Metadata } from "next";
import Link from "next/link";
import { site, siteUrl, isPreview, absoluteUrl } from "@/lib/site";
import { ThemeControl, themeScript } from "@/components/theme-control";
import { Navigation } from "@/components/navigation";
import { VisitorCount } from "@/components/visitor-count";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: site.profile.siteTitle, template: `%s · ${site.profile.romanName}` },
  description: "露琪亚的个人主页与技术博客：软件工程、Agent / AI4SE、论文研读与日常记录。",
  alternates: { canonical: "/", types: { "application/rss+xml": "/posts/index.xml" } },
  openGraph: { type: "website", locale: "zh_CN", siteName: site.profile.siteTitle, images: [{ url: absoluteUrl("/img/avatar.jpg"), width: 400, height: 400, alt: site.profile.displayName }] },
  twitter: { card: "summary" },
  robots: isPreview ? { index: false, follow: false } : { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body>
      <a className="skip-link" href="#main-content">跳转到主要内容</a>
      <header className="site-header"><div className="header-inner">
        <Link href="/" className="dock-brand" aria-label="Ruk1a 首页"><strong>Hello, I am {site.profile.romanName}. <VisitorCount badgeUrl={site.visitor.badgeUrl} /></strong><span>工程实践、公开动态与阶段性思考</span></Link>
        <Navigation links={site.navigation} /><ThemeControl />
      </div></header>
      <main id="main-content" className="site-main" tabIndex={-1}>{children}</main>
      <footer className="site-footer"><p>© 2026 {site.profile.romanName} <span>无风去处是归宿</span></p>
        <div><a href="/posts/index.xml">RSS</a><Link href="/admin/">写作与上传</Link><a href={`https://github.com/${site.profile.github}`} target="_blank" rel="noreferrer">GitHub ↗</a><span>Built with Next.js</span></div>
      </footer>
    </body>
  </html>;
}
