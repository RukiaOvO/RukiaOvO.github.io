"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { site } from "@/lib/site";

const weatherCodes: Record<number, [string, string]> = {
  0: ["晴", "☀"], 1: ["基本晴", "☀"], 2: ["局部多云", "⛅"], 3: ["阴", "☁"],
  45: ["雾", "☁"], 48: ["雾", "☁"], 51: ["小雨", "☂"], 53: ["小雨", "☂"], 55: ["中雨", "☂"],
  61: ["小雨", "☂"], 63: ["雨", "☂"], 65: ["大雨", "☂"], 71: ["小雪", "❄"], 73: ["下雪", "❄"],
  75: ["大雪", "❄"], 80: ["阵雨", "☂"], 81: ["阵雨", "☂"], 82: ["暴雨", "☂"], 95: ["雷雨", "⚡"],
};

type Weather = { city: string; icon: string; label: string; temp: string; detail: string };
type Game = { name?: string; appid?: number; imgIconUrl?: string; playtime2weeks?: number; playtimeForever?: number };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export function WeatherSteam() {
  const [city, setCity] = useState(site.weather.defaultCity);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [steam, setSteam] = useState<{ title: string; summary: string; online: boolean } | null>(null);
  const [steamError, setSteamError] = useState(false);
  const [games, setGames] = useState<Game[] | null>(null);
  const [gamesError, setGamesError] = useState(false);
  const [topGames, setTopGames] = useState<Game[] | null>(null);
  const [topGamesError, setTopGamesError] = useState(false);

  useEffect(() => {
    const selected = site.weather.cities.find((item) => item.label === city) || site.weather.cities[0];
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({ latitude: String(selected.latitude), longitude: String(selected.longitude), current: "temperature_2m,weather_code,wind_speed_10m", daily: "temperature_2m_max,temperature_2m_min", timezone: "auto" }).toString();
    getJson<{ current: { temperature_2m: number; weather_code: number; wind_speed_10m: number }; daily: { temperature_2m_max: number[]; temperature_2m_min: number[] } }>(url.toString())
      .then((data) => { const [label, icon] = weatherCodes[data.current.weather_code] || ["未知", "☁"]; setWeather({ city, icon, label, temp: `${Math.round(data.current.temperature_2m)}°C`, detail: `最高 ${Math.round(data.daily.temperature_2m_max[0])}° / 最低 ${Math.round(data.daily.temperature_2m_min[0])}° · 风速 ${Math.round(data.current.wind_speed_10m)} km/h` }); })
      .catch(() => { setWeather(null); setWeatherError(true); });
  }, [city]);

  useEffect(() => {
    const refresh = () => getJson<Record<string, unknown>>("/api/steam/status").then((data) => { if (data.ok === false && typeof data.statusText !== "string") throw new Error("Steam upstream unavailable"); const name = typeof data.personaName === "string" ? data.personaName : "Steam"; const game = typeof data.gameExtraInfo === "string" ? data.gameExtraInfo : ""; const status = typeof data.statusText === "string" ? data.statusText : "状态未知"; const onlineState = String(data.onlineState || "").toLowerCase(); const personaState = Number(data.personaState) || 0; setSteam({ title: game ? `${name} 正在玩 ${game}` : `${name} ${status}`, summary: game ? status : "", online: Boolean(game) || onlineState === "online" || personaState > 0 }); setSteamError(false); }).catch(() => { setSteam(null); setSteamError(true); });
    refresh(); const timer = window.setInterval(refresh, 30_000); return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { getJson<{ ok?: boolean; games?: Game[] }>("/api/steam/games").then((data) => { setGames(data.ok && Array.isArray(data.games) ? data.games.slice(0, 5) : []); setGamesError(!data.ok || !Array.isArray(data.games)); }).catch(() => { setGames([]); setGamesError(true); }); }, []);
  useEffect(() => { getJson<{ ok?: boolean; games?: Game[] }>("/api/steam/top-games").then((data) => { setTopGames(data.ok && Array.isArray(data.games) ? data.games.slice(0, 3) : []); setTopGamesError(!data.ok || !Array.isArray(data.games)); }).catch(() => { setTopGames([]); setTopGamesError(true); }); }, []);

  return <div className="dashboard-live">
    <section className="panel live-card" aria-labelledby="weather-title"><div className="live-heading"><div><p className="eyebrow">WEATHER</p><h2 id="weather-title">天气</h2></div><select aria-label="天气城市" value={city} onChange={(event) => { setCity(event.target.value); setWeather(null); setWeatherError(false); }}>{site.weather.cities.map((item) => <option key={item.label}>{item.label}</option>)}</select></div>{weather ? <div className="weather-value"><span aria-hidden="true">{weather.icon}</span><div><strong>{weather.temp}</strong><p>{weather.city} · {weather.label}</p><small>{weather.detail}</small></div></div> : <p className="live-state">{weatherError ? "天气暂时无法获取。" : "正在获取天气…"}</p>}</section>
    <section className="panel live-card" aria-labelledby="steam-title"><div className="live-heading"><div><p className="eyebrow">STEAM</p><h2 id="steam-title">在线状态</h2></div><a href={site.steam.profileUrl} target="_blank" rel="noreferrer">个人资料 ↗</a></div>{steam ? <div className="steam-value"><span className={`status-dot ${steam.online ? "status-dot--online" : "status-dot--offline"}`} /><div><strong>{steam.title}</strong>{steam.summary && <p>{steam.summary}</p>}</div></div> : <p className="live-state">{steamError ? "Steam 接口无响应，请检查 Worker 地址与 Steam API Key 配置。" : "正在获取 Steam 状态…"}</p>}<div className="steam-games"><h3>游戏时长前三</h3>{topGames === null ? <p className="live-state">正在获取游戏记录…</p> : topGamesError ? <p className="live-state">时长前三需要 Steam API Key 或支持累计时长的 Worker。</p> : topGames.length ? <div className="steam-game-list">{topGames.map((game, index) => <div className="steam-game-row" key={`top-${game.appid}-${game.name}`}><span className="steam-game-rank" aria-label={`第 ${index + 1} 名`}>{index + 1}</span>{game.imgIconUrl && <Image src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.imgIconUrl}.jpg`} alt="" width={32} height={32} unoptimized /> }<div><strong>{game.name || "未知游戏"}</strong>{game.playtimeForever ? <span>累计 {(game.playtimeForever / 60).toFixed(1)} 小时</span> : <span>累计时长未知</span>}</div></div>)}</div> : <p className="live-state">暂无可用的游戏时长记录。</p>}</div><div className="steam-games"><h3>最近游玩</h3>{games === null ? <p className="live-state">正在获取游戏记录…</p> : gamesError ? <p className="live-state">游戏记录接口无响应，请检查 Worker 配置。</p> : games.length ? <div className="steam-game-list">{games.map((game) => <div className="steam-game-row" key={`${game.appid}-${game.name}`}>{game.imgIconUrl && <Image src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.imgIconUrl}.jpg`} alt="" width={32} height={32} unoptimized /> }<div><strong>{game.name || "未知游戏"}</strong>{game.playtime2weeks ? <span>最近两周 {(game.playtime2weeks / 60).toFixed(1)} 小时</span> : null}</div></div>)}</div> : <p className="live-state">最近两周没有游戏记录。</p>}</div></section>
  </div>;
}
