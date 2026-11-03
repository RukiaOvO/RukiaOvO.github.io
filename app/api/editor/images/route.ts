import { randomBytes } from "node:crypto";
import { getEditorToken, hasSameOrigin, authRequired, noStore, originRejected, safeError } from "@/lib/editor-api";
import { getEditablePull, validArticleFile, validEditorBranch, writeRepositoryBytes } from "@/lib/editor-github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const maxImageBytes = 4 * 1024 * 1024;

function imageExtension(type: string, bytes: Uint8Array) {
  if (type === "image/png" && bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  if (type === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (type === "image/gif" && bytes.length >= 6 && Buffer.from(bytes.slice(0, 6)).toString("ascii").startsWith("GIF8")) return "gif";
  if (type === "image/webp" && bytes.length >= 12 && Buffer.from(bytes.slice(0, 4)).toString("ascii") === "RIFF" && Buffer.from(bytes.slice(8, 12)).toString("ascii") === "WEBP") return "webp";
  return null;
}

export async function POST(request: Request) {
  const token = getEditorToken(request);
  if (!token) return authRequired();
  if (!hasSameOrigin(request)) return originRejected();
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxImageBytes + 128_000) return noStore({ error: "图片最大支持 4 MB。" }, 413);
  try {
    const form = await request.formData();
    const file = form.get("image");
    const articleFile = form.get("file");
    const requestedBranch = form.get("branch");
    if (!(file instanceof File) || typeof articleFile !== "string" || !validArticleFile(articleFile) || typeof requestedBranch !== "string" || !validEditorBranch(requestedBranch)) return noStore({ error: "图片或博客信息无效。" }, 400);
    if (file.size === 0 || file.size > maxImageBytes) return noStore({ error: "图片必须小于 4 MB。" }, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = imageExtension(file.type, bytes);
    if (!extension) return noStore({ error: "仅支持有效的 PNG、JPEG、GIF 或 WebP 图片。" }, 415);
    const original = file.name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).toLowerCase() || "image";
    const name = `${Date.now()}-${randomBytes(4).toString("hex")}-${original}.${extension}`;
    const branch = requestedBranch;
    if (!await getEditablePull(token, branch, articleFile)) return noStore({ error: "请先保存博客草稿，再上传图片。" }, 409);
    await writeRepositoryBytes(token, branch, `static/img/posts/${name}`, bytes, `Upload article image: ${name}`);
    return noStore({ ok: true, branch, name, markdown: `![](/img/posts/${name})`, path: `/img/posts/${name}` });
  } catch (error) { return safeError(error); }
}
