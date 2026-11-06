"use client";

import { useEffect, useState } from "react";
import type { MarketQuote } from "@/lib/markets";

type MarketResponse = { ok?: boolean; markets?: MarketQuote[] };

function formatPrice(market: MarketQuote): string {
  if (market.price === null) return "暂不可用";
  const digits = market.id === "gold" ? 2 : 2;
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(market.price);
}

export function MarketQuotes() {
  const [markets, setMarkets] = useState<MarketQuote[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/markets", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Market quotes unavailable");
        return response.json() as Promise<MarketResponse>;
      })
      .then((data) => {
        if (!Array.isArray(data.markets)) throw new Error("Market quote response was invalid");
        setMarkets(data.markets);
      })
      .catch(() => { if (!controller.signal.aborted) { setMarkets([]); setFailed(true); } });
    return () => controller.abort();
  }, []);

  return <section className="panel live-card market-card" aria-labelledby="markets-title">
    <div className="live-heading"><div><p className="eyebrow">MARKET SNAPSHOT</p><h2 id="markets-title">今日行情</h2></div><span className="market-refresh-note">每日更新</span></div>
    {markets === null ? <p className="live-state">正在获取今日行情…</p> : failed ? <p className="live-state">行情暂时无法获取，请稍后重试。</p> : <div className="market-quote-list">
      {markets.map((market) => <div className="market-quote" key={market.id}>
        <div className="market-quote-name"><span className={`market-icon market-icon-${market.id}`} aria-hidden="true">{market.id === "gold" ? "Au" : market.id === "sp500" ? "S&P" : market.id === "star50" ? "科" : market.id === "chinext" ? "创" : "沪"}</span><div><strong>{market.name}</strong><span>{market.symbol}</span></div></div>
        <div className="market-quote-price"><strong>{formatPrice(market)}</strong><small>{market.unit}</small></div>
        <div className={`market-quote-change ${market.changePercent === null ? "market-flat" : market.changePercent > 0 ? "market-up" : market.changePercent < 0 ? "market-down" : "market-flat"}`}>
          <strong>{market.changePercent === null ? "—" : `${market.changePercent > 0 ? "+" : ""}${market.changePercent.toFixed(2)}%`}</strong><small>{market.price === null ? "暂不可用" : market.asOf || "今日"}</small>
        </div>
      </div>)}
    </div>}
    <p className="market-source-note">指数：<a href="https://gu.qq.com/" target="_blank" rel="noreferrer">腾讯行情</a>；黄金：<a href="https://gold-api.com/" target="_blank" rel="noreferrer">Gold API</a>。每日刷新。</p>
  </section>;
}
