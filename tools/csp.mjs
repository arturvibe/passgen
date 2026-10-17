// Recomputes the CSP hashes for the inline <script> and <style> in index.html.
//   node tools/csp.mjs          rewrite index.html with the current hashes
//   node tools/csp.mjs --check  exit 1 if the hashes are out of date
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("../index.html", import.meta.url));
const html = readFileSync(file, "utf8");

function inline(tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  const blocks = [...html.matchAll(re)];
  if (blocks.length !== 1) throw new Error(`expected exactly one inline <${tag}>, found ${blocks.length}`);
  return blocks[0][1];
}
const hash = (s) => "sha256-" + createHash("sha256").update(s, "utf8").digest("base64");

const want = {
  script: hash(inline("script")),
  style: hash(inline("style")),
};
const updated = html
  .replace(/(script-src ')sha256-[^']*(')/, `$1${want.script}$2`)
  .replace(/(style-src ')sha256-[^']*(')/, `$1${want.style}$2`);

if (process.argv.includes("--check")) {
  if (updated !== html) {
    console.error("CSP hashes in index.html are stale; run: node tools/csp.mjs");
    process.exit(1);
  }
  console.log("CSP hashes OK");
} else {
  writeFileSync(file, updated);
  console.log(`script-src '${want.script}'\nstyle-src '${want.style}'`);
}
