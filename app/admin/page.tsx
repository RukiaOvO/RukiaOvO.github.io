import type { Metadata } from "next";
import { MarkdownEditor } from "@/components/markdown-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "内容工作台", robots: { index: false, follow: false } };

export default function Admin() {
  return <><header className="page-intro"><p className="eyebrow">WRITE & PUBLISH</p><h1>内容工作台<span className="accent">。</span></h1><p>用熟悉的 Markdown 写作，图片会直接插入文章，保存后生成 GitHub 草稿 PR。</p></header><MarkdownEditor /></>;
}
