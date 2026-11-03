import { NextResponse } from "next/server";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function steamApi(kind: "status" | "games" | "top-games") {
  const key = process.env.STEAM_API_KEY;
  if (!key) return null;
  const steamId = process.env.STEAM_ID || "76561198417009401";
  const endpoint = kind === "status"
    ? "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
    : kind === "games" ? "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/" : "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/";
  const url = new URL(endpoint);
  url.searchParams.set("key", key);
  url.searchParams.set(kind === "status" ? "steamids" : "steamid", steamId);
  if (kind === "games") url.searchParams.set("count", "5");
  if (kind === "top-games") { url.searchParams.set("include_appinfo", "1"); url.searchParams.set("include_played_free_games", "1"); }
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000), redirect: "error" });
  if (!response.ok) throw new Error("Steam API request failed");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("response" in payload) || !payload.response || typeof payload.response !== "object") throw new Error("Steam API response was invalid");
  if (kind === "games" || kind === "top-games") {
    const games = "games" in payload.response && Array.isArray(payload.response.games) ? payload.response.games : [];
    const normalized = games.map((game) => ({ appid: game.appid, name: game.name, imgIconUrl: game.img_icon_url, playtime2weeks: game.playtime_2weeks, playtimeForever: game.playtime_forever })).filter((game) => typeof game.appid === "number");
    return { ok: true, games: kind === "top-games" ? normalized.sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0)).slice(0, 3) : normalized };
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
  if (kind !== "status" && kind !== "games" && kind !== "top-games") return NextResponse.json({ error: "Unknown Steam resource." }, { status: 404 });
  const endpoint = kind === "status" ? process.env.STEAM_STATUS_URL || site.steam.workerUrl : kind === "games" ? process.env.STEAM_GAMES_URL || site.steam.recentGamesUrl : process.env.STEAM_TOP_GAMES_URL || site.steam.topGamesUrl;
  try {
    const direct = await steamApi(kind);
    if (direct) return NextResponse.json(direct, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    const url = new URL(endpoint);
    url.searchParams.set("t", new URL(_request.url).searchParams.get("t") || String(Date.now()));
    if (kind === "games") url.searchParams.set("count", "5");
    if (kind === "top-games") url.searchParams.set("count", "3");
    const upstream = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000), redirect: "error" });
    if (!upstream.ok) return NextResponse.json({ error: "Steam service is temporarily unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    const data: unknown = await upstream.json();
    if (kind === "top-games") {
      if (!data || typeof data !== "object" || !("games" in data) || !Array.isArray(data.games)) return NextResponse.json({ error: "Steam top games response was invalid." }, { status: 502, headers: { "Cache-Control": "no-store" } });
      const games = data.games.map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const game = entry as Record<string, unknown>;
        const playtimeForever = Number(game.playtimeForever ?? game.playtime_forever);
        if (!Number.isFinite(playtimeForever)) return null;
        return { appid: game.appid, name: game.name, imgIconUrl: game.imgIconUrl ?? game.img_icon_url, playtimeForever };
      }).filter((game): game is NonNullable<typeof game> => !!game);
      if (games.length === 0) return NextResponse.json({ error: "Steam top games response has no lifetime playtime." }, { status: 502, headers: { "Cache-Control": "no-store" } });
      return NextResponse.json({ ok: true, games: games.sort((a, b) => b.playtimeForever - a.playtimeForever).slice(0, 3) }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Steam service is temporarily unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
