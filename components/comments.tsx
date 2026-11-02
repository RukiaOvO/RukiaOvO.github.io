"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { CommentConfig } from "@/lib/site";

export function Comments({ config }: { config: CommentConfig }) {
  const pathname = usePathname();
  return <CommentThread key={pathname} config={config} />;
}

function CommentThread({ config }: { config: CommentConfig }) {
  const container = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  useEffect(() => {
    if (!attempt || !container.current) return;
    const host = container.current;
    const theme = () => document.documentElement.dataset.theme === "dark" ? "dark_dimmed" : "light";
    const script = document.createElement("script");
    const options: Record<string, string> = {
      repo: `${config.owner}/${config.repo}`, "repo-id": config.giscus.repoId,
      category: config.giscus.category, "category-id": config.giscus.categoryId,
      mapping: config.giscus.mapping, strict: config.giscus.strict,
      "reactions-enabled": config.giscus.reactionsEnabled, "emit-metadata": config.giscus.emitMetadata,
      "input-position": config.giscus.inputPosition, theme: theme(), lang: config.giscus.lang,
      loading: "eager",
    };
    for (const [name, value] of Object.entries(options)) script.setAttribute(`data-${name}`, value);
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => setStatus("error");
    const timer = window.setTimeout(() => setStatus("error"), 15_000);
    const onMessage = (event: MessageEvent) => {
      const frame = host.querySelector("iframe");
      if (event.origin !== "https://giscus.app" || !frame || event.source !== frame.contentWindow || !event.data?.giscus) return;
      window.clearTimeout(timer);
      setStatus(event.data.giscus.error ? "error" : "ready");
    };
    const observer = new MutationObserver(() => {
      host.querySelector("iframe")?.contentWindow?.postMessage({ giscus: { setConfig: { theme: theme() } } }, "https://giscus.app");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("message", onMessage);
    host.appendChild(script);
    return () => { window.clearTimeout(timer); observer.disconnect(); window.removeEventListener("message", onMessage); host.replaceChildren(); };
  }, [attempt, config]);
  if (!config.giscus.enabled) return null;
  return <section className="panel comments" aria-labelledby="comments-title">
    <p className="eyebrow">LET’S TALK</p><h2 id="comments-title">{config.title}</h2>
    <p className="muted">{config.description}</p>
    {status !== "ready" && <div className="comment-controls">
      <p role="status">{status === "idle" ? "点击加载评论，使用 GitHub 账号参与交流。" : status === "loading" ? "正在加载评论…" : "评论暂时无法加载，请稍后重试。"}</p>
      {status !== "loading" && <button className="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>{status === "idle" ? "加载评论" : "重试"}</button>}
      <a href={`https://github.com/${config.owner}/${config.repo}/discussions`} target="_blank" rel="noreferrer">前往 GitHub Discussions ↗</a>
    </div>}
    <div ref={container} className="giscus" />
  </section>;
}
