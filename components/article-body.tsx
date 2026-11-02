"use client";

import { useEffect, useRef } from "react";

export function ArticleBody({ html }: { html: string }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const buttons: HTMLButtonElement[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    container.current?.querySelectorAll("pre").forEach((pre) => {
      const code = pre.querySelector("code");
      if (!code) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-code";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制代码");
      button.setAttribute("aria-live", "polite");
      button.onclick = async () => {
        try { await navigator.clipboard.writeText(code.textContent || ""); button.textContent = "已复制"; }
        catch { button.textContent = "复制失败，请手动选择"; }
        timers.push(setTimeout(() => { button.textContent = "复制"; }, 2500));
      };
      pre.appendChild(button);
      buttons.push(button);
    });
    return () => { buttons.forEach((button) => button.remove()); timers.forEach(clearTimeout); };
  }, [html]);
  return <div ref={container} className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
