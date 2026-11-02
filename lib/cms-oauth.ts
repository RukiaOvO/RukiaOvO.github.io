import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function isCmsOAuthConfigured() {
  return getSettings() !== null;
}

const cookieName = "rukia_cms_oauth_state";
const cookiePath = "/api/auth/callback";
const maxStateAgeSeconds = 600;
const repositoryOwner = "RukiaOvO";
const repositoryName = "RukiaOvO.github.io";

type OAuthSettings = { clientId: string; clientSecret: string; redirectUri: string; origin: string };

function getSettings(): OAuthSettings | null {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.CMS_OAUTH_REDIRECT_URI;
  const baseUrl = process.env.CMS_OAUTH_BASE_URL;
  if (!clientId || !clientSecret || !redirectUri || !baseUrl) return null;
  try {
    const callback = new URL(redirectUri);
    const origin = new URL(baseUrl);
    if (callback.protocol !== "https:" || callback.username || callback.password || callback.hash || callback.search !== "?provider=github" || origin.protocol !== "https:" || origin.origin !== baseUrl || callback.origin !== origin.origin || callback.pathname !== cookiePath) return null;
    return { clientId, clientSecret, redirectUri, origin: origin.origin };
  } catch { return null; }
}

function errorPage(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

function popupResponse(status: "success" | "error", data: { token: string } | { message: string }, targetOrigin: string) {
  const payload = JSON.stringify(data).replaceAll("<", "\\u003c");
  const script = `(()=>{const target=${JSON.stringify(targetOrigin)};const message=${JSON.stringify(`authorization:github:${status}:`)}+${JSON.stringify(payload)};function receive(event){if(event.source!==window.opener||event.origin!==target||event.data!=="authorizing:github")return;window.removeEventListener("message",receive);window.opener.postMessage(message,target);window.close()}window.addEventListener("message",receive);if(window.opener)window.opener.postMessage("authorizing:github",target)})();`;
  const nonce = randomBytes(18).toString("base64url");
  // The popup returns from GitHub's origin. An isolating COOP policy here severs
  // window.opener even when the editor uses same-origin-allow-popups.
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`, "Cross-Origin-Opener-Policy": "unsafe-none", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" });
  return new NextResponse(`<!doctype html><html lang="en"><meta charset="utf-8"><title>CMS authorization</title><body><p>Returning to Decap CMS…</p><script nonce="${nonce}">${script}</script></body></html>`, { headers });
}

function stateFromCookie(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(cookieName, "", { httpOnly: true, secure: true, sameSite: "lax", path: cookiePath, maxAge: 0 });
  return response;
}

function repositoryHasWriteAccess(value: unknown) {
  if (!value || typeof value !== "object" || !("permissions" in value)) return false;
  const permissions = value.permissions;
  return Boolean(permissions && typeof permissions === "object" && "push" in permissions && permissions.push === true);
}

async function handleCallback(request: Request, settings: OAuthSettings) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const expectedState = stateFromCookie(request);
  const provider = url.searchParams.get("provider");
  const code = url.searchParams.get("code");
  const result = (status: "success" | "error", data: { token: string } | { message: string }) => clearStateCookie(popupResponse(status, data, settings.origin));

  if (url.searchParams.has("error") || provider !== "github") return result("error", { message: "GitHub authorization was cancelled or rejected. Retry from the CMS." });
  if (!code || !state || !expectedState || !/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(expectedState) || !timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))) {
    return result("error", { message: "OAuth state validation failed. Close this window and retry." });
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: settings.clientId, client_secret: settings.clientSecret, code, redirect_uri: settings.redirectUri }),
      cache: "no-store", signal: AbortSignal.timeout(8000), redirect: "error",
    });
    if (!tokenResponse.ok) return result("error", { message: "GitHub authorization could not be completed. Retry from the CMS." });
    const payload: unknown = await tokenResponse.json();
    if (payload && typeof payload === "object" && "error" in payload) {
      // Only return our own descriptions; upstream error text can contain sensitive data.
      const messages: Record<string, string> = {
        incorrect_client_credentials: "GitHub 拒绝了 Client ID 或 Client Secret。请确认来自同一个 GitHub OAuth App，并在更新 Vercel Production 变量后重新部署。（incorrect_client_credentials）",
        redirect_uri_mismatch: "GitHub 回调地址不匹配。请核对 OAuth App 与 CMS_OAUTH_REDIRECT_URI 的完整地址。（redirect_uri_mismatch）",
        bad_verification_code: "GitHub 授权码已失效或已被使用。请关闭旧弹窗，从编辑器重新登录。（bad_verification_code）",
      };
      const error = payload.error;
      const message = typeof error === "string" && Object.hasOwn(messages, error) ? messages[error] : "GitHub did not return an authorization token.";
      return result("error", { message });
    }
    if (!payload || typeof payload !== "object" || !("access_token" in payload) || typeof payload.access_token !== "string" || !payload.access_token || ("error" in payload)) return result("error", { message: "GitHub did not return an authorization token." });

    const repository = await fetch(`https://api.github.com/repos/${encodeURIComponent(repositoryOwner)}/${encodeURIComponent(repositoryName)}`, {
      headers: { Authorization: `Bearer ${payload.access_token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      cache: "no-store", signal: AbortSignal.timeout(5000), redirect: "error",
    });
    if (!repository.ok) return result("error", { message: "This GitHub account cannot access the site repository." });
    const repositoryData: unknown = await repository.json();
    if (!repositoryHasWriteAccess(repositoryData)) return result("error", { message: "This GitHub account does not have write access to the site repository." });
    return result("success", { token: payload.access_token });
  } catch {
    return result("error", { message: "GitHub authorization timed out. Close this window and retry." });
  }
}

export async function handleAuth(request: Request, callbackOnly = false) {
  const settings = getSettings();
  if (!settings) return errorPage(503, "CMS OAuth is not configured.");
  const url = new URL(request.url);
  if (callbackOnly) return handleCallback(request, settings);
  if (url.searchParams.get("provider") !== "github") return errorPage(400, "Unsupported OAuth provider.");

  const state = randomBytes(32).toString("base64url");
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", settings.clientId);
  authorize.searchParams.set("redirect_uri", settings.redirectUri);
  authorize.searchParams.set("scope", "public_repo");
  authorize.searchParams.set("state", state);
  const response = NextResponse.redirect(authorize, 302);
  response.cookies.set(cookieName, state, { httpOnly: true, secure: true, sameSite: "lax", path: cookiePath, maxAge: maxStateAgeSeconds });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
