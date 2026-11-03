import { NextResponse } from "next/server";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function steamApi(kind: "status" | "games") {
  const key = process.env.STEAM_API_KEY;
  if (!key) return null;
  const steamId = process.env.STEAM_ID || "76561198417009401";
  const endpoint = kind === "status"
    ? "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
    : "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/";
  const url = new URL(endpoint);
  url.searchParams.set("key", key);
  url.searchParams.set(kind === "status" ? "steamids" : "steamid", steamId);
  if (kind === "games") url.searchParams.set("count", "5");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000), redirect: "error" });
  if (!response.ok) throw new Error("Steam API request failed");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("response" in payload) || !payload.response || typeof payload.response !== "object") throw new Error("Steam API response was invalid");
  if (kind === "games") {
    const games = "games" in payload.response && Array.isArray(payload.response.games) ? payload.response.games : [];
    return { ok: true, games: games.map((game) => ({ appid: game.appid, name: game.name, imgIconUrl: game.img_icon_url, playtime2weeks: game.playtime_2weeks })).filter((game) => typeof game.appid === "number") };
  }
  const players = "players" in payload.response && Array.isArray(payload.response.players) ? payload.response.players : [];
  const player = players[0];
  if (!player) return { ok: false, statusText: "Steam profile is private or unavailable." };
  const states = ["offline", "online", "busy", "away", "snooze", "looking to trade", "looking to play"];
  const personaState = Number(player.personastate) || 0;
  return { ok: true, personaName: player.personaname, statusText: states[personaState] || "online", onlineState: personaState === 0 ? "offline" : "online", personaState, gameExtraInfo: player.gameextrainfo || "" };
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "status" && kind !== "games") return NextResponse.json({ error: "Unknown Steam resource." }, { status: 404 });
  const endpoint = kind === "status" ? process.env.STEAM_STATUS_URL || site.steam.workerUrl : process.env.STEAM_GAMES_URL || site.steam.recentGamesUrl;
  try {
    const direct = await steamApi(kind);
    if (direct) return NextResponse.json(direct, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    const url = new URL(endpoint);
    url.searchParams.set("t", new URL(_request.url).searchParams.get("t") || String(Date.now()));
    if (kind === "games") url.searchParams.set("count", "5");
    const upstream = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000), redirect: "error" });
    if (!upstream.ok) return NextResponse.json({ error: "Steam service is temporarily unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    const data: unknown = await upstream.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Steam service is temporarily unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
