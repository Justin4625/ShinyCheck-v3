// Smoke test: drives the whole app in headless Chrome with a fixed demo collection, fixed clock
// and seeded randomness, and fails on any JavaScript error or broken expectation.
// No dependencies: Node 22+ (built-in WebSocket/fetch) and Google Chrome.
//
//   node tests/smoke.mjs                      run it (exit code 1 on failure)
//   node tests/smoke.mjs --record base.json   also save every step's page state
//   node tests/smoke.mjs --compare base.json  and compare against a saved run, e.g. before and
//                                             after a refactor that shouldn't change anything
//   node tests/smoke.mjs --shots dir          save a screenshot after every step (to compare looks)
//   CHROME=/path/to/chrome node tests/smoke.mjs
//
// It serves the repo itself on a free port and runs in local mode (no Firebase sign-in).
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const RECORD = flag("--record"), COMPARE = flag("--compare"), SHOTS = flag("--shots");
const CHROME = process.env.CHROME || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].find(existsSync);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- Static server (GitHub Pages-like: unknown paths get 404.html) ----------
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  // Local mode: no Firebase project, so no sign-in gate and nothing leaves the machine.
  if (path === "/firebase-config.js") {
    res.writeHead(200, { "content-type": "text/javascript" });
    return res.end("export const firebaseConfig = null, googleClientId = null, appCheckSiteKey = null, vapidKey = null;");
  }
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/html" });
    res.end(await readFile(join(ROOT, "404.html")));
  }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

// ---------- Chrome + DevTools protocol ----------
const profile = await mkdtemp(join(tmpdir(), "shinycheck-test-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run",
  "--no-default-browser-check", "--hide-scrollbars", "--lang=en-US", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
let port;
for (let i = 0; i < 100 && !port; i++) {
  await sleep(100);
  try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; } catch {}
}
if (!port) throw new Error("Chrome didn't start");
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0;
const pending = new Map(), errors = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map(a => a.value ?? a.description).join(" "));
};
const cdp = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, m => m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result));
  ws.send(JSON.stringify({ id, method, params }));
});
const js = async (expr, wait = 0) => {
  const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`${expr.slice(0, 80)}…: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  if (wait) await sleep(wait);
  return r.result.value;
};
await cdp("Runtime.enable");
await cdp("Page.enable");
await cdp("Emulation.setTimezoneOverride", { timezoneId: "Europe/Amsterdam" });
await cdp("Emulation.setLocaleOverride", { locale: "en-US" });
await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "dark" }] });
// Fixed clock (advance with __tick(ms)) and seeded randomness, so every run renders the same.
await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
  let now = Date.UTC(2026, 8, 30, 12, 0, 0), s = 42;
  const D = Date;
  function F(...a) { return new.target ? (a.length ? new D(...a) : new D(now)) : new D(now).toString(); }
  F.prototype = D.prototype; F.now = () => now; F.UTC = D.UTC; F.parse = D.parse;
  window.Date = F;
  window.__tick = ms => { now += ms; };
  Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
})();` });

