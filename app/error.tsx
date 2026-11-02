"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="empty-state"><h1>页面暂时无法加载</h1><p>请稍后重试。</p><button className="button" onClick={reset}>重新加载</button></section>;
}
