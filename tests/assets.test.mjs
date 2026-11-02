import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rename, unlink, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, relative, sep } from "node:path";
import { syncPublic } from "../scripts/sync-public.mjs";

test("asset sync updates renamed/deleted managed files and preserves unrelated files", async () => {
  const root = await mkdtemp(join(tmpdir(), "rukia-assets-"));
  try {
    await mkdir(join(root, "static/img"), { recursive: true });
    await mkdir(join(root, "assets/img"), { recursive: true });
    await writeFile(join(root, "assets/img/avatar.jpg"), "avatar");
    await writeFile(join(root, "static/img/a.png"), "first");
    await syncPublic(root);
    await writeFile(join(root, "public/unrelated.txt"), "keep");
    await rename(join(root, "static/img/a.png"), join(root, "static/img/b.png"));
    await syncPublic(root);
    await assert.rejects(access(join(root, "public/img/a.png")));
    assert.equal(await readFile(join(root, "public/img/b.png"), "utf8"), "first");
    await unlink(join(root, "static/img/b.png"));
    await syncPublic(root);
    await assert.rejects(access(join(root, "public/img/b.png")));
    assert.equal(await readFile(join(root, "public/unrelated.txt"), "utf8"), "keep");
    await writeFile(join(root, ".public-assets.json"), '["../outside.txt"]');
    await assert.rejects(syncPublic(root), /escapes public/);
  } finally {
    // This temporary directory is created and owned by this test; validate before cleanup.
    const rel = relative(resolve(tmpdir()), resolve(root));
    assert.ok(rel.startsWith("rukia-assets-") && !rel.includes(sep));
    await rm(root, { recursive: true, force: true });
  }
});
