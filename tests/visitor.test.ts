import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/visitor/route";

test("visitor API queries Vercel Analytics using project ID and optional team ID", async () => {
  const originalFetch = globalThis.fetch;
  const previous = {
    token: process.env.VERCEL_ANALYTICS_TOKEN,
    analyticsProject: process.env.VERCEL_ANALYTICS_PROJECT_ID,
    project: process.env.VERCEL_PROJECT_ID,
    analyticsTeam: process.env.VERCEL_ANALYTICS_TEAM_ID,
    org: process.env.VERCEL_ORG_ID,
    since: process.env.VERCEL_ANALYTICS_SINCE,
  };
  process.env.VERCEL_ANALYTICS_TOKEN = "test-token";
  delete process.env.VERCEL_ANALYTICS_PROJECT_ID;
  process.env.VERCEL_PROJECT_ID = "prj_real_project";
  delete process.env.VERCEL_ANALYTICS_TEAM_ID;
  process.env.VERCEL_ORG_ID = "team_real_team";
  process.env.VERCEL_ANALYTICS_SINCE = "2026-11-01";
  let requestedUrl: URL | undefined;
  globalThis.fetch = async (input, init) => {
    requestedUrl = new URL(String(input));
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-token");
    return Response.json({ data: { visitors: 1234, pageviews: 2222 } });
  };
  try {
    const response = await GET();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, count: 1234 });
    assert.equal(requestedUrl?.searchParams.get("projectId"), "prj_real_project");
    assert.equal(requestedUrl?.searchParams.get("teamId"), "team_real_team");
    assert.equal(requestedUrl?.searchParams.get("since"), "2026-11-01");
    assert.ok(requestedUrl?.searchParams.get("until"));
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      const envKey = ({ token: "VERCEL_ANALYTICS_TOKEN", analyticsProject: "VERCEL_ANALYTICS_PROJECT_ID", project: "VERCEL_PROJECT_ID", analyticsTeam: "VERCEL_ANALYTICS_TEAM_ID", org: "VERCEL_ORG_ID", since: "VERCEL_ANALYTICS_SINCE" } as const)[key as keyof typeof previous];
      if (value === undefined) delete process.env[envKey]; else process.env[envKey] = value;
    }
  }
});

test("visitor API does not mistake a team ID for a project ID", async () => {
  const previousToken = process.env.VERCEL_ANALYTICS_TOKEN;
  const previousProject = process.env.VERCEL_PROJECT_ID;
  const previousTeam = process.env.VERCEL_ORG_ID;
  const previousSince = process.env.VERCEL_ANALYTICS_SINCE;
  delete process.env.VERCEL_ANALYTICS_TOKEN;
  delete process.env.VERCEL_PROJECT_ID;
  process.env.VERCEL_ORG_ID = "team_only";
  process.env.VERCEL_ANALYTICS_SINCE = "2026-11-01";
  try {
    const response = await GET();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: "Visitor analytics is not configured." });
  } finally {
    if (previousToken === undefined) delete process.env.VERCEL_ANALYTICS_TOKEN; else process.env.VERCEL_ANALYTICS_TOKEN = previousToken;
    if (previousProject === undefined) delete process.env.VERCEL_PROJECT_ID; else process.env.VERCEL_PROJECT_ID = previousProject;
    if (previousTeam === undefined) delete process.env.VERCEL_ORG_ID; else process.env.VERCEL_ORG_ID = previousTeam;
    if (previousSince === undefined) delete process.env.VERCEL_ANALYTICS_SINCE; else process.env.VERCEL_ANALYTICS_SINCE = previousSince;
  }
});
