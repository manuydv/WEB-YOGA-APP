// vite-plugin-pwa injects the same shared /manifest.webmanifest link into
// every HTML entry point it builds, including checkin.html and
// trainer.html — but that manifest's start_url is "/", which is what iOS
// reads when deciding where a saved home-screen icon launches. For the
// member/trainer portals we want classic "bookmark the current page"
// behavior instead (no manifest to override it with the owner app's
// start_url), so strip that one injected tag from just those two files
// after the build.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const manifestLinkRe = /<link rel="manifest"[^>]*>/;

for (const file of ["checkin.html", "trainer.html"]) {
  const path = join(distDir, file);
  const html = readFileSync(path, "utf8");
  if (!manifestLinkRe.test(html)) {
    console.warn(`${file}: no <link rel="manifest"> tag found to strip`);
    continue;
  }
  writeFileSync(path, html.replace(manifestLinkRe, ""));
  console.log(`${file}: stripped manifest link`);
}
