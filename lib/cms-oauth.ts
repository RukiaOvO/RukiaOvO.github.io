import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stateCookie = "rukia_editor_oauth_state";
const returnCookie = "rukia_editor_return_to";
export const editorSessionCookie = "__Secure-rukia_editor_session";
const callbackPath = "/api/auth/callback";
const sessionMaxAge = 28_800;
const repositoryOwner = "RukiaOvO";
const repositoryName = "RukiaOvO.github.io";

type Settings = { clientId: string; clientSecret: string; redirectUri: string; origin: string };

function settings(): Settings | null {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.CMS_OAUTH_REDIRECT_URI;
  const baseUrl = process.env.CMS_OAUTH_BASE_URL;
  if (!clientId || !clientSecret || !redirectUri || !baseUrl) return null;
  try {
    const callback = new URL(redirectUri);
    const origin = new URL(baseUrl);
    if (callback.protocol !== "https:" || callback.username || callback.password || callback.hash || callback.search !== "?provider=github" || callback.pathname !== callbackPath || origin.protocol !== "https:" || origin.origin !== baseUrl || callback.origin !== origin.origin) return null;
    return { clientId, clientSecret, redirectUri, origin: origin.origin };
  } catch { return null; }
}

export function isCmsOAuthConfigured() { return settings() !== null; }

function cookieValue(request: Request, name: string) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function clearCookie(response: NextResponse, name: string, path: string) {
  response.cookies.set(name, "", { httpOnly: true, secure: true, sameSite: "lax", path, maxAge: 0 });
}

export async function handleAuth(request: Request, callbackOnly = false) {
  const config = settings();
  if (!config) return NextResponse.json({ error: "CMS OAuth is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);

  if (!callbackOnly) {
    if (url.searchParams.get("provider") !== "github") return NextResponse.json({ error: "Unsupported OAuth provider." }, { status: 400 });
    const returnTo = url.searchParams.get("return_to") || "/admin/";
    if (!returnTo.startsWith("/admin/") || returnTo.startsWith("//") || returnTo.includes("\\")) return NextResponse.json({ error: "Invalid return path." }, { status: 400 });
    const state = randomBytes(32).toString("base64url");
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", config.clientId);
    authorize.searchParams.set("redirect_uri", config.redirectUri);
    authorize.searchParams.set("scope", "public_repo");
    authorize.searchParams.set("state", state);
    const response = NextResponse.redirect(authorize, 302);
    response.cookies.set(stateCookie, state, { httpOnly: true, secure: true, sameSite: "lax", path: callbackPath, maxAge: 600 });
    response.cookies.set(returnCookie, encodeURIComponent(returnTo), { httpOnly: true, secure: true, sameSite: "lax", path: callbackPath, maxAge: 600 });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  const state = url.searchParams.get("state");
  const expected = cookieValue(request, stateCookie);
  let requestedReturn = "/admin/";
  try { requestedReturn = decodeURIComponent(cookieValue(request, returnCookie) || encodeURIComponent("/admin/")); } catch { /* Use the safe default. */ }
  const returnTo = requestedReturn;
  const destination = returnTo.startsWith("/admin/") && !returnTo.startsWith("//") && !returnTo.includes("\\") ? returnTo : "/admin/";
  const fail = (code: string) => {
    const response = NextResponse.redirect(new URL(`${destination}?auth_error=${encodeURIComponent(code)}`, config.origin), 303);
    clearCookie(response, stateCookie, callbackPath);
    clearCookie(response, returnCookie, callbackPath);
    return response;
  };

  if (!state || !expected || !/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(expected) || !timingSafeEqual(Buffer.from(state), Buffer.from(expected))) return fail("state");
  if (url.searchParams.has("error")) return fail("cancelled");
  const code = url.searchParams.get("code");
  if (!code) return fail("token");

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.redirectUri }),
      cache: "no-store", signal: AbortSignal.timeout(8000), redirect: "error",
    });
    const payload: unknown = await tokenResponse.json();
    if (!tokenResponse.ok || !payload || typeof payload !== "object" || !("access_token" in payload) || typeof payload.access_token !== "string" || !payload.access_token || "error" in payload) {
      const error = payload && typeof payload === "object" && "error" in payload ? payload.error : null;
      const errors: Record<string, string> = { incorrect_client_credentials: "credentials", redirect_uri_mismatch: "redirect_uri", bad_verification_code: "bad_code" };
      return fail(typeof error === "string" && Object.hasOwn(errors, error) ? errors[error] : "token");
    }
    const repository = await fetch(`https://api.github.com/repos/${repositoryOwner}/${repositoryName}`, {
      headers: { Authorization: `Bearer ${payload.access_token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      cache: "no-store", signal: AbortSignal.timeout(5000), redirect: "error",
    });
    const repositoryData: unknown = repository.ok ? await repository.json() : null;
    const permissions = repositoryData && typeof repositoryData === "object" && "permissions" in repositoryData ? repositoryData.permissions : null;
    if (!permissions || typeof permissions !== "object" || !("push" in permissions) || permissions.push !== true) return fail("repository_access");

    const expiresIn = "expires_in" in payload ? payload.expires_in : undefined;
    const maxAge = typeof expiresIn === "number" ? Math.max(60, Math.min(sessionMaxAge, expiresIn)) : sessionMaxAge;
    const response = NextResponse.redirect(new URL(`${destination}?auth=success`, config.origin), 303);
    response.cookies.set(editorSessionCookie, payload.access_token, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/editor", maxAge });
    clearCookie(response, stateCookie, callbackPath);
    clearCookie(response, returnCookie, callbackPath);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch { return fail("network"); }
}