// ---------- Demo collection ----------
const SEED = `(() => {
  localStorage.clear();
  const id = k => DEX.find(m => m.key === k).id, day = 864e5, t = Date.now();
  const sh = {}, add = (g, k, e) => (sh[g + ":" + id(k)] = sh[g + ":" + id(k)] || []).push(e);
  add("sv", "vivillon", { count: 412, time: 3700, odds: 1365, method: "Wild · Shiny Charm", ts: t - 20 * day, alt: "marine" });
  add("sv", "vivillon", { count: 133, time: 1200, odds: 1365, ts: t - 14 * day });
  add("lza", "vivillon", { count: 980, time: 9000, odds: 4096, ts: t - 6 * day, alt: "fancy" });
  add("sv", "pikachu", { count: 50, time: 400, odds: 4096, ts: t - 300 * day, alt: "female" });
  add("swsh", "raichu", { count: 2000, time: 20000, odds: 1365, method: "Masuda · Shiny Charm", ts: t - 500 * day });
  add("pogo", "bulbasaur", { count: 0, time: 0, odds: null, ts: t - 40 * day });
  add("home", "mew", { count: 0, time: 0, odds: null, ts: t - 60 * day, manual: true });
  add("usum", "furfrou", { count: 30, time: 900, odds: 4096, ts: t - 2 * day, alt: "heart", phases: 1 });
  add("sv", "floette", { count: 300, time: 3000, odds: 1365, ts: t - 9 * day, alt: "red", evolvedFrom: [id("flabébé")] });
  add("bdsp", "gible", { count: 7000, time: 50000, odds: 4096, ts: t - 700 * day, caughtIn: "bdsp" });
  add("pla", "growlithe-1", { count: 90, time: 800, odds: 158, method: "Mass outbreak", ts: t - 100 * day });
  add("lgpe", "pidgey", { count: 3, time: 20, odds: 273, ts: t - 800 * day });
  localStorage.setItem("shinycheck-v3-shinies", JSON.stringify(sh));
  localStorage.setItem("shinycheck-v3-hunts", JSON.stringify({
    ["sv:" + id("sneasel")]: { count: 212, time: 1800, since: null, inc: 1, odds: 1365, setup: { m: "wild", charm: true }, updated: t - 3600e3 },
    ["lza:" + id("furfrou")]: { count: 40, time: 600, since: t - 60e3, inc: 2, odds: 4096, setup: { m: "wild" }, updated: t - 60e3, alt: "star" },
  }));
  localStorage.setItem("shinycheck-v3-prefs", JSON.stringify({ sv: { inc: 1, odds: 1365, setup: { m: "wild", charm: true } } }));
  localStorage.setItem("shinycheck-v3-seen-update", UPDATES[0].id);
})()`;

// ---------- Helpers used by the steps ----------
const states = {}, failures = [];
const expect = (ok, msg) => { if (!ok) failures.push(msg); };
// The page's state after a step: markup of the app (minus things that animate away) and storage.
async function capture(name) {
  const s = await js(`(() => {
    const clone = document.body.cloneNode(true);
    // Script tags are how the app is loaded, not what it shows.
    clone.querySelectorAll(".burst, #drFloat > *, script").forEach(n => n.remove());
    const comments = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT), dead = [];
    while (comments.nextNode()) dead.push(comments.currentNode);
    dead.forEach(n => n.remove());
    [...clone.childNodes].filter(n => n.nodeType === 3 && !n.textContent.trim()).forEach(n => n.remove());
    const html = clone.innerHTML
      .replace(/blob:[^"')\\s]+/g, "blob:*")
      .replace(/\\s+$/, "")
      .replace(/ class="([^"]*)"/g, (_, c) => ' class="' + c.split(/\\s+/).filter(x => x && !["show", "bump", "pop", "tilt"].includes(x)).join(" ") + '"');
    const store = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); store[k] = localStorage.getItem(k); }
    return { url: location.pathname + location.search, html, store: JSON.stringify(store, Object.keys(store).sort()) };
  })()`);
  states[name] = s;
  // With --shots, every named moment gets a screenshot too (not only the end of each step).
  if (SHOTS) {
    const { data } = await cdp("Page.captureScreenshot", { format: "png" });
    await writeFile(join(SHOTS, name.replace(/[^a-z0-9]+/gi, "-") + ".png"), Buffer.from(data, "base64"));
  }
  return s;
}
const click = (sel, wait = 250) => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) throw new Error("no element: " + ${JSON.stringify(sel)}); e.click(); })()`, wait);
const exists = sel => js(`!!document.querySelector(${JSON.stringify(sel)})`);
const text = sel => js(`(document.querySelector(${JSON.stringify(sel)}) || {}).textContent || ""`);
const key = (k, wait = 150) => js(`document.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(k)}, bubbles: true }))`, wait);
const type = (sel, value, wait = 300) => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(value)}; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); })()`, wait);
const go = async (path, wait = 1200) => {
  await cdp("Page.navigate", { url: ORIGIN + path });
  await sleep(wait);
  await js(`document.getElementById("gate").hidden = true; document.body.classList.remove("gated", "locked")`);
};
const nav = (path, wait = 350) => js(`history.pushState(null, "", "/${path}"); dispatchEvent(new PopStateEvent("popstate"))`, wait);
const openEntry = async k => {
  await nav("");
  await type("#q", await js(`DEX.find(m => m.key === ${JSON.stringify(k)}).name`));
  await click(`.pcard[data-id="${await js(`DEX.find(m => m.key === ${JSON.stringify(k)}).id`)}"]`, 400);
};
const size = (w, h, mobile) => cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });

