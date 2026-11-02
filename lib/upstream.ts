export class UpstreamError extends Error {
  constructor(public code: "TIMEOUT" | "UNAVAILABLE" | "INVALID_RESPONSE" | "TOO_LARGE") { super(code); }
}

export async function fetchText(url: string, options: { headers?: Record<string, string>; timeoutMs?: number; maxBytes?: number } = {}) {
  const timeout = options.timeoutMs ?? 7000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Ruk1a-personal-site/1.0", ...options.headers },
      redirect: "error", signal: controller.signal, cache: "no-store",
    });
    if (!response.ok || !response.body) throw new UpstreamError("UNAVAILABLE");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > (options.maxBytes ?? 2_000_000)) throw new UpstreamError("TOO_LARGE");
        text += decoder.decode(value, { stream: true });
      }
      return text + decoder.decode();
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  } catch (error) {
    if (controller.signal.aborted) throw new UpstreamError("TIMEOUT");
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError("UNAVAILABLE");
  } finally { clearTimeout(timer); }
}
