import { z } from "zod";

export const activityItemSchema = z.object({
  id: z.string(), title: z.string(), summary: z.string(), url: z.url(), date: z.string().nullable(),
  sourceId: z.string(), source: z.string(), category: z.string(),
});
export const activitySourceSchema = z.object({
  id: z.string(), label: z.string(), state: z.enum(["ok", "error"]), updatedAt: z.string().nullable(),
});
export const activityDataSchema = z.object({
  items: z.array(activityItemSchema), sources: z.array(activitySourceSchema),
});
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type ActivitySource = z.infer<typeof activitySourceSchema>;
export type ActivityData = z.infer<typeof activityDataSchema>;

export function safeHttpUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
export function normalizeDate(input: unknown): string | null {
  if (typeof input !== "string" || !input.trim()) return null;
  const value = new Date(input);
  return Number.isFinite(value.getTime()) ? value.toISOString() : null;
}
export function sortAndDedupe(items: ActivityItem[]): ActivityItem[] {
  const sorted = [...items].sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  return sorted.filter((item) => {
    const key = new URL(item.url);
    key.hash = "";
    for (const name of [...key.searchParams.keys()]) if (name.startsWith("utm_")) key.searchParams.delete(name);
    if (seen.has(key.href)) return false;
    seen.add(key.href);
    return true;
  });
}
