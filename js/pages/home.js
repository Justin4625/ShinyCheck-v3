// Shiny Dex page (/): all entries by region, totals and recommendations.
import { setRing, updateSection } from "../components/progress.js";
import { empty, sectionHtml } from "../components/section.js";
import { renderSidebar } from "../components/sidebar.js";
import { toast } from "../components/toast.js";
import { done, has, matchText, pct, sharing, shiniesOf } from "../core/collection.js";
import { GAMES } from "../core/config.js";
import { fmtPct } from "../core/format.js";
import { el, state } from "../core/state.js";
import { hk, hunts, isActive, prefs, savePrefs } from "../core/store.js";
import { $, esc } from "../core/util.js";
import { openEntry } from "../features/dex-entry.js";
import { huntable, shinyStatus } from "../model/availability.js";
import { SORTS, activeCount, matches, sorter } from "../model/dex-filter.js";
import { REGIONS, mons, regionOf } from "../model/dex.js";
import { GAME_INFO } from "../model/games.js";
import { render } from "./router.js";

// Recommended: missing shinies you can actually hunt — not shiny locked or event only,
// and in at least one tracked game. A random order is drawn once per page load (and on
// shuffle) so the picks stay put while you click around.
let recOrder = [];
const shuffleRecs = () => {
  recOrder = mons.map(m => m.id);
  for (let i = recOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [recOrder[i], recOrder[j]] = [recOrder[j], recOrder[i]];
  }
};
function recommended(scope) {
  const ok = new Set(scope.filter(m => !has(m) && huntable(m)).map(m => m.id));
  return recOrder.filter(id => ok.has(id)).slice(0, 6).map(id => mons.find(m => m.id === id));
}

const homeScope = m => state.gen === "0" || regionOf(m) === state.gen;
const inRegion = (list, key) => list.filter(m => regionOf(m) === key);
// The Forms toggle decides whether alternate forms count towards totals and percentages:
// Shiny Dex uses its own toggle, game pages share theirs.
export const homePool = () => mons.filter(m => state.forms || !m.variant);
// Filter & sort (js/features/filter-sheet.js) on the Shiny Dex looks at every game at once.
const homeCtx = {
  caught: has,
  hunting: m => GAMES.some(g => isActive(hunts[hk(g, m.id)])),
  locked: m => !!shinyStatus(m),
  lastCaught: m => Math.max(0, ...shiniesOf(m).map(s => s.ts || 0)),
  encounters: m => GAMES.reduce((n, g) => n + (isActive(hunts[hk(g, m.id)]) ? hunts[hk(g, m.id)].count || 0 : 0), 0),
};
const homeMatch = m => homeScope(m) && matchText(m, el.q) && (state.forms || !m.variant) && matches(state.f, homeCtx)(m);

export function renderHome() {
  const list = mons.filter(homeMatch);
  $("#count").textContent = `${list.length} shown`;
  let html = "";
  // Sorted by dex number the cards stay grouped by region; any other order is one list.
  if (state.f.sort !== "dex") {
    if (list.length) html = sectionHtml("✦", SORTS[state.f.sort], "sorted", homePool().filter(homeScope), list.sort(sorter(state.f, homeCtx, (x, y) => +x.dex - +y.dex || x.id - y.id)));
  } else for (const r of REGIONS) {
    const items = inRegion(list, r.key);
    if (items.length) html += sectionHtml(String(r.gen).padStart(2, "0"), r.name, r.key, inRegion(homePool(), r.key), items);
  }
  el.cards.innerHTML = html || empty(el.q, activeCount(state.f));
  renderHomeStats();
}

export function renderHomeStats() {
  const pool = homePool();
  const got = done(pool), p = pct(pool);
  const regionsDone = REGIONS.filter(r => {
    const l = inRegion(pool, r.key);
    return done(l) === l.length;
  }).length;
  $("#statCaught").textContent = got;
  $("#statLeft").textContent = pool.length - got;
  $("#statRegions").textContent = `${regionsDone}/${REGIONS.length}`;
  $("#heroPct").textContent = fmtPct(p);
  setRing($("#heroRing"), p);
  const left = pool.length - got;
  $("#heroSub").innerHTML = left
    ? `<b>${left}</b> Pokémon and forms still missing from your shiny collection. ${got ? "Keep going!" : "Open a Pokémon to log your first shiny."}`
    : `<b>Shiny Dex complete!</b> Every form, shiny and in one place. ✦`;

  el.regions.innerHTML = [["0", "All regions", pool], ...REGIONS.map(r => [r.key, r.name, inRegion(pool, r.key)])]
    .map(([g, n, l]) => `<button class="region ${state.gen === g ? "active" : ""} ${done(l) === l.length ? "done" : ""}" data-gen="${g}">
        <span class="r-name">${esc(n)}</span><span class="r-num">${done(l)} / ${l.length}</span>
        <span class="r-bar" style="width:${pct(l)}%"></span>
      </button>`).join("");

  const next = recommended(pool.filter(homeScope));
  el.upNext.innerHTML = next.length
    ? next.map(m => `<button data-jump="${m.id}" title="#${m.dex} ${esc(m.name)}${m.form ? " (" + esc(m.form) + ")" : ""} — hunt in ${esc(GAMES.filter(g => m.games[g]).map(g => GAME_INFO[g].name).reverse().join(", "))}"><img src="${m.sprite}" alt="${esc(m.name)}"></button>`).join("")
    : `<p class="up-next-empty">Nothing left to hunt here ✦</p>`;

  for (const r of REGIONS) updateSection(el.cards, r.key, inRegion(pool, r.key));
  updateSection(el.cards, "sorted", pool.filter(homeScope));
  renderSidebar();
}

// Wiring: runs once at startup, from main.js.
export function init() {
  shuffleRecs();

  el.regions.addEventListener("click", e => {
    const r = e.target.closest(".region");
    if (r) { state.gen = r.dataset.gen; render(); }
  });
  // A recommendation opens its Dex Entry, where "Hunt it in" starts the hunt.
  el.upNext.addEventListener("click", e => {
    const b = e.target.closest("[data-jump]");
    if (b) openEntry(+b.dataset.jump);
  });
  $("#recShuffle").addEventListener("click", () => { shuffleRecs(); renderHomeStats(); });

  $("#fShare").addEventListener("click", () => {
    prefs.shareAcrossGames = !sharing();
    savePrefs();
    render();
    toast(sharing() ? "Shinies now count in every game they appear in ✦" : "Each game counts only its own shinies again");
  });
}
