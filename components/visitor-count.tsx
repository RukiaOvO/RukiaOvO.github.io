"use client";

import { useEffect, useState } from "react";
export function VisitorCount() {
  const [count, setCount] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const cached = sessionStorage.getItem("site-visitor-count");
        if (cached) { setCount(cached); return; }
      } catch { /* Storage may be unavailable; the live counter still works. */ }
      try {
        const response = await fetch("/api/visitor", { cache: "no-store" });
        const payload = await response.json() as { ok?: boolean; count?: unknown; visitors?: unknown; value?: unknown };
        const value = payload.count ?? payload.visitors ?? payload.value;
        if (!response.ok || (payload.ok === false) || value === undefined || value === null || value === "") throw new Error("visitor count unavailable");
        const display = String(value);
        setCount(display);
        try { sessionStorage.setItem("site-visitor-count", display); } catch { /* Ignore unavailable session storage. */ }
      } catch {
        setFallback(true);
      }
    };
    void load();
  }, []);

  return <span className="visitor-count" aria-label="访客数量">
    <span className="visitor-count-icon" aria-hidden="true">◉</span>
    <span>访客</span>
    {count ? <strong>{count}</strong> : fallback ? <strong>—</strong> : <span className="visitor-count-loading" aria-label="加载中">…</span>}
  </span>;
}
