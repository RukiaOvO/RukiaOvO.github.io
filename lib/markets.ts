export const MARKET_CACHE_TAG = "market-close-quotes";

export type MarketQuote = {
  id: "shanghai" | "star50" | "chinext" | "sp500" | "gold";
  name: string;
  symbol: string;
  currency: string;
  unit: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  asOf: string | null;
};

const tencentMarkets = [
  { id: "shanghai", name: "上证指数", symbol: "sh000001", label: "000001", currency: "CNY", unit: "点" },
  { id: "star50", name: "科创 50", symbol: "sh000688", label: "000688", currency: "CNY", unit: "点" },
  { id: "chinext", name: "创业板指", symbol: "sz399006", label: "399006", currency: "CNY", unit: "点" },
  { id: "sp500", name: "标普 500", symbol: "usINX", label: "^GSPC", currency: "USD", unit: "点" },
] as const;

function parseTencentTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function parseTencentIndexQuote(payload: string, market: (typeof tencentMarkets)[number]): MarketQuote {
  const line = payload.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`v_${market.symbol}=`));
  const match = line?.match(/^v_[^=]+="([^"]*)"$/);
  const fields = match?.[1].split("~") ?? [];
  const price = Number(fields[3]);
  const previousClose = Number(fields[4]);
  const timestampIndex = fields.findIndex((value, index) => index >= 28 && parseTencentTimestamp(value) !== null);
  const changeValue = Number(fields[timestampIndex + 1]);
  const percentValue = Number(fields[timestampIndex + 2]);
  const valid = Number.isFinite(price) && price > 0 && Number.isFinite(previousClose) && previousClose > 0;
  return {
    id: market.id,
    name: market.name,
    symbol: market.label,
    currency: market.currency,
    unit: market.unit,
    price: valid ? price : null,
    change: valid && Number.isFinite(changeValue) ? changeValue : valid ? price - previousClose : null,
    changePercent: valid && Number.isFinite(percentValue) ? percentValue : valid ? ((price - previousClose) / previousClose) * 100 : null,
    asOf: timestampIndex >= 0 ? parseTencentTimestamp(fields[timestampIndex]) : null,
  };
}

type GoldPayload = {
  currency?: unknown;
  price?: unknown;
  updatedAt?: unknown;
};

async function fetchTencentIndexes(): Promise<MarketQuote[]> {
  const response = await fetch("https://qt.gtimg.cn/q=sh000001,sh000688,sz399006,usINX", {
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 86_400, tags: [MARKET_CACHE_TAG] },
  });
  if (!response.ok) throw new Error("Index data provider returned an error");
  const payload = await response.text();
  return tencentMarkets.map((market) => parseTencentIndexQuote(payload, market));
}

async function fetchGoldSpot(): Promise<MarketQuote> {
  const response = await fetch("https://api.gold-api.com/price/XAU", {
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 86_400, tags: [MARKET_CACHE_TAG] },
  });
  if (!response.ok) throw new Error("Gold data provider returned an error");
  const payload = await response.json() as GoldPayload;
  const price = Number(payload.price);
  const asOf = typeof payload.updatedAt === "string" && !Number.isNaN(Date.parse(payload.updatedAt))
    ? new Date(payload.updatedAt).toISOString().slice(0, 10)
    : null;
  return {
    id: "gold",
    name: "黄金现货",
    symbol: "XAU/USD",
    currency: typeof payload.currency === "string" ? payload.currency : "USD",
    unit: "美元/盎司",
    price: Number.isFinite(price) ? price : null,
    change: null,
    changePercent: null,
    asOf,
  };
}

const unavailableIndexes: MarketQuote[] = tencentMarkets.map((market) => ({
  id: market.id,
  name: market.name,
  symbol: market.label,
  currency: market.currency,
  unit: market.unit,
  price: null,
  change: null,
  changePercent: null,
  asOf: null,
}));

async function tryIndexes(): Promise<MarketQuote[]> {
  try {
    return await fetchTencentIndexes();
  } catch {
    return unavailableIndexes;
  }
}

async function tryGold(): Promise<MarketQuote> {
  try {
    return await fetchGoldSpot();
  } catch {
    return {
      id: "gold",
      name: "黄金现货",
      symbol: "XAU/USD",
      currency: "USD",
      unit: "美元/盎司",
      price: null,
      change: null,
      changePercent: null,
      asOf: null,
    };
  }
}

export async function getMarketQuotes(): Promise<MarketQuote[]> {
  const [indexes, gold] = await Promise.all([tryIndexes(), tryGold()]);
  return [...indexes, gold];
}
