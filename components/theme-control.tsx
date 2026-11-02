"use client";

import { useEffect, useRef } from "react";

type Mode = "auto" | "light" | "dark";
const key = "rukia-theme";
function readMode(): Mode {
  try { const mode = localStorage.getItem(key); if (mode === "light" || mode === "dark") return mode; } catch { /* Storage can be disabled. */ }
  return "auto";
}
function applyTheme(mode: Mode) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  document.documentElement.dataset.theme = mode === "auto" ? (hour >= 6 && hour < 18 ? "light" : "dark") : mode;
}

export const themeScript = `(function(){try{var m=localStorage.getItem('${key}');var h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'numeric',hourCycle:'h23'}).format(new Date()));document.documentElement.dataset.theme=(m==='light'||m==='dark')?m:(h>=6&&h<18?'light':'dark')}catch(e){}})();`;

export function ThemeControl() {
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const sync = () => {
      const mode = readMode();
      if (select.current) select.current.value = mode;
      applyTheme(mode);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("theme-preference", sync);
    sync();
    const interval = window.setInterval(sync, 60_000);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", sync);
      window.removeEventListener("theme-preference", sync);
    };
  }, []);
  return <label className="theme-control"><span className="sr-only">外观主题</span>
    <select ref={select} aria-label="外观主题" defaultValue="auto" onChange={(event) => {
      const next = event.target.value as Mode;
      try { localStorage.setItem(key, next); } catch { /* Keep the in-memory choice for this page. */ }
      applyTheme(next);
      window.dispatchEvent(new Event("theme-preference"));
    }}>
      <option value="auto">◐ 北京时间</option><option value="light">☀ 浅色</option><option value="dark">☾ 深色</option>
    </select>
  </label>;
}
