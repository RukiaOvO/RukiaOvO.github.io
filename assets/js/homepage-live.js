(() => {
  const root = document.querySelector(".profile-home, .activity-page, .posts-page");
  if (!root) return;

  const applyBeijingTimeTheme = () => {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hour12: false,
        timeZone: "Asia/Shanghai",
      })
        .formatToParts(new Date())
        .find((part) => part.type === "hour")?.value || 0
    );
    const isDaytime = hour >= 6 && hour < 18;
    document.documentElement.classList.toggle("theme-day", isDaytime);
    document.documentElement.classList.toggle("theme-night", !isDaytime);
  };

  const weatherCodes = {
    0: ["Clear", "☀"],
    1: ["Mainly clear", "☀"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁"],
    45: ["Fog", "☁"],
    48: ["Depositing rime fog", "☁"],
    51: ["Light drizzle", "☂"],
    53: ["Drizzle", "☂"],
    55: ["Heavy drizzle", "☂"],
    61: ["Light rain", "☂"],
    63: ["Rain", "☂"],
    65: ["Heavy rain", "☂"],
    71: ["Light snow", "❄"],
    73: ["Snow", "❄"],
    75: ["Heavy snow", "❄"],
    80: ["Rain showers", "☂"],
    81: ["Heavy showers", "☂"],
    82: ["Violent showers", "☂"],
    95: ["Thunderstorm", "⚡"],
    96: ["Thunderstorm with hail", "⚡"],
    99: ["Heavy thunderstorm with hail", "⚡"],
  };

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
      : "";

  const formatTime = (value) =>
    value
      ? new Date(value).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const fetchJsonIfAvailable = async (url, timeoutMs = 3000) => {
    if (!url) return null;
    try {
      const response = await fetchWithTimeout(url, { cache: "no-store" }, timeoutMs);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  const fetchTextWithFallback = async (url, proxies = [""], timeoutMs = 5000) => {
    for (const proxy of proxies.length ? proxies : [""]) {
      const requestUrl = proxy ? `${proxy}${encodeURIComponent(url)}` : url;
      try {
        const response = await fetchWithTimeout(requestUrl, { cache: "no-store" }, timeoutMs);
        if (response.ok) return await response.text();
      } catch {
        // next proxy
      }
    }
    throw new Error("fetch failed");
  };

  const loadVisitorCount = async () => {
    const badge = root.querySelector("[data-visitor-count-url]");
    if (!badge) return;

    const countUrl = badge.dataset.visitorCountUrl;
    const fallbackUrl = badge.dataset.visitorBadgeUrl;
    const countTarget = badge.querySelector("[data-visitor-count]");
    const fallbackImage = badge.querySelector("[data-visitor-fallback]");
    if (!countUrl || !countTarget) return;

    try {
      const url = new URL(countUrl);
      url.searchParams.set("t", Date.now());
      const payload = await fetchJsonIfAvailable(url.toString(), 5000);
      const count = payload?.count ?? payload?.visitors ?? payload?.value;
      if (payload?.ok && count !== undefined && count !== null && count !== "") {
        countTarget.textContent = String(count);
        countTarget.hidden = false;
        return;
      }
    } catch {
      // fall back to loading the original badge image below
    }

    if (fallbackImage && fallbackUrl) {
      fallbackImage.src = fallbackUrl;
    }
  };

  const readJsonScript = (id, fallback = []) => {
    const source = document.getElementById(id);
    if (!source) return fallback;
    try {
      return JSON.parse(source.textContent || "[]");
    } catch {
      return fallback;
    }
  };

  const getBeijingClock = (date = new Date()) => {
    const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return {
      year: String(shifted.getUTCFullYear()),
      month: String(shifted.getUTCMonth() + 1).padStart(2, "0"),
      day: String(shifted.getUTCDate()).padStart(2, "0"),
      hour: String(shifted.getUTCHours()).padStart(2, "0"),
      minute: String(shifted.getUTCMinutes()).padStart(2, "0"),
      second: String(shifted.getUTCSeconds()).padStart(2, "0"),
    };
  };

  const getBeijingHourKey = () => {
    const { year, month, day, hour } = getBeijingClock();
    return `${year}-${month}-${day}-${hour}`;
  };

  const getNextBeijingHourDelay = () => {
    const now = Date.now();
    const beijingNow = now + 8 * 60 * 60 * 1000;
    const nextHourBeijing = Math.floor(beijingNow / 3_600_000) * 3_600_000 + 3_600_000 + 5_000;
    return Math.max(60_000, nextHourBeijing - beijingNow);
  };

  const heatmapState = {
    timer: null,
    lastKey: "",
  };

  const scheduleGitHubHeatmapRefresh = () => {
    if (heatmapState.timer) {
      window.clearTimeout(heatmapState.timer);
    }
    heatmapState.timer = window.setTimeout(() => {
      refreshGitHubHeatmap();
      scheduleGitHubHeatmapRefresh();
    }, getNextBeijingHourDelay());
  };

  const refreshGitHubHeatmap = () => {
    const image = root.querySelector("[data-github-heatmap]");
    if (!image) return;

    const provider = image.dataset.heatmapProvider?.replace(/\/$/, "");
    const color = image.dataset.heatmapColor;
    const user = image.dataset.heatmapUser;
    if (!provider || !color || !user) return;

    const key = getBeijingHourKey();
    if (heatmapState.lastKey === key) return;

    const url = new URL(`${provider}/${encodeURIComponent(color)}/${encodeURIComponent(user)}`);
    url.searchParams.set("v", key);
    image.src = url.toString();
    heatmapState.lastKey = key;
  };

  const loadWeather = async () => {
    const card = root.querySelector("[data-weather]");
    const select = root.querySelector("[data-weather-select]");
    if (!card || !select) return;

    const icon = card.querySelector("[data-weather-icon]");
    const temp = card.querySelector("[data-weather-temp]");
    const desc = card.querySelector("[data-weather-desc]");
    const detail = card.querySelector("[data-weather-detail]");

    const update = async () => {
      const [latitude, longitude] = select.value.split(",");
      const city = select.options[select.selectedIndex]?.textContent?.trim() || "";
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", latitude);
      url.searchParams.set("longitude", longitude);
      url.searchParams.set("current_weather", "true");
      url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
      url.searchParams.set("timezone", "auto");

      try {
        const response = await fetchWithTimeout(url, { cache: "no-store" }, 8000);
        if (!response.ok) throw new Error(`Weather ${response.status}`);
        const data = await response.json();
        const current = data.current_weather;
        const daily = data.daily || {};
        const [label, symbol] = weatherCodes[current.weathercode] || ["Unknown", "☁"];
        icon.textContent = symbol;
        temp.textContent = `${Math.round(current.temperature)}°C`;
        desc.textContent = `${city} · ${label}`;
        detail.textContent = `High ${Math.round(daily.temperature_2m_max?.[0] ?? current.temperature)}° / Low ${Math.round(daily.temperature_2m_min?.[0] ?? current.temperature)}° · Wind ${Math.round(current.windspeed)} km/h · ${formatDate(current.time)}`;
      } catch {
        icon.textContent = "☁";
        temp.textContent = "--°C";
        desc.textContent = `${city} weather unavailable`;
        detail.textContent = "Open-Meteo request failed";
      }
    };

    select.addEventListener("change", update);
    await update();
  };

  const loadGitHubEvents = async () => {
    const target = root.querySelector("[data-github-events]");
    const username = root.dataset.githubUser;
    if (!target || !username) return;

    const renderEvents = (events) => {
      target.innerHTML = "";
      events.forEach((event) => {
        const repo = event.repo?.name || username;
        const payload = event.payload || {};
        const item = document.createElement("article");
        item.className = "github-event";

        let title = event.type.replace("Event", "");
        let detail = repo;
        let commits = "";
        let href = `https://github.com/${repo}`;

        if (event.type === "PushEvent") {
          const branch = payload.ref?.replace("refs/heads/", "") || "unknown";
          const visibleCommits = Array.isArray(payload.commits) ? payload.commits : [];
          const commitCount = Number(payload.size ?? payload.distinct_size ?? visibleCommits.length);
          title = `Push ${branch}`;
          detail = commitCount > 0 ? `${repo} ${commitCount} commit${commitCount > 1 ? "s" : ""}` : `${repo} push`;
          commits = visibleCommits
            .slice(0, 3)
            .map((commit) => `<li><code>${escapeHtml((commit.sha || "").slice(0, 7))}</code><span>${escapeHtml(commit.message || "Commit")}</span></li>`)
            .join("");
          href = payload.head ? `https://github.com/${repo}/commit/${payload.head}` : href;
        } else if (event.type === "PullRequestEvent") {
          title = `Pull Request ${payload.action || "update"}`;
          detail = payload.pull_request?.title || repo;
          href = payload.pull_request?.html_url || href;
        } else if (event.type === "IssuesEvent") {
          title = `Issue ${payload.action || "update"}`;
          detail = payload.issue?.title || repo;
          href = payload.issue?.html_url || href;
        } else if (event.type === "IssueCommentEvent") {
          title = `Issue Comment ${payload.action || "comment"}`;
          detail = payload.issue?.title || repo;
          href = payload.comment?.html_url || payload.issue?.html_url || href;
        } else if (event.type === "CreateEvent") {
          title = `Create ${payload.ref_type || "resource"}`;
          detail = payload.ref ? `${repo} ${payload.ref}` : repo;
        } else if (event.type === "ReleaseEvent") {
          title = `Release ${payload.action || "publish"}`;
          detail = payload.release?.name || payload.release?.tag_name || repo;
          href = payload.release?.html_url || href;
        } else if (event.type === "WatchEvent") {
          title = "Star";
        }

        item.innerHTML = `
          <a href="${href}" target="_blank" rel="noopener noreferrer">
            <time>${formatTime(event.created_at)}</time>
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(detail)}</p>
            ${commits ? `<ul class="commit-list">${commits}</ul>` : ""}
          </a>
        `;
        target.appendChild(item);
      });

      if (!target.children.length) {
        target.innerHTML = '<p class="empty-state">No public GitHub activity</p>';
      }
    };

    try {
      const limit = Number(root.dataset.githubEventsLimit || 10);
      const workerEvents = await fetchJsonIfAvailable(root.dataset.githubWorkerUrl, 5000);
      if (Array.isArray(workerEvents?.events) && workerEvents.events.length) {
        renderEvents(workerEvents.events.slice(0, limit));
        return;
      }

      const response = await fetchWithTimeout(
        `https://api.github.com/users/${username}/events/public?per_page=${Math.max(limit, 10)}`,
        { headers: { Accept: "application/vnd.github+json" } },
        8000
      );

      if (response.ok) {
        renderEvents((await response.json()).slice(0, limit));
        return;
      }

      const staticEvents = await fetchJsonIfAvailable(root.dataset.githubEventsUrl);
      if (Array.isArray(staticEvents?.events) && staticEvents.events.length) {
        renderEvents(staticEvents.events.slice(0, limit));
        return;
      }

      throw new Error(`GitHub ${response.status}`);
    } catch {
      target.innerHTML = '<p class="empty-state">GitHub API temporarily unavailable</p>';
    }
  };

  const loadFeeds = async () => {
    const target = root.querySelector("[data-feed-list]");
    const status = root.querySelector("[data-feed-status]");
    if (!target) return;

    const feedsPayload = readJsonScript("profile-feeds");
    const proxiesPayload = readJsonScript("profile-rss-proxies");
    const feeds = Array.isArray(feedsPayload) ? feedsPayload : [];
    const proxies = Array.isArray(proxiesPayload) && proxiesPayload.length
      ? proxiesPayload
      : ["https://api.allorigins.win/raw?url="];
    const filter = root.querySelector("[data-feed-filter]");
    let activeCategory = filter?.querySelector(".is-active")?.dataset.feedCategory || filter?.querySelector("button")?.dataset.feedCategory || "All";
    let items = [];
    let isLoading = true;

    const renderItems = () => {
      const visibleItems = activeCategory === "All" || activeCategory === "全部" ? items : items.filter((item) => item.category === activeCategory);
      target.innerHTML = "";

      if (isLoading) {
        target.innerHTML = `<p class="empty-state">${escapeHtml(activeCategory)} RSS loading...</p>`;
        return;
      }

      if (!visibleItems.length) {
        target.innerHTML = `<p class="empty-state">${escapeHtml(activeCategory)} has no items.</p>`;
        return;
      }

      visibleItems
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20)
        .forEach((item) => {
          const link = document.createElement("a");
          link.href = item.link;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.dataset.feedCategory = item.category;
          link.innerHTML = `<time>${escapeHtml(item.category)} · ${escapeHtml(item.label)} · ${formatDate(item.date)}</time><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description).slice(0, 120) || "View details"}</p>`;
          target.appendChild(link);
        });
    };

    if (filter) {
      filter.addEventListener("click", (event) => {
        const button = event.target.closest("[data-feed-category]");
        if (!button) return;
        activeCategory = button.dataset.feedCategory || "全部";
        filter.querySelectorAll("button").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        renderItems();
      });
    }

    renderItems();

    const workerFeed = await fetchJsonIfAvailable(root.dataset.rssWorkerUrl, 5000);
    if (Array.isArray(workerFeed?.items) && workerFeed.items.length) {
      items = workerFeed.items;
      isLoading = false;
      renderItems();
      if (status) status.textContent = "Worker synced";
      return;
    }

    const staticFeed = await fetchJsonIfAvailable(root.dataset.rssFeedUrl);
    if (Array.isArray(staticFeed?.items) && staticFeed.items.length) {
      items = staticFeed.items;
      isLoading = false;
      renderItems();
      if (status) status.textContent = "RSS synced";
      return;
    }

    const feedResults = await Promise.allSettled(feeds.map(async (feed) => {
      try {
        const urls = [feed.url, ...(feed.fallbackUrls || [])].filter(Boolean);
        let text = "";
        for (const url of urls) {
          try {
            text = await fetchTextWithFallback(url, proxies, 5000);
            if (text) break;
          } catch {
            // next url
          }
        }
        if (!text) return [];
        const xml = new DOMParser().parseFromString(text, "application/xml");
        const feedItems = [];
        xml.querySelectorAll("item, entry").forEach((item) => {
          feedItems.push({
            label: feed.label,
            category: feed.category || "RSS",
            title: item.querySelector("title")?.textContent?.trim() || "Untitled",
            link: item.querySelector("link")?.getAttribute("href") || item.querySelector("link")?.textContent?.trim() || feed.url,
            date: item.querySelector("pubDate, updated, published")?.textContent || "",
            description: item.querySelector("description, summary, content")?.textContent?.replace(/<[^>]*>/g, "").trim() || "",
          });
        });
        return feedItems;
      } catch {
        return [];
      }
    }));

    items = feedResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    isLoading = false;
    renderItems();
    if (status) status.textContent = items.length ? "RSS synced" : "RSS unavailable";
  };

  const loadSteamStatus = async () => {
    const target = root.querySelector("[data-steam-status]");
    const workerUrl = root.dataset.steamWorkerUrl;
    if (!target || !workerUrl) return;

    const renderSteam = (state, summary, meta = "") => {
      const normalizedState = String(state || "unknown").toLowerCase();
      const isOnline = ["online", "busy", "away", "snooze", "looking_to_trade", "looking_to_play"].includes(normalizedState);
      const labelMap = {
        online: "online",
        offline: "offline",
        busy: "busy",
        away: "away",
        snooze: "snooze",
        looking_to_trade: "looking to trade",
        looking_to_play: "looking to play",
        unknown: "unknown",
      };

      target.innerHTML = `
        <span class="status-dot ${isOnline ? "status-dot--online" : normalizedState === "offline" ? "status-dot--offline" : "status-dot--unknown"}"></span>
        <div>
          <strong>Steam ${labelMap[normalizedState] || state || "unknown"}</strong>
          <p>${escapeHtml(summary || "No live Steam activity detected")}${meta ? ` · ${escapeHtml(meta)}` : ""}</p>
        </div>
      `;
    };

    const renderSteamPayload = (payload, meta) => {
      if (!payload) return;
      renderSteam(
        payload.onlineState,
        payload.gameExtraInfo ? `Playing ${payload.gameExtraInfo}` : payload.statusText,
        meta || (payload.updatedAt ? `Live ${formatTime(payload.updatedAt)}` : "Live")
      );
    };

    const refreshFromSteamWorker = async () => {
      const url = new URL(workerUrl);
      url.searchParams.set("t", Date.now());
      const status = await fetchJsonIfAvailable(url.toString(), 5000);
      if (!status?.ok && !status?.statusText) throw new Error("Steam Worker unavailable");
      renderSteamPayload(status);
    };

    try {
      await refreshFromSteamWorker();
      window.setInterval(() => {
        refreshFromSteamWorker().catch(() => {});
      }, 30000);
    } catch {
      target.innerHTML = `
        <span class="status-dot status-dot--unknown"></span>
        <div>
          <strong>Steam unavailable</strong>
          <p>Check the Cloudflare Worker endpoint.</p>
        </div>
      `;
    }
  };

  applyBeijingTimeTheme();
  window.setInterval(applyBeijingTimeTheme, 60000);
  refreshGitHubHeatmap();
  scheduleGitHubHeatmapRefresh();
  window.addEventListener("pageshow", refreshGitHubHeatmap);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshGitHubHeatmap();
  });

  loadWeather();
  loadVisitorCount();
  loadFeeds();
  loadSteamStatus();
  loadGitHubEvents();
})();
