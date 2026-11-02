import { cp, mkdir, access, readdir, readFile, writeFile, unlink, lstat } from "node:fs/promises";
import { resolve, dirname, relative, isAbsolute, sep } from "node:path";
import { pathToFileURL } from "node:url";

export async function syncPublic(root = process.cwd()) {
  const output = resolve(root, "public");
  const manifest = resolve(root, ".public-assets.json");
  try {
    await access(resolve(output, "index.html"));
    throw new Error("public/ contains a Hugo build. Move that generated directory aside before starting Next.js.");
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const files = [];
  async function walk(directory, prefix) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error("Static assets must not contain symbolic links");
      const name = prefix + entry.name;
      if (entry.isDirectory()) await walk(resolve(directory, entry.name), name + "/");
      else files.push([name, resolve(directory, entry.name)]);
    }
  }
  await walk(resolve(root, "static/img"), "img/");
  files.push(["img/avatar.jpg", resolve(root, "assets/img/avatar.jpg")]);
  let previous = [];
  try { previous = JSON.parse(await readFile(manifest, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!Array.isArray(previous) || !previous.every((name) => typeof name === "string")) throw new Error("Invalid assets manifest");
  async function target(name) {
    const result = resolve(output, name);
    const rel = relative(output, result);
    if (!rel || isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`)) throw new Error("Asset escapes public directory");
    for (let directory = result; ; directory = dirname(directory)) {
      try { if ((await lstat(directory)).isSymbolicLink()) throw new Error("Symlinks are not allowed in generated assets"); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      if (directory === output) break;
    }
    return result;
  }
  const next = new Set(files.map(([name]) => name));
  const obsolete = await Promise.all(previous.filter((name) => !next.has(name)).map(target));
  for (const [name, source] of files) {
    const destination = await target(name);
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination);
  }
  for (const file of obsolete) {
    try { await unlink(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  await writeFile(manifest, JSON.stringify([...next].sort(), null, 2) + "\n");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await syncPublic();
  console.log("Synced managed images to public/.");
}
