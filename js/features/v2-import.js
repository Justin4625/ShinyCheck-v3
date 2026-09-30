// Import shinies and hunts from ShinyCheck V2.
import { toast } from "../components/toast.js";
import { state } from "../core/state.js";
import { hk, hunts, isActive, prefs, saveHunts, saveShinies, shinies } from "../core/store.js";
import { $, esc, safe } from "../core/util.js";
import { mons } from "../model/dex.js";
import { GAME_INFO } from "../model/games.js";
import { render } from "../pages/router.js";

// V2 lives on the same origin (justin4625.github.io/ShinyCheck/), so its localStorage is
// readable here. V2 keys: <game>_shinyData_<id>_<n> {pokemonName, counter, timer, timestamp},
// <game>_shiny_<id> (count; GO may count shinies without data), <game>_hunt_<id> {counter, timer}.
// Ids are national dex numbers, or PokeAPI form ids (10091…) for regional forms.
// Nothing in V2 is changed; imported entries carry a "v2" marker so importing twice is harmless.
const V2_GAMES = { plza: "lza", sv: "sv", pla: "pla", pogo: "pogo" };
const V2_FORMS = {
  10091: "Alolan Rattata", 10092: "Alolan Raticate", 10100: "Alolan Raichu", 10101: "Alolan Sandshrew", 10102: "Alolan Sandslash",
  10103: "Alolan Vulpix", 10104: "Alolan Ninetales", 10105: "Alolan Diglett", 10106: "Alolan Dugtrio", 10107: "Alolan Meowth",
  10108: "Alolan Persian", 10109: "Alolan Geodude", 10110: "Alolan Graveler", 10111: "Alolan Golem", 10112: "Alolan Grimer",
  10113: "Alolan Muk", 10114: "Alolan Exeggutor", 10115: "Alolan Marowak",
  10161: "Galarian Meowth", 10162: "Galarian Ponyta", 10163: "Galarian Rapidash", 10164: "Galarian Slowpoke", 10165: "Galarian Slowbro",
  10166: "Galarian Farfetch'd", 10167: "Galarian Weezing", 10168: "Galarian Mr. Mime", 10169: "Galarian Articuno", 10170: "Galarian Zapdos",
  10171: "Galarian Moltres", 10172: "Galarian Slowking", 10173: "Galarian Corsola", 10174: "Galarian Zigzagoon", 10175: "Galarian Linoone",
  10176: "Galarian Darumaka", 10177: "Galarian Darmanitan", 10179: "Galarian Yamask", 10180: "Galarian Stunfisk",
  10229: "Hisuian Growlithe", 10230: "Hisuian Arcanine", 10231: "Hisuian Voltorb", 10232: "Hisuian Electrode", 10233: "Hisuian Typhlosion",
  10234: "Hisuian Qwilfish", 10235: "Hisuian Sneasel", 10236: "Hisuian Samurott", 10237: "Hisuian Lilligant", 10238: "Hisuian Zorua",
  10239: "Hisuian Zoroark", 10240: "Hisuian Braviary", 10241: "Hisuian Sliggoo", 10242: "Hisuian Goodra", 10243: "Hisuian Avalugg",
  10244: "Hisuian Decidueye", 10247: "Basculin|White Stripe", 10250: "Tauros|Paldean Combat Breed",
  10251: "!this form isn't in the Shiny Dex (only the Combat Breed is)", 10252: "!this form isn't in the Shiny Dex (only the Combat Breed is)",
  10253: "Paldean Wooper",
};
// → { m } or { reason }
function v2Entry(id) {
  id = +id;
  if (id <= 1025) {
    const base = mons.filter(m => +m.dex === id && !m.variant);
    const m = base.find(x => ["", "Original", "Basic"].includes(x.form)) || base[0];
    return m ? { m } : { reason: `No Pokémon #${id} in the Shiny Dex` };
  }
  const f = V2_FORMS[id];
  if (!f) return { reason: `Unknown V2 form id ${id}` };
  if (f.startsWith("!")) return { reason: f.slice(1) };
  const [name, form] = f.includes("|") ? f.split("|") : [f.slice(f.indexOf(" ") + 1), f.slice(0, f.indexOf(" "))];
  const m = mons.find(x => x.name === name && x.form === form);
  return m ? { m } : { reason: `${f} isn't in the Shiny Dex` };
}

// V2 data source: this browser's localStorage (same origin as V2), or the key/value
// map V2's bridge page sends back when V3 runs on its own domain.
const localV2 = () => ({ keys: safe(() => Object.keys(localStorage)) || [], get: k => safe(() => localStorage.getItem(k)) });
const remoteV2 = map => ({ keys: Object.keys(map), get: k => (k in map ? String(map[k]) : null) });

