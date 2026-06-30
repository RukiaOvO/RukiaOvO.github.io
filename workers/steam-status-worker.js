const DEFAULT_STEAM_ID = "76561198417009401";
const CACHE_TTL_SECONDS = 25;

const personaStates = {
  0: ["offline", "离线"],
  1: ["online", "在线"],
  2: ["busy", "忙碌"],
  3: ["away", "离开"],
  4: ["snooze", "暂离"],
  5: ["looking_to_trade", "想交易"],
  6: ["looking_to_play", "想玩游戏"],
};

const json = (payload, init = {}, origin = "*") =>
  new Response(JSON.stringify(payload, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${CACHE_TTL_SECONDS}`,
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
      vary: "Origin",
      ...(init.headers || {}),
    },
  });

const resolveOrigin = (request, env) => {
  const origin = request.headers.get("Origin");
  const allowedOrigins = String(env.ALLOWED_ORIGINS || "https://rukiaovo.github.io")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origin) return allowedOrigins[0] || "*";
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return origin;
  return allowedOrigins[0] || "*";
};

const normalizeSteamPlayer = (player, steamId) => {
  const [onlineState, statusText] = personaStates[player.personastate] || ["unknown", "未知"];

  return {
    ok: true,
    steamId,
    profileUrl: player.profileurl || `https://steamcommunity.com/profiles/${steamId}/`,
    updatedAt: new Date().toISOString(),
    personaName: player.personaname || "",
    onlineState,
    personaState: player.personastate,
    statusText,
    gameExtraInfo: player.gameextrainfo || "",
    gameId: player.gameid || "",
    avatar: player.avatarfull || player.avatarmedium || player.avatar || "",
    source: "cloudflare-worker",
  };
};

export default {
  async fetch(request, env, ctx) {
    const origin = resolveOrigin(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "content-type",
          vary: "Origin",
        },
      });
    }

    if (request.method !== "GET") {
      return json({ ok: false, statusText: "Method Not Allowed" }, { status: 405 }, origin);
    }

    if (!env.STEAM_WEB_API_KEY) {
      return json({ ok: false, onlineState: "unknown", statusText: "STEAM_WEB_API_KEY 未配置" }, { status: 500 }, origin);
    }

    const steamId = env.STEAM_ID || DEFAULT_STEAM_ID;
    const cacheUrl = new URL(request.url);
    cacheUrl.search = `steamid=${encodeURIComponent(steamId)}`;
    cacheUrl.searchParams.set("origin", origin);
    const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;

    try {
      const apiUrl = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/");
      apiUrl.searchParams.set("key", env.STEAM_WEB_API_KEY);
      apiUrl.searchParams.set("steamids", steamId);

      const response = await fetch(apiUrl, {
        headers: {
          accept: "application/json",
          "user-agent": "RukiaOvO.github.io steam-status-worker",
        },
      });

      if (!response.ok) throw new Error(`Steam Web API ${response.status}`);

      const data = await response.json();
      const player = data?.response?.players?.[0];
      if (!player) throw new Error("Steam Web API returned no player");

      const workerResponse = json(normalizeSteamPlayer(player, steamId), {}, origin);
      ctx.waitUntil(caches.default.put(cacheKey, workerResponse.clone()));
      return workerResponse;
    } catch (error) {
      return json(
        {
          ok: false,
          steamId,
          onlineState: "unknown",
          statusText: `Steam 状态更新失败：${error.message}`,
          gameExtraInfo: "",
          updatedAt: new Date().toISOString(),
          source: "cloudflare-worker",
        },
        { status: 502 },
        origin
      );
    }
  },
};
