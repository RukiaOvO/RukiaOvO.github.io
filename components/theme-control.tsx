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

function ModeIcon({ mode }: { mode: Mode }) {
  if (mode === "light") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>;
  if (mode === "dark") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v3m0 11v3M3.5 12h3m11 0h3M12 8a4 4 0 0 1 0 8 4 4 0 0 0 0-8Z" /></svg>;
}

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
      aria-label={`${label}模式`}
      title={`${label}模式`}
      onClick={() => {
        setMode(value);
        try { localStorage.setItem(key, value); } catch { /* Keep the in-memory choice for this page. */ }
        applyTheme(value);
        window.dispatchEvent(new Event("theme-preference"));
      }}
    ><ModeIcon mode={value} /><span className="sr-only">{label}</span></button>)}
  </div>;
}
