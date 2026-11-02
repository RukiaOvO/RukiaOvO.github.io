"use client";

import { useEffect, useState } from "react";

type Mode = "auto" | "light" | "dark";
const modes: ReadonlyArray<readonly [Mode, string]> = [["auto", "自动"], ["light", "浅色"], ["dark", "深色"]];
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
  const [mode, setMode] = useState<Mode>("auto");
  useEffect(() => {
    const sync = () => {
      const next = readMode();
      setMode(next);
      applyTheme(next);
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
  return <div className="theme-control" role="group" aria-label="外观主题">
    {modes.map(([value, label]) => <button
      key={value}
      type="button"
      className="theme-option"
      aria-pressed={mode === value}
      onClick={() => {
        setMode(value);
        try { localStorage.setItem(key, value); } catch { /* Keep the in-memory choice for this page. */ }
        applyTheme(value);
        window.dispatchEvent(new Event("theme-preference"));
      }}
    >{label}</button>)}
  </div>;
}
