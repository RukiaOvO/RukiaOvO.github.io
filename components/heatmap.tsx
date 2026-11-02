"use client";

import { useEffect, useRef, useState } from "react";

export function Heatmap({ src, username }: { src: string; username: string }) {
  const image = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    if (status !== "loading") return;
    let timer: number | undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && image.current) {
        timer = window.setTimeout(() => setStatus("error"), 12_000);
        image.current.src = src;
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    if (image.current) observer.observe(image.current);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [src, status]);
  return <div className="heatmap" data-state={status}>
    {status === "loading" && <p role="status" className="muted">正在加载贡献记录…</p>}
    {status === "error" && <p role="status" className="muted">贡献记录暂时无法加载。<a href={`https://github.com/${username}`}>在 GitHub 查看 ↗</a></p>}
    {/* The provider serves SVG; keep it out of the image optimization pipeline. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={image} alt={`${username} 的 GitHub 贡献热力图`} width="720" height="112"
      style={{ display: status === "error" ? "none" : "block", opacity: status === "ready" ? 1 : 0 }}
      referrerPolicy="no-referrer" onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />
  </div>;
}
