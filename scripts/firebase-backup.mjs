// Read-only backup of PitchPin on Firebase Hosting (free Spark plan = static files only).
// Snapshots the public pages of the live site (home, Explore, every turf, legal pages) with their CSS/JS,
// reads live slots from the main site, and hands anything that needs an account or the database to the main site.
//
//   npm run backup:firebase          # snapshot + deploy to https://pitchpin.web.app
//   node scripts/firebase-backup.mjs --no-deploy
import { execSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const MAIN = "https://pitchpins.vercel.app";
const OUT = "firebase-backup/public";
const STATIC_PAGES = ["/", "/turfs", "/partner", "/privacy", "/terms"];

const assets = new Set([
  "/manifest.webmanifest", "/icon.svg", "/apple-icon.png", "/sw.js", "/offline.html",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png",
  "/screenshots/phone-home.webp", "/screenshots/phone-explore.webp", "/screenshots/wide-home.webp", "/screenshots/wide-explore.webp",
]);
const assetRe = /["'(](\/(?:_next\/static|icons|fonts|splash)\/[^"'()\s\\]+)/g;

async function get(path) {
  const res = await fetch(MAIN + path, { headers: { "user-agent": "PitchPin-backup" } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res;
}

// Injected first thing in <head>: live data from the main site, and a seamless hand-off for anything that needs the server.
const handoff = `<script>(function () {
  var MAIN = ${JSON.stringify(MAIN)};
  // Live slots: API calls go to the main site (it allows this origin).
  var f = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === "string" && input.indexOf("/api/") === 0) input = MAIN + input;
    return f.call(this, input, init);
  };
  // Search and filters are worked out on the server: continue on the main site.
  if (location.pathname.indexOf("/turfs") === 0 && location.search) location.replace(MAIN + location.pathname + location.search);
  // Signing in, holding a slot or paying happens on the main site.
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button");
    if (b && /^(Hold for|Pay|Sign in|Create account|Find a turf)/.test((b.textContent || "").trim())) {
      e.preventDefault(); e.stopPropagation();
      var form = b.closest("form");
      var q = form && form.querySelector("input[type=search]");
      location.href = q && q.value ? MAIN + "/turfs?q=" + encodeURIComponent(q.value) : MAIN + location.pathname + location.search;
    }
  }, true);
})();</script>`;

function save(path, body) {
  const file = path === "/" ? join(OUT, "index.html") : path.endsWith(".html") || /\.[a-z0-9]+$/i.test(path) ? join(OUT, path) : join(OUT, path, "index.html");
  return mkdir(dirname(file), { recursive: true }).then(() => writeFile(file, body));
}

async function snapshotPage(path) {
  let html = await (await get(path)).text();
  for (const m of html.matchAll(assetRe)) assets.add(m[1].replace(/&amp;/g, "&"));
  html = html.replace("<head>", `<head>${handoff}`);
  await save(path, html);
}

async function main() {
  await rm(OUT, { recursive: true, force: true });

  // Every turf linked from Explore.
  const explore = await (await get("/turfs")).text();
  const turfs = [...new Set([...explore.matchAll(/href="(\/turf\/[a-z0-9-]+)/g)].map((m) => m[1]))];
  const pages = [...STATIC_PAGES, ...turfs];
  console.log(`Snapshotting ${pages.length} pages (${turfs.length} turfs)…`);

  for (let i = 0; i < pages.length; i += 8) await Promise.all(pages.slice(i, i + 8).map(snapshotPage));

  // Assets, plus anything CSS pulls in (fonts) — repeat until nothing new turns up.
  const done = new Set();
  while ([...assets].some((a) => !done.has(a))) {
    const batch = [...assets].filter((a) => !done.has(a));
    await Promise.all(
      batch.map(async (a) => {
        done.add(a);
        try {
          const res = await get(a);
          const buf = Buffer.from(await res.arrayBuffer());
          if (a.endsWith(".css")) {
            // Fonts are referenced relative to the stylesheet, e.g. url(../media/x.woff2).
            for (const m of buf.toString("utf8").matchAll(/url\(\s*["']?([^)"']+?)["']?\s*\)/g)) {
              if (m[1].startsWith("data:")) continue;
              const abs = new URL(m[1], MAIN + a);
              if (abs.origin === MAIN) assets.add(abs.pathname);
            }
          }
          await save(a.split("?")[0], buf);
        } catch (err) {
          console.warn("  skipped asset", a, err.message);
        }
      }),
    );
  }
  console.log(`Saved ${pages.length} pages and ${done.size} assets to ${OUT}`);

  if (!process.argv.includes("--no-deploy")) {
    execSync("npx -y firebase-tools@latest deploy --only hosting:pitchpin --project luxorandco-store", { stdio: "inherit" });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
