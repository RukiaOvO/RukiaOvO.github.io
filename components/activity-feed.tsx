"use client";

import { useEffect, useRef, useState } from "react";
import { activityDataSchema, type ActivityData } from "@/lib/activity-model";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: ActivityData };
export function ActivityFeed({ kind, compact = false }: { kind: "github" | "rss"; compact?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState("all");
  const [visible, setVisible] = useState(compact ? 3 : 8);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let timer: number | undefined;
    const load = async () => {
      timer = window.setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch(`/api/activity/?kind=${kind}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error("unavailable");
        const data = activityDataSchema.parse(payload.data);
        if (!disposed) setState({ status: "ready", data });
      } catch {
        if (!disposed) setState({ status: "error", message: controller.signal.aborted ? "加载超时，请稍后重试。" : "暂时无法获取动态，请稍后重试。" });
      } finally { clearTimeout(timer); }
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); void load(); }
    }, { rootMargin: "240px" });
    if (root.current) observer.observe(root.current);
    return () => { disposed = true; observer.disconnect(); clearTimeout(timer); controller.abort(); };
  }, [kind, attempt]);
  const data = state.status === "ready" ? state.data : null;
  const items = data?.items.filter((item) => source === "all" || item.sourceId === source) || [];
  const errors = data?.sources.filter((item) => item.state === "error") || [];
  const oldestUpdate = data?.sources.map((item) => item.updatedAt).filter((time): time is string => !!time).sort()[0];
  return <div ref={root} className={`activity-feed ${compact ? "activity-compact" : ""}`}>
    {state.status === "loading" && <div className="feed-loading" role="status"><span className="loading-line"/><span className="loading-line"/><span>正在读取{kind === "github" ? "公开活动" : "订阅内容"}…</span></div>}
    {state.status === "error" && <div className="feed-error" role="status"><p>{state.message}</p><button className="button button-outline" onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }}>重新加载</button></div>}
    {data && <>
      {kind === "rss" && <div className="source-filters" aria-label="按来源筛选">
        {[{ id: "all", label: "全部" }, ...data.sources].map((item) => <button key={item.id} aria-pressed={source === item.id} onClick={() => { setSource(item.id); setVisible(8); }}>{item.label}</button>)}
      </div>}
      {errors.length > 0 && <p className="source-warning" role="status">{errors.map((item) => item.label).join("、")} 暂时不可用，其他来源仍可阅读。</p>}
      {items.length ? <ol className="activity-list">{items.slice(0, visible).map((item) => <li key={item.id}>
        <div className="meta"><span>{item.source}</span>{item.date ? <time dateTime={item.date}>{new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit" }).format(new Date(item.date))}</time> : <span>时间未提供</span>}</div>
        <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title} <span aria-hidden="true">↗</span></a></h3>
        {item.summary && !compact && <p>{item.summary}</p>}
      </li>)}</ol> : <p className="empty-state" role="status">{errors.some((item) => item.id === source) ? "此来源暂时不可用，可切换到其他来源。" : "近期暂无公开内容。"}</p>}
      {!compact && visible < items.length && <button className="button button-outline load-more" onClick={() => setVisible((value) => value + 8)}>加载更多（还有 {items.length - visible} 条）</button>}
      {oldestUpdate && <p className="feed-updated">获取于 <time dateTime={oldestUpdate}>{new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(oldestUpdate))}</time> · 北京时间</p>}
    </>}
  </div>;
}