// ---------- Steps ----------
const steps = [];
const step = (name, fn) => steps.push([name, fn]);

step("home", async () => {
  await size(1280, 900, false);
  await go("/");
  await js(SEED);
  await go("/");
  expect(await js(`document.querySelectorAll("#cards .pcard").length`) > 1000, "Shiny Dex shows every entry");
  expect((await text("#statCaught")) === "10", `Shiny Dex counts the 10 entries with a shiny, got ${await text("#statCaught")}`);
});
step("home: search + region + filters", async () => {
  await type("#q", "vivi");
  expect(await js(`document.querySelectorAll("#cards .pcard").length`) === 1, "search finds Vivillon");
  await type("#q", "");
  await click('#regions [data-gen="6"]');
  await click("#fMissing");
  await click("#fForms");
  await click("#fForms");
  await click("#fMissing");
  await click('#regions [data-gen="0"]');
  await click("#recShuffle");
});
step("home: share across games", async () => { await click("#fShare"); await click("#fShare"); });
for (const g of ["hgss", "bw", "bw2", "xy", "oras", "sm", "usum", "lgpe", "swsh", "bdsp", "pla", "sv", "lza"]) {
  step(`game ${g}`, async () => {
    await nav(g, 500);
    expect(await exists(".dex-tabs .seg, #dexTabs .seg"), `${g}: dex tabs`);
    const tabs = await js(`[...document.querySelectorAll("#dexTabs .seg")].map(b => b.dataset.tab)`);
    for (const t of tabs) { await click(`#dexTabs .seg[data-tab="${t}"]`, 200); await capture(`game ${g} tab ${t}`); }
    await click('#dexTabs .seg[data-tab=""], #dexTabs .seg[data-tab="P"]', 200);
  });
}
step("game sv: toggles + search", async () => {
  await nav("sv", 400);
  await click("#gForms"); await capture("sv outside on"); await click("#gForms");
  await click("#gMissing"); await capture("sv missing"); await click("#gMissing");
  await type("#gq", "sneasel");
});
step("roulette", async () => {
  await nav("sv", 400);
  await click("#randomHunt", 600);
  expect(await js(`document.getElementById("roulette").classList.contains("landed")`), "roulette lands");
  await capture("roulette landed");
  await click("#rlGo", 400);
  expect(await js(`document.getElementById("drawer").classList.contains("open")`), "roulette opens the Hunt Deck");
  await key("Escape");
});
step("hunt deck: start, count, pause, gotcha", async () => {
  await nav("sv", 400);
  await type("#gq", "tinkatink");
  await click(`#gameCards .pcard`, 400);
  expect(await js(`document.getElementById("drawer").classList.contains("open")`), "Hunt Deck opens");
  await click('#drSetup [data-hm="masuda"]'); await click('#drSetup [data-hm="wild"]');
  await click('#drSetup [data-hb="charm"]');
  await click('#drSetup [data-hl="sparkling:3"]');
  await click("#drPlus"); await click("#drPlus"); await click("#drPlus"); await click("#drMinus");
  await js(`__tick(125000)`);
  await click("#drPlay");
  // The first + starts the timer, the next two count, −1 takes one off.
  expect((await text("#drCount")) === "1", `count is 1, got ${await text("#drCount")}`);
  await capture("hunt deck paused");
  await key(" "); await key("+"); await key("-"); await key("p");
  await type("#drSetCount", "40"); await type("#drInc", "3");
  await click("#drGotcha"); await click("#drGotcha", 600);
  expect(await js(`JSON.parse(localStorage.getItem("shinycheck-v3-shinies"))["sv:" + DEX.find(m => m.key === "tinkatink").id]?.length === 1`), "Gotcha logs the shiny");
  await capture("hunt deck after gotcha");
  await click("#drLog [data-share]", 1200);
  expect(!(await js(`document.getElementById("shareDlg").hidden`)), "share card opens");
  await capture("share card");
  await key("Escape", 300);
  await key("Escape");
});
step("hunt deck: pace and ETA", async () => {
  await nav("sv", 400);
  await type("#gq", "sneasel");
  await click(`#gameCards .pcard`, 400);
  // Demo hunt: 212 encounters in 30 minutes at 1/1365 → 424 an hour.
  const stats = await js(`[...document.querySelectorAll("#drPaceStats b")].map(b => b.textContent).join(" | ")`);
  expect(stats === "424 | ~2h 43m | ~3h 13m", `pace stats, got ${stats}`);
  expect((await text("#drPaceNote")).includes("timer shows about 3h 13m"), `pace note gives the timer target, got ${await text("#drPaceNote")}`);
  await click("#drPlay");
  await js(`document.getElementById("drPace").scrollIntoView({ block: "center" })`, 200);
  await capture("hunt deck pace");
  await click("#drPlay");
  await key("Escape");
});
step("hunt deck: more hunt methods", async () => {
  const odds = () => text("#drOddsShow");
  const open = async (g, q) => { await nav(g, 400); await type("#gq", q); await click("#gameCards .pcard", 400); };
  await open("usum", "rockruff");
  await click('#drSetup [data-hm="uw"]');
  expect((await odds()) === "1/100", `no-ring wormhole is 1%, got ${await odds()}`);
  await click('#drSetup [data-hl="ring:3"]');
  expect((await odds()) === "1/2.8", `aura wormhole at 5,000 ly is 36%, got ${await odds()}`);
  await js(`document.getElementById("drSetup").scrollIntoView({ block: "center" })`, 200);
  await capture("hunt deck ultra wormhole");
  await click('#drSetup [data-hm="wild"]');
  await key("Escape");
  await open("bdsp", "bidoof");
  await click('#drSetup [data-hm="radar"]');
  expect((await odds()) === "1/4,096", `a new radar chain starts at 0 (1/4,096), got ${await odds()}`);
  await click('#drSetup [data-hl="chain:8"]');
  expect((await odds()) === "1/99", `radar chain 40 is 1/99, got ${await odds()}`);
  await click('#drSetup [data-hl="chain:6"]');
  expect((await odds()) === "1/400", `radar chain 38 is 1/400, got ${await odds()}`);
  await click('#drSetup [data-hm="wild"]');
  await key("Escape");
  await open("swsh", "skwovet");
  await click('#drSetup [data-hm="brilliant"]'); await click('#drSetup [data-hb="charm"]'); await click('#drSetup [data-hl="ko:5"]');
  expect((await odds()) === "1/456", `Brilliant Aura, 500+ battled, charm is 1/456, got ${await odds()}`);
  await click('#drSetup [data-hm="wild"]'); await click('#drSetup [data-hb="charm"]');
  await key("Escape");
  await open("hgss", "chikorita");
  await click('#drSetup [data-hm="masuda"]');
  expect((await odds()) === "1/1,639", `HeartGold & SoulSilver Masuda is 1/1,639, got ${await odds()}`);
  await click('#drSetup [data-hm="wild"]');
  await key("Escape");
  await open("bw", "snivy");
  expect((await odds()) === "1/8,192", `Black & White wild is 1/8,192, got ${await odds()}`);
  await click('#drSetup [data-hm="masuda"]');
  expect((await odds()) === "1/1,366", `Black & White Masuda is 1/1,366, got ${await odds()}`);
  await click('#drSetup [data-hm="wild"]');
  await key("Escape");
  await open("bw2", "snivy");
  await click('#drSetup [data-hm="masuda"]'); await click('#drSetup [data-hb="charm"]');
  expect((await odds()) === "1/1,024", `Black 2 & White 2 Masuda with charm is 1/1,024, got ${await odds()}`);
  await click('#drSetup [data-hm="wild"]');
  expect((await odds()) === "1/2,731", `Black 2 & White 2 wild with charm is 1/2,731, got ${await odds()}`);
  await click('#drSetup [data-hb="charm"]');
  await key("Escape");
  await open("xy", "pikachu");
  await click('#drSetup [data-hm="radar"]');
  expect((await text("#drChainN")) === "0" && (await odds()) === "1/4,096", `a new radar chain starts at 0 (1/4,096), got ${await text("#drChainN")} at ${await odds()}`);
  await click("#drPlus"); for (let i = 0; i < 35; i++) await click("#drPlus", 20);
  expect((await text("#drChainN")) === "35" && (await odds()) === "1/1,192", `35 encounters make a chain of 35 (1/1,192), got ${await text("#drChainN")} at ${await odds()}`);
  await capture("hunt deck radar chain");
  await click("#drChainBreak");
  expect((await text("#drChainN")) === "0" && (await text("#drCount")) === "35", `Chain broke resets the chain, not the count (${await text("#drChainN")}, ${await text("#drCount")})`);
  expect((await text("#drChainNote")).includes("broke 1×") && (await text("#drChainNote")).includes("longest 35"), `chain note, got ${await text("#drChainNote")}`);
  await click(".toast-action");
  expect((await text("#drChainN")) === "35", `Undo brings the chain back, got ${await text("#drChainN")}`);
  await click('#drSetup [data-hl="rchain:7"]');
  expect((await text("#drChainN")) === "40" && (await odds()) === "1/200", `picking 40 jumps the chain there (1/200), got ${await text("#drChainN")} at ${await odds()}`);
  await click("#drReset"); await click("#drReset");
  await click('#drSetup [data-hm="safari"]'); await click('#drSetup [data-hb="charm"]');
  expect((await odds()) === "1/586", `Friend Safari with charm is 1/586, got ${await odds()}`);
  await click('#drSetup [data-hm="wild"]'); await click('#drSetup [data-hb="charm"]');
  await key("Escape");
  await open("oras", "ralts");
  await click('#drSetup [data-hm="dexnav"]'); await click('#drSetup [data-hl="search:9"]');
  expect((await odds()) === "1/476", `DexNav at search level 999 is 1/476, got ${await odds()}`);
  await click('#drSetup [data-hb="charm"]'); await click('#drSetup [data-hl="dchain:2"]');
  expect((await odds()) === "1/51", `DexNav 999, 50th in chain, charm is 1/51, got ${await odds()}`);
  await js(`document.getElementById("drSetup").scrollIntoView({ block: "center" })`, 200);
  await capture("hunt deck dexnav");
  await click('#drSetup [data-hm="horde"]');
  expect((await odds()) === "1/274", `horde with charm is 1/274, got ${await odds()}`);
  await click('#drSetup [data-hm="wild"]'); await click('#drSetup [data-hb="charm"]');
  await key("Escape");
});
step("hunt deck: forms, phases, prev/next, reset, cancel", async () => {
  await nav("sv", 400);
  await type("#gq", "vivillon");
  await click(`#gameCards .pcard`, 400);
  await click("#drAlt .fp-btn"); await type("#drAlt .fp-q", "pol"); await click('#drAlt .fp-opt[data-v="polar"]');
  await click("#drPlus"); await click("#drPlus");
  await click("#drPhase"); await type("#drPhaseQ", "pikachu"); await click("#drPhaseList [data-phase]", 400);
  await capture("hunt deck with phase");
  await click("#drNext", 300); await click("#drPrev", 300);
  await click("#drReset"); await click("#drReset", 300);
  await click("#drPlus"); await click("#drCancel"); await click("#drCancel", 300);
  await click(".toast-action", 300);
  await capture("hunt deck restored");
  await key("Escape");
});
step("active hunts", async () => {
  await nav("hunts", 500);
  expect(await js(`document.querySelectorAll("#huntCards .pcard").length`) >= 2, "Active hunts lists the hunts");
  await click("#huntCards .pcard", 400); await key("Escape");
});
step("stats", async () => {
  await nav("stats", 700);
  const years = await js(`[...document.querySelectorAll("#stYears [data-year], #stYears button")].map(b => b.textContent)`);
  expect(years.length > 1, "Stats has year tabs");
  await click("#stYears button:last-child", 400); await capture("stats last year");
  await click("#stYears button:first-child", 400);
  await click("#stShare", 1200); await capture("wrapped card"); await key("Escape", 300);
});
step("what's new page", async () => {
  await nav("updates", 400);
  expect(await js(`document.querySelectorAll(".wn-item").length`) === (await js(`UPDATES.length`)), "every update listed");
  expect(await js(`document.querySelector('.side-item[data-page="updates"]').classList.contains("active")`), "sidebar marks What's new");
});
step("what's new popup once", async () => {
  await js(`localStorage.removeItem("shinycheck-v3-seen-update"); const p = JSON.parse(localStorage.getItem("shinycheck-v3-prefs")); delete p.seenUpdate; localStorage.setItem("shinycheck-v3-prefs", JSON.stringify(p))`);
  await go("/", 2600);
  expect(!(await js(`document.getElementById("wnDlg").hidden`)), "popup shows for someone with data");
  await capture("whats new popup");
  // The newest update's button (if it has one) closes the popup and goes where it points.
  if (await js(`!!document.querySelector("#wnDlg [data-wn-go]")`)) await click("#wnDlg [data-wn-go]", 700);
  else await key("Escape", 300);
  expect(await js(`document.getElementById("wnDlg").hidden`), "the popup closes");
  await go("/", 2600);
  expect(await js(`document.getElementById("wnDlg").hidden`), "popup shows only once");
});
step("dex entry: forms", async () => {
  await openEntry("vivillon");
  expect(await js(`document.getElementById("entry").classList.contains("open")`), "Dex Entry opens");
  await click('[data-alt-view="marine"]', 300);
  expect((await js(`document.getElementById("enImg").src`)).endsWith("vivillon-marine.png"), "tapping a form shows its shiny");
  await capture("entry form selected");
  await click("[data-alts-all]", 300);
  await click('[data-alt-view="marine"]', 300);
});
step("dex entry: add, edit, move, delete", async () => {
  await openEntry("vivillon");
  await click("[data-add-open]", 300);
  await click('.en-add-form .gp-tile input[value="sv"]', 200);
  await click('#enSetup [data-hb="charm"]', 200);
  await click(".en-add-form .fp-btn"); await click('.en-add-form .fp-opt[data-v="garden"]');
  await type('.en-add-form [name="count"]', "77");
  await click("[data-add-save]", 500);
  await capture("entry added");
  await click(".en-row", 300);
  await click(".en-edit .fp-btn"); await click('.en-edit .fp-opt[data-v="modern"]');
  await type('.en-edit [name="count"]', "88");
  await click(".en-edit [data-save]", 400);
  await click(".en-row", 300);
  await click('.en-edit [data-move="home"]', 400);
  await click(".toast-action", 400);
  await capture("entry move undone");
  await click(".en-row", 300);
  await click(".en-edit [data-delete]"); await click(".en-edit [data-delete]", 400);
  await capture("entry deleted");
  await key("Escape");
});
step("dex entry: evolve and undo", async () => {
  await openEntry("floette");
  await click(".en-row", 300);
  await click(".en-edit [data-devolve]", 500);
  await capture("devolved to flabebe");
  await click(".en-edit [data-evolve]", 500);
  await capture("evolved again");
  await click('.en-form[data-form]:not(.active)', 300).catch(() => {});
  await click("[data-hunt]", 700);
  expect(await js(`document.getElementById("drawer").classList.contains("open")`), "Hunt it in opens the Hunt Deck");
  await key("Escape");
});
step("dialogs", async () => {
  await nav("", 300);
  for (const [open, dlg, close] of [["#backupsOpen", "#backups", "Escape"], ["#pushOpen", "#pushDlg", "Escape"], ["#v2Open", "#v2Import", "Escape"]]) {
    if (!(await exists(open)) || await js(`document.querySelector(${JSON.stringify(open)}).hidden`)) continue;
    await click(open, 400);
    await capture(`dialog ${open}`);
    await key(close, 300);
  }
  await click("#themeBtn", 200); await capture("light theme"); await click("#themeBtn", 200);
});
step("export / import round trip", async () => {
  const before = await js(`JSON.stringify(window.ShinyApp.snapshot())`);
  await js(`window.ShinyApp.applyData(JSON.parse(${JSON.stringify(before)}))`, 400);
  const after = await js(`JSON.stringify(window.ShinyApp.snapshot())`);
  expect(before === after, "snapshot → applyData → snapshot is unchanged");
  states["snapshot"] = { html: "", store: after, url: "" };
});
step("phone layout", async () => {
  await size(390, 844, true);
  await nav("sv", 500);
  await capture("phone sv");
  await type("#gq", "sneasel");
  await click("#gameCards .pcard", 500);
  expect(await js(`!!document.querySelector(".dr-foot .dr-count-actions")`), "thumb dock on phones");
  await capture("phone hunt deck");
  for (const w of [390, 360]) {
    await size(w, 800, true);
    await js(`document.getElementById("drPace").scrollIntoView({ block: "center" })`, 200);
    const wide = await js(`[...document.querySelectorAll("#drawer .dr-scroll *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).length`);
    expect(wide === 0, `nothing wider than a ${w}px phone in the Hunt Deck (${wide})`);
    const cut = await js(`[...document.querySelectorAll("#drPaceStats b")].filter(b => b.scrollWidth > b.clientWidth).length`);
    expect(cut === 0, `pace numbers fit at ${w}px (${cut} cut off)`);
    await capture(`phone hunt deck pace ${w}`);
  }
  await size(360, 800, true);
  await key("Escape");
  await nav("usum", 400); await type("#gq", "rockruff"); await click("#gameCards .pcard", 500);
  await click('#drSetup [data-hm="uw"]');
  await js(`document.getElementById("drSetup").scrollIntoView({ block: "center" })`, 200);
  const wideSetup = await js(`[...document.querySelectorAll("#drSetup *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).length`);
  expect(wideSetup === 0, `wormhole chips fit a 360px phone (${wideSetup})`);
  await capture("phone ultra wormhole 360");
  await click('#drSetup [data-hm="wild"]');
  await key("Escape");
  await nav("xy", 400);
  await capture("phone xy 360");
  await type("#gq", "pikachu"); await click("#gameCards .pcard", 500);
  await click('#drSetup [data-hm="radar"]');
  await js(`document.getElementById("drSetup").scrollIntoView({ block: "center" })`, 200);
  const wideRadar = await js(`[...document.querySelectorAll("#drSetup *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).length`);
  expect(wideRadar === 0, `X & Y method and radar chips fit a 360px phone (${wideRadar})`);
  const chainRow = await js(`(() => { const r = document.getElementById("drChain").getBoundingClientRect(), b = document.getElementById("drChainBreak").getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth && b.height >= 40; })()`);
  expect(chainRow, "radar chain row fits a 360px phone with a 40px+ button");
  await capture("phone xy radar 360");
  await click('#drSetup [data-hm="wild"]');
  await key("Escape");
  await nav("oras", 400);
  await capture("phone oras 360");
  await type("#gq", "ralts"); await click("#gameCards .pcard", 500);
  await click('#drSetup [data-hm="dexnav"]');
  await js(`document.getElementById("drSetup").scrollIntoView({ block: "center" })`, 200);
  const wideNav = await js(`[...document.querySelectorAll("#drSetup *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).length`);
  expect(wideNav === 0, `DexNav chips fit a 360px phone (${wideNav})`);
  await capture("phone dexnav 360");
  await click('#drSetup [data-hm="wild"]');
  await size(390, 844, true);
  await key("Escape");
  await openEntry("furfrou");
  await capture("phone entry");
  const overflow = await js(`[...document.querySelectorAll("#entry.open *")].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).length`);
  expect(overflow === 0, `nothing wider than the phone in Dex Entry (${overflow})`);
  await key("Escape");
  await size(1280, 900, false);
});

