// Headless screenshot helper for visually verifying the UI during development.
//
// Usage (dev server must be running, default http://localhost:5173):
//   node scripts/shot.mjs                          # home, dark, 1280 wide, full page
//   node scripts/shot.mjs --route /t/base64        # a specific tool (hash route)
//   node scripts/shot.mjs --width 700 --theme light
//   node scripts/shot.mjs --viewport               # viewport-only (not full page)
//   node scripts/shot.mjs --out home-check         # custom output filename
//
// Output goes to .shots/<name>.png and the path is printed. Any runtime
// console errors / uncaught exceptions on the page are reported too, so this
// doubles as a quick render smoke-test.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : def;
}
const flag = (name) => process.argv.includes(`--${name}`);

const url = arg("url", "http://localhost:5173");
const route = arg("route", "/");
const width = parseInt(arg("width", "1280"), 10);
const height = parseInt(arg("height", "900"), 10);
const theme = arg("theme", "dark"); // light | dark | system
const fullPage = !flag("viewport");

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = path.join(root, ".shots");
await mkdir(outDir, { recursive: true });

const hashRoute = route.startsWith("/") ? route : `/${route}`;
const target = `${url}/#${hashRoute}`;
const defaultName = `${hashRoute.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "home"}-${theme}-${width}`;
const outPath = path.join(outDir, `${arg("out", defaultName)}.png`);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width, height },
  colorScheme: theme === "system" ? "no-preference" : theme,
  deviceScaleFactor: 1.5,
});
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`[console.error] ${m.text()}`);
});

// Seed the persisted theme before the app's inline pre-paint script reads it.
await page.addInitScript((t) => {
  try {
    localStorage.setItem("sappr.theme", t);
  } catch {}
}, theme);

// Optionally seed the cracker preference (hashcat | john | both).
const cracker = arg("cracker", null);
if (cracker) {
  await page.addInitScript((c) => {
    try {
      localStorage.setItem("sappr.settings", JSON.stringify({ cracker: c }));
    } catch {}
  }, cracker);
}

await page.goto(target, { waitUntil: "load" });
await page.waitForSelector("header", { timeout: 8000 }); // app mounted
await page.waitForTimeout(450); // fonts + fade-in settle

// Optional interactions for testing flows (palette, etc.).
const click = arg("click", null);
const press = arg("press", null);
const typeText = arg("type", null);
const thenClick = arg("then-click", null);
if (click) await page.click(click);
if (press) await page.keyboard.press(press);
if (typeText) await page.keyboard.type(typeText, { delay: 40 });
if (thenClick) {
  await page.waitForTimeout(300);
  await page.click(thenClick);
}
if (click || press || typeText || thenClick) await page.waitForTimeout(500);

await page.screenshot({ path: outPath, fullPage });
await browser.close();

console.log(outPath);
if (errors.length) {
  console.log(`\nPAGE ERRORS (${errors.length}):\n${errors.join("\n")}`);
} else {
  console.log("No page errors.");
}
