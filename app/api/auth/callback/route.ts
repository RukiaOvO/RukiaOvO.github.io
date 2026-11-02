import { handleAuth } from "@/lib/cms-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleAuth(request, true);
}