// ---------- Run ----------
let failed = 0;
for (const [name, fn] of steps) {
  const errBefore = errors.length, failBefore = failures.length;
  try {
    await fn();
    if (!states[name]) await capture(name);
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
  if (SHOTS) {
    const { data } = await cdp("Page.captureScreenshot", { format: "png" });
    await writeFile(join(SHOTS, name.replace(/[^a-z0-9]+/gi, "-") + ".png"), Buffer.from(data, "base64"));
  }
  const bad = errors.length > errBefore || failures.length > failBefore;
  if (bad) failed++;
  console.log(`${bad ? "✗" : "✓"} ${name}`);
  for (const e of errors.slice(errBefore)) console.log(`    JS error: ${e.split("\n").slice(0, 3).join(" | ")}`);
  for (const f of failures.slice(failBefore)) console.log(`    ${f}`);
}

if (RECORD) await writeFile(RECORD, JSON.stringify(states));
let diffs = 0;
if (COMPARE) {
  const base = JSON.parse(await readFile(COMPARE, "utf8"));
  const h = s => createHash("sha1").update(s).digest("hex").slice(0, 10);
  for (const name of new Set([...Object.keys(base), ...Object.keys(states)])) {
    const a = base[name], b = states[name];
    if (!a || !b) { diffs++; console.log(`≠ ${name}: only in ${a ? "the saved run" : "this run"}`); continue; }
    for (const part of ["url", "html", "store"]) {
      if (a[part] === b[part]) continue;
      diffs++;
      let i = 0;
      while (a[part][i] === b[part][i]) i++;
      console.log(`≠ ${name} (${part} ${h(a[part])} → ${h(b[part])})\n    was: …${a[part].slice(Math.max(0, i - 80), i + 120)}\n    now: …${b[part].slice(Math.max(0, i - 80), i + 120)}`);
    }
  }
  console.log(diffs ? `${diffs} difference(s) with ${COMPARE}` : `Identical to ${COMPARE} (${Object.keys(states).length} states)`);
}

ws.close();
chrome.kill();
server.close();
await rm(profile, { recursive: true, force: true }).catch(() => {});
console.log(failed || diffs ? `\n${failed} step(s) failed${diffs ? `, ${diffs} difference(s)` : ""}` : `\nAll ${steps.length} steps passed`);
process.exit(failed || diffs ? 1 : 0);