function scanV2(src = localV2()) {
  const plan = { shinies: [], hunts: [], skipped: [], already: 0, perGame: {} };
  const imported = new Set(Object.values(shinies).flat().map(s => s.v2).filter(Boolean));
  const keys = src.keys;
  const read = k => safe(() => JSON.parse(src.get(k)));
  const bump = (gid, what) => { const p = plan.perGame[gid] = plan.perGame[gid] || { shinies: 0, hunts: 0 }; p[what]++; };
  // Shinies: every <game>_shiny_<id> count, with data entries where V2 has them.
  for (const k of keys) {
    const mt = k.match(/^(plza|sv|pla|pogo)_shiny_(\d+)$/);
    if (!mt) continue;
    const [, prefix, id] = mt, gid = V2_GAMES[prefix], count = +src.get(k) || 0;
    const target = v2Entry(id);
    for (let n = 1; n <= count; n++) {
      const d = read(`${prefix}_shinyData_${id}_${n}`);
      const label = (d && d.pokemonName) || (target.m ? target.m.name : `#${id}`);
      if (!target.m) { plan.skipped.push({ gid, label, reason: target.reason }); continue; }
      const marker = `${prefix}_${id}_${n}`;
      if (imported.has(marker)) { plan.already++; continue; }
      plan.shinies.push({ gid, m: target.m, entry: {
        count: Math.max(0, +(d && d.counter) || 0), time: Math.max(0, +(d && d.timer) || 0),
        odds: null, ts: (d && +d.timestamp) || null, v2: marker,
      } });
      bump(gid, "shinies");
    }
  }
  // Hunts in progress (V2's timer only ran while the modal was open, so they come in paused).
  for (const k of keys) {
    const mt = k.match(/^(plza|sv|pla)_hunt_(\d+)$/);
    if (!mt) continue;
    const d = read(k);
    if (!d || !(+d.counter > 0 || +d.timer > 0)) continue;
    const [, prefix, id] = mt, gid = V2_GAMES[prefix], target = v2Entry(id);
    if (!target.m) { plan.skipped.push({ gid, label: `Hunt #${id}`, reason: target.reason }); continue; }
    if (isActive(hunts[hk(gid, target.m.id)])) { plan.already++; continue; }
    plan.hunts.push({ gid, m: target.m, hunt: {
      count: Math.max(0, +d.counter || 0), time: Math.max(0, +d.timer || 0), since: null,
      inc: 1, odds: (prefs[gid] || {}).odds || 4096, updated: +d.lastUpdated || Date.now(),
    } });
    bump(gid, "hunts");
  }
  return plan;
}

const v2 = { root: $("#v2Import"), plan: null, waiting: null };
// V2 still runs at justin4625.github.io/ShinyCheck/. On any other origin (shinycheck.nl)
// its data is reached through a small bridge page opened in a popup — a popup, because
// browsers partition the storage of cross-site iframes.
const V2_ORIGIN = "https://justin4625.github.io";
const V2_BRIDGE = V2_ORIGIN + "/ShinyCheck/v2-bridge.html";
const onV2Origin = location.origin === V2_ORIGIN;

function showV2Dialog() {
  v2.root.hidden = false;
  document.body.classList.add("drawer-open");
}
function openV2() {
  const local = scanV2();
  const found = local.shinies.length + local.hunts.length + local.already + local.skipped.length;
  if (found || onV2Origin) return previewV2(local);
  // Not on V2's origin and nothing local: offer to connect through the bridge.
  v2.plan = null;
  $("#v2Body").innerHTML = `<p class="v2-fine" style="font-size:14px">Your V2 shinies are stored in the browser on V2's own address. ShinyCheck can fetch them through a small window that opens for a second and closes by itself.</p>
      <p class="v2-fine">Use the same browser and device where you used V2.</p>
      <button class="v2-connect" id="v2Connect">Connect to ShinyCheck V2 ✦</button>
      <p class="v2-fine" id="v2Status"></p>`;
  $("#v2Go").hidden = true;
  $("#v2Connect").onclick = connectV2;
  showV2Dialog();
}
function connectV2() {
  const w = window.open(V2_BRIDGE, "shinycheck-v2", "popup,width=420,height=320");
  const status = $("#v2Status");
  if (!w) { status.textContent = "Your browser blocked the window. Allow pop-ups for this site and try again."; return; }
  status.textContent = "Waiting for V2…";
  clearTimeout(v2.waiting);
  v2.waiting = setTimeout(() => {
    if ($("#v2Status")) $("#v2Status").textContent = "No answer from V2. Close the small window if it's still open and try again.";
  }, 15000);
}

