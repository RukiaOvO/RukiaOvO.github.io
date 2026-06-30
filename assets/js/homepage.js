(() => {
  const root = document.querySelector(".profile-home, .activity-page");
  if (!root) return;

  const weatherCodes = {
    0: ["晴", "☀"],
    1: ["大部晴朗", "☀"],
    2: ["局部多云", "⛅"],
    3: ["阴", "☁"],
    45: ["有雾", "☁"],
    48: ["雾凇", "☁"],
    51: ["小毛毛雨", "☂"],
    53: ["毛毛雨", "☂"],
    55: ["较强毛毛雨", "☂"],
    61: ["小雨", "☂"],
    63: ["中雨", "☂"],
    65: ["大雨", "☂"],
    71: ["小雪", "❄"],
    73: ["中雪", "❄"],
    75: ["大雪", "❄"],
    80: ["阵雨", "☂"],
    81: ["较强阵雨", "☂"],
    82: ["强阵雨", "☂"],
    95: ["雷暴", "⚡"],
    96: ["雷暴伴冰雹", "⚡"],
    99: ["强雷暴伴冰雹", "⚡"],
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const readJsonScript = (id, fallback = []) => {
    const source = document.getElementById(id);
    if (!source) return fallback;
    try {
      return JSON.parse(source.textContent || "[]");
    } catch (error) {
      return fallback;
    }
  };

  const fetchTextWithFallback = async (url, proxies = [""], timeoutMs = 5000) => {
    for (const proxy of proxies.length ? proxies : [""]) {
      const requestUrl = proxy ? `${proxy}${encodeURIComponent(url)}` : url;
      try {
        const response = await fetchWithTimeout(requestUrl, { cache: "no-store" }, timeoutMs);
        if (response.ok) return response.text();
      } catch (error) {
        // Try the next proxy.
      }
    }
    throw new Error("All fetch fallbacks failed");
  };

  const fetchJsonIfAvailable = async (url, timeoutMs = 3000) => {
    if (!url) return null;
    try {
      const response = await fetchWithTimeout(url, { cache: "no-store" }, timeoutMs);
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      return null;
    }
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
        const [label, symbol] = weatherCodes[current.weathercode] || ["未知天气", "☁"];

        icon.textContent = symbol;
        temp.textContent = `${Math.round(current.temperature)}°C`;
        desc.textContent = `${city} · ${label}`;
        detail.textContent = `高 ${Math.round(daily.temperature_2m_max?.[0] ?? current.temperature)}° / 低 ${Math.round(daily.temperature_2m_min?.[0] ?? current.temperature)}° · 风速 ${Math.round(current.windspeed)} km/h · ${formatDate(current.time)}`;
      } catch (error) {
        icon.textContent = "☁";
        temp.textContent = "--°C";
        desc.textContent = `${city} 天气暂不可用`;
        detail.textContent = "Open-Meteo 接口暂时无法访问";
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
        const eventName = event.type.replace("Event", "");
        const item = document.createElement("article");
        item.className = "github-event";

        let title = eventName;
        let detail = repo;
        let commits = "";
        let href = `https://github.com/${repo}`;

        if (event.type === "PushEvent") {
          const branch = payload.ref?.replace("refs/heads/", "") || "unknown";
          const visibleCommits = Array.isArray(payload.commits) ? payload.commits : [];
          const commitCount = Number(payload.size ?? payload.distinct_size ?? visibleCommits.length);
          title = `Push · ${branch}`;
          detail = commitCount > 0 ? `${repo} · ${commitCount} commit${commitCount > 1 ? "s" : ""}` : `${repo} · push 更新`;
          commits = visibleCommits
            .slice(0, 3)
            .map((commit) => `<li><code>${escapeHtml((commit.sha || "").slice(0, 7))}</code><span>${escapeHtml(commit.message || "Commit")}</span></li>`)
            .join("");
          href = payload.head ? `https://github.com/${repo}/commit/${payload.head}` : href;
        } else if (event.type === "PullRequestEvent") {
          title = `Pull Request · ${payload.action || "update"}`;
          detail = payload.pull_request?.title || repo;
          href = payload.pull_request?.html_url || href;
        } else if (event.type === "IssuesEvent") {
          title = `Issue · ${payload.action || "update"}`;
          detail = payload.issue?.title || repo;
          href = payload.issue?.html_url || href;
        } else if (event.type === "IssueCommentEvent") {
          title = `Issue Comment · ${payload.action || "comment"}`;
          detail = payload.issue?.title || repo;
          href = payload.comment?.html_url || payload.issue?.html_url || href;
        } else if (event.type === "CreateEvent") {
          title = `Create · ${payload.ref_type || "resource"}`;
          detail = payload.ref ? `${repo} · ${payload.ref}` : repo;
        } else if (event.type === "ReleaseEvent") {
          title = `Release · ${payload.action || "publish"}`;
          detail = payload.release?.name || payload.release?.tag_name || repo;
          href = payload.release?.html_url || href;
        } else if (event.type === "WatchEvent") {
          title = "Star";
          detail = repo;
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
        target.innerHTML = '<p class="empty-state">暂无公开 GitHub 动态</p>';
      }
    };

    try {
      const limit = Number(root.dataset.githubEventsLimit || 10);
      const staticEvents = await fetchJsonIfAvailable(root.dataset.githubEventsUrl);
      if (Array.isArray(staticEvents?.events) && staticEvents.events.length) {
        renderEvents(staticEvents.events.slice(0, limit));
        return;
      }

      const response = await fetchWithTimeout(`https://api.github.com/users/${username}/events/public?per_page=${Math.max(limit, 10)}`, {
        headers: { Accept: "application/vnd.github+json" },
      }, 8000);
      if (!response.ok) throw new Error(`GitHub ${response.status}`);
      const events = await response.json();
      renderEvents(events.slice(0, limit));
    } catch (error) {
      target.innerHTML = '<p class="empty-state">GitHub API 暂时无法访问</p>';
    }
  };

  const loadIssueComments = async () => {
    const target = root.querySelector("[data-comments-list]");
    const summaryTarget = root.querySelector("[data-issue-summary]");
    const { commentsOwner, commentsRepo, commentsIssue } = root.dataset;
    if (!target || !commentsOwner || !commentsRepo) return;

    try {
      const headers = { Accept: "application/vnd.github+json" };
      const issueBase = `https://api.github.com/repos/${commentsOwner}/${commentsRepo}/issues`;
      let issue = null;

      if (commentsIssue) {
        const issueResponse = await fetchWithTimeout(`${issueBase}/${commentsIssue}`, { headers }, 8000);
        if (issueResponse.ok) {
          issue = await issueResponse.json();
        }
      }

      if (!issue) {
        const label = root.dataset.commentsLabel || "comment";
        const issuesResponse = await fetchWithTimeout(`${issueBase}?state=open&labels=${encodeURIComponent(label)}&per_page=30`, { headers }, 8000);
        if (issuesResponse.ok) {
          const issues = await issuesResponse.json();
          const pathname = window.location.pathname.replace(/\/$/, "") || "/";
          issue = issues.find((item) => {
            const title = item.title || "";
            return title === pathname || title === window.location.pathname || title.includes(pathname);
          }) || issues[0] || null;
        }
      }

      if (!issue) {
        if (summaryTarget) {
          summaryTarget.innerHTML = '<p class="empty-state">登录 GitHub 后可在下方留言。</p>';
        }
        target.hidden = true;
        target.innerHTML = "";
        return;
      }

      const commentsResponse = await fetchWithTimeout(`${issue.comments_url}?per_page=8`, { headers }, 8000);
      if (!commentsResponse.ok) throw new Error("Issue comments unavailable");

      const comments = await commentsResponse.json();
      target.innerHTML = "";
      if (summaryTarget) {
        const reactions = issue.reactions || {};
        const reactionItems = [
          ["👍", reactions["+1"] || 0],
          ["❤️", reactions.heart || 0],
          ["🚀", reactions.rocket || 0],
          ["👀", reactions.eyes || 0],
        ];
        summaryTarget.innerHTML = `
          <div class="issue-summary__meta">
            <span>#${issue.number}</span>
            <span>${escapeHtml(issue.state)}</span>
            <span>${issue.comments || 0} 条评论</span>
          </div>
          <a href="${issue.html_url}" target="_blank" rel="noopener noreferrer">${escapeHtml(issue.title || "GitHub Issue")}</a>
          <div class="reaction-row">
            ${reactionItems.map(([emoji, count]) => `<span>${emoji} ${count}</span>`).join("")}
          </div>
        `;
      }

      comments.slice(0, 6).forEach((comment) => {
        const reactions = comment.reactions || {};
        const article = document.createElement("article");
        article.className = "comment-item";
        article.innerHTML = `
          <img src="${comment.user.avatar_url}" alt="${escapeHtml(comment.user.login)}">
          <div>
            <div class="comment-item__meta">
              <strong>${escapeHtml(comment.user.login)}</strong>
              <time>${formatTime(comment.created_at)}</time>
            </div>
            <p>${escapeHtml(comment.body).slice(0, 220)}</p>
            <div class="reaction-row">
              <span>👍 ${reactions["+1"] || 0}</span>
              <span>❤️ ${reactions.heart || 0}</span>
              <span>🚀 ${reactions.rocket || 0}</span>
              <span>👀 ${reactions.eyes || 0}</span>
            </div>
          </div>
        `;
        target.appendChild(article);
      });

      if (!comments.length) {
        target.hidden = true;
        target.innerHTML = "";
      } else {
        target.hidden = false;
      }
    } catch (error) {
      if (summaryTarget) {
        summaryTarget.innerHTML = '<p class="empty-state">留言区暂时无法访问。</p>';
      }
      target.hidden = true;
      target.innerHTML = "";
    }
  };

  const loadFeeds = async () => {
    const target = root.querySelector("[data-feed-list]");
    const status = root.querySelector("[data-feed-status]");
    if (!target) return;

    const feeds = readJsonScript("profile-feeds");
    const proxies = readJsonScript("profile-rss-proxies", ["https://api.allorigins.win/raw?url="]);
    const filter = root.querySelector("[data-feed-filter]");
    let activeCategory = filter?.querySelector(".is-active")?.dataset.feedCategory || "全部";
    let items = [];
    let isLoading = true;

    const renderItems = () => {
      const visibleItems = activeCategory === "全部"
        ? items
        : items.filter((item) => item.category === activeCategory);

      target.innerHTML = "";
      if (isLoading) {
        target.innerHTML = `<p class="empty-state">${escapeHtml(activeCategory)} RSS 加载中。</p>`;
        return;
      }

      if (!visibleItems.length) {
        target.innerHTML = `<p class="empty-state">${escapeHtml(activeCategory)} 暂无可展示的 RSS 条目。</p>`;
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
          link.innerHTML = `<time>${escapeHtml(item.category)} · ${escapeHtml(item.label)} · ${formatDate(item.date)}</time><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description).slice(0, 120) || "查看详情"}</p>`;
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

    const staticFeed = await fetchJsonIfAvailable(root.dataset.rssFeedUrl);
    if (Array.isArray(staticFeed?.items) && staticFeed.items.length) {
      items = staticFeed.items;
      isLoading = false;
      renderItems();
      if (status) status.textContent = "RSS 已同步";
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
          } catch (error) {
            // Try the next source URL.
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
      } catch (error) {
        return [];
      }
    }));

    items = feedResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );
    isLoading = false;

    if (!items.length) {
      renderItems();
      if (status) status.textContent = "RSS 不可用";
      return;
    }

    renderItems();

    if (status) status.textContent = "RSS 已同步";
  };

  const loadSteamStatus = async () => {
    const target = root.querySelector("[data-steam-status]");
    const profileUrl = root.dataset.steamUrl;
    if (!target || !profileUrl) return;

    const renderSteam = (state, summary) => {
      const normalizedState = String(state || "unknown").toLowerCase();
      const isOnline = ["online", "busy", "away", "snooze", "looking_to_trade", "looking_to_play"].includes(normalizedState);
      const labelMap = {
        online: "在线",
        offline: "离线",
        busy: "忙碌",
        away: "离开",
        snooze: "暂离",
        looking_to_trade: "想交易",
        looking_to_play: "想玩游戏",
        unknown: "未知",
      };

      target.innerHTML = `
        <span class="status-dot ${isOnline ? "status-dot--online" : normalizedState === "offline" ? "status-dot--offline" : "status-dot--unknown"}"></span>
        <div>
          <strong>Steam ${labelMap[normalizedState] || state || "未知"}</strong>
          <p>${escapeHtml(summary || "未检测到正在游玩的游戏")}</p>
        </div>
      `;
    };

    try {
      const staticStatus = await fetchJsonIfAvailable(root.dataset.steamStaticUrl);
      if (staticStatus?.ok || staticStatus?.statusText) {
        renderSteam(staticStatus.onlineState, staticStatus.gameExtraInfo ? `正在玩 ${staticStatus.gameExtraInfo}` : staticStatus.statusText);
        return;
      }

      const xmlUrl = `${profileUrl.replace(/\/$/, "")}/?xml=1`;
      const proxies = readJsonScript("profile-steam-proxies", [root.dataset.steamProxy || ""]);
      const text = await fetchTextWithFallback(xmlUrl, proxies, 5000);
      const xml = new DOMParser().parseFromString(text, "application/xml");
      const state = xml.querySelector("onlineState")?.textContent?.trim() || "unknown";
      const stateMessage = xml.querySelector("stateMessage")?.textContent?.trim() || "";
      const game = xml.querySelector("inGameInfo gameName")?.textContent?.trim();
      const summary = game ? `正在玩 ${game}` : stateMessage || "未检测到正在游玩的游戏";
      renderSteam(state, summary);
    } catch (error) {
      target.innerHTML = `
        <span class="status-dot status-dot--unknown"></span>
        <div>
          <strong>Steam 状态不可用</strong>
          <p>请确认 Steam 个人资料公开，或在 data/home.yaml 中修改 profileUrl。</p>
        </div>
      `;
    }
  };

  loadWeather();
  loadFeeds();
  loadSteamStatus();
  loadGitHubEvents();
  loadIssueComments();
})();
