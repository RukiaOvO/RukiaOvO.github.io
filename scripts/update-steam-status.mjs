import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const steamId = process.env.STEAM_ID || "76561198417009401";
const apiKey = process.env.STEAM_WEB_API_KEY;
const outputPath = process.env.STEAM_STATUS_OUTPUT || "static/data/steam-status.json";

const personaStates = {
  0: ["offline", "离线"],
  1: ["online", "在线"],
  2: ["busy", "忙碌"],
  3: ["away", "离开"],
  4: ["snooze", "暂离"],
  5: ["looking_to_trade", "想交易"],
  6: ["looking_to_play", "想玩游戏"],
};

const now = new Date().toISOString();

const withoutUpdatedAt = (payload) => {
  const { updatedAt, ...rest } = payload || {};
  return rest;
};

const writeStatus = async (payload) => {
  const normalizedPayload = {
    steamId,
    profileUrl: `https://steamcommunity.com/profiles/${steamId}/`,
    updatedAt: now,
    ...payload,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  try {
    const currentPayload = JSON.parse(await readFile(outputPath, "utf8"));
    if (JSON.stringify(withoutUpdatedAt(currentPayload)) === JSON.stringify(withoutUpdatedAt(normalizedPayload))) {
      return;
    }
  } catch (error) {
    // Missing or invalid JSON should be replaced with a fresh snapshot.
  }
  await writeFile(outputPath, `${JSON.stringify(normalizedPayload, null, 2)}\n`, "utf8");
};

if (!apiKey) {
  await writeStatus({
    ok: false,
    onlineState: "unknown",
    statusText: "STEAM_WEB_API_KEY 未配置",
    gameExtraInfo: "",
    gameId: "",
    avatar: "",
  });
  process.exit(0);
}

try {
  const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamids", steamId);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "RukiaOvO.github.io steam-status-updater",
    },
  });

  if (!response.ok) {
    throw new Error(`Steam Web API ${response.status}`);
  }

  const data = await response.json();
  const player = data?.response?.players?.[0];

  if (!player) {
    throw new Error("Steam Web API returned no player");
  }

  const [onlineState, statusText] = personaStates[player.personastate] || ["unknown", "未知"];

  await writeStatus({
    ok: true,
    personaName: player.personaname || "",
    onlineState,
    personaState: player.personastate,
    statusText,
    gameExtraInfo: player.gameextrainfo || "",
    gameId: player.gameid || "",
    avatar: player.avatarfull || player.avatarmedium || player.avatar || "",
    profileUrl: player.profileurl || `https://steamcommunity.com/profiles/${steamId}/`,
  });
} catch (error) {
  await writeStatus({
    ok: false,
    onlineState: "unknown",
    statusText: `Steam 状态更新失败：${error.message}`,
    gameExtraInfo: "",
    gameId: "",
    avatar: "",
  });
}
