"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

type Conditions = {
  temperature: number;
  wind: number;
  gust: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  pressure: number;
};

function direction(degrees: number) {
  return ["北", "东北", "东", "东南", "南", "西南", "西", "西北"][Math.round(degrees / 45) % 8] || "北";
}

export function FishingConditions() {
  const [city, setCity] = useState(site.weather.defaultCity);
  const [conditions, setConditions] = useState<Conditions | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const selected = site.weather.cities.find((item) => item.label === city) || site.weather.cities[0]!;
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(selected.latitude), longitude: String(selected.longitude),
      current: "temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,cloud_cover,surface_pressure",
      timezone: "auto",
    }).toString();
    let active = true;
    fetch(url, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("weather unavailable");
        return response.json() as Promise<{ current: Record<string, number> }>;
      })
      .then(({ current }) => {
        if (!active) return;
        const values = [current.temperature_2m, current.wind_speed_10m, current.wind_gusts_10m, current.wind_direction_10m, current.precipitation, current.cloud_cover, current.surface_pressure];
        if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) throw new Error("invalid weather data");
        setConditions({ temperature: current.temperature_2m!, wind: current.wind_speed_10m!, gust: current.wind_gusts_10m!, windDirection: current.wind_direction_10m!, precipitation: current.precipitation!, cloudCover: current.cloud_cover!, pressure: current.surface_pressure! });
        setFailed(false);
      })
      .catch(() => { if (active) { setConditions(null); setFailed(true); } });
    return () => { active = false; };
  }, [city]);

  const summary = conditions
    ? conditions.wind >= 25 || conditions.gust >= 35 || conditions.precipitation >= 1
      ? "风雨较明显，岸边抛投和出行需多留意。"
      : "风况较平稳，可结合目标水域观察鱼情。"
    : "正在获取作钓环境…";

  return <section className="panel live-card fishing-card" aria-labelledby="fishing-title">
    <div className="live-heading"><div><p className="eyebrow">LURE CONDITIONS</p><h2 id="fishing-title">路亚鱼情</h2></div><select aria-label="路亚环境城市" value={city} onChange={(event) => { setCity(event.target.value); setConditions(null); setFailed(false); }}>{site.weather.cities.map((item) => <option key={item.label}>{item.label}</option>)}</select></div>
    {conditions ? <>
      <p className="fishing-summary">{city} · {summary}</p>
      <dl className="fishing-metrics">
        <div><dt>气温</dt><dd>{Math.round(conditions.temperature)}°C</dd></div>
        <div><dt>风况</dt><dd>{direction(conditions.windDirection)}风 {Math.round(conditions.wind)} km/h</dd></div>
        <div><dt>阵风 / 降水</dt><dd>{Math.round(conditions.gust)} / {conditions.precipitation.toFixed(1)} mm</dd></div>
        <div><dt>云量 / 气压</dt><dd>{Math.round(conditions.cloudCover)}% / {Math.round(conditions.pressure)} hPa</dd></div>
      </dl>
    </> : <p className="live-state">{failed ? "环境数据暂时无法获取。" : "正在获取作钓环境…"}</p>}
    <p className="fishing-disclaimer">天气与风况仅作路亚环境参考，不代表实时鱼口或鱼获预测。</p>
  </section>;
}