function previewV2(plan) {
  v2.plan = plan;
  const total = plan.shinies.length + plan.hunts.length;
  const rows = Object.entries(plan.perGame)
    .sort(([a], [b]) => (GAME_INFO[b].released || "").localeCompare(GAME_INFO[a].released || ""))
    .map(([gid, c]) => `<tr style="--accent:${GAME_INFO[gid].accent}"><td><span class="v2-dot"></span>${esc(GAME_INFO[gid].name)}</td><td>${c.shinies}</td><td>${c.hunts}</td></tr>`).join("");
  $("#v2Body").innerHTML = total || plan.already || plan.skipped.length ? `
      ${total ? `<table class="v2-table"><thead><tr><th>Game</th><th>Shinies</th><th>Hunts</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
      ${plan.already ? `<p class="v2-note ok">${plan.already} already imported — they won't be added twice.</p>` : ""}
      ${plan.skipped.length ? `<div class="v2-note warn"><b>${plan.skipped.length} can't be imported:</b><ul>${plan.skipped.map(s => `<li>${esc(s.label)} (${esc(GAME_INFO[s.gid].name)}) — ${esc(s.reason)}</li>`).join("")}</ul></div>` : ""}
      <p class="v2-fine">Shinies keep their encounters, time and date. V2 didn't track odds, so those stay empty. Hunts come in paused. Your V2 data isn't changed.</p>`
    : `<p class="v2-empty">No ShinyCheck V2 data found in this browser. Open this page in the browser (and device) where you used V2.</p>`;
  $("#v2Go").hidden = !total;
  $("#v2Go").textContent = `Import ${plan.shinies.length} ${plan.shinies.length === 1 ? "shiny" : "shinies"}${plan.hunts.length ? ` & ${plan.hunts.length} ${plan.hunts.length === 1 ? "hunt" : "hunts"}` : ""} ✦`;
  showV2Dialog();
}
function closeV2() {
  v2.root.hidden = true;
  document.body.classList.remove("drawer-open");
}
function runV2() {
  const plan = v2.plan;
  if (!plan) return;
  for (const { gid, m, entry } of plan.shinies) {
    const k = hk(gid, m.id);
    (shinies[k] = shinies[k] || []).push(entry);
    shinies[k].sort((x, y) => (x.ts || 0) - (y.ts || 0));
  }
  for (const { gid, m, hunt } of plan.hunts) hunts[hk(gid, m.id)] = hunt;
  saveShinies();
  saveHunts();
  window.Cloud && window.Cloud.flush();
  closeV2();
  render();
  toast(`Imported ${plan.shinies.length} shinies and ${plan.hunts.length} hunts from V2 ✦`);
}

// Offer the import on the Shiny Dex when this browser still has V2 shinies to bring over.
export function renderV2Banner() {
  const banner = $("#v2Banner");
  if (!banner) return;
  const plan = state.page || state.huntsView || safe(() => localStorage.getItem("shinycheck-v3-v2-dismissed")) ? null : scanV2();
  const n = plan ? plan.shinies.length + plan.hunts.length : 0;
  banner.hidden = !n;
  if (n) $("#v2BannerText").innerHTML = `Found <b>${plan.shinies.length}</b> ${plan.shinies.length === 1 ? "shiny" : "shinies"}${plan.hunts.length ? ` and <b>${plan.hunts.length}</b> ${plan.hunts.length === 1 ? "hunt" : "hunts"}` : ""} from ShinyCheck V2 in this browser.`;
}

// Wiring: runs once at startup, from main.js.
export function init() {
  addEventListener("message", e => {
    if (e.origin !== V2_ORIGIN || !e.data || e.data.type !== "shinycheck-v2-data" || typeof e.data.data !== "object") return;
    clearTimeout(v2.waiting);
    // Only V2's own keys are used; values are parsed defensively by scanV2.
    const map = {};
    for (const [k, v] of Object.entries(e.data.data)) if (/^(plza|sv|pla|pogo)_(shiny|shinyData|hunt)_\d+(_\d+)?$/.test(k) && typeof v === "string") map[k] = v;
    previewV2(scanV2(remoteV2(map)));
  });
  $("#v2Open").addEventListener("click", openV2);
  $("#v2Go").addEventListener("click", runV2);
  v2.root.addEventListener("click", e => { if (e.target === v2.root || e.target.closest("[data-v2close]")) closeV2(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !v2.root.hidden) { e.stopImmediatePropagation(); closeV2(); } }, true);
  $("#v2BannerOpen").addEventListener("click", openV2);
  $("#v2BannerClose").addEventListener("click", () => { safe(() => localStorage.setItem("shinycheck-v3-v2-dismissed", "1")); renderV2Banner(); });
}
