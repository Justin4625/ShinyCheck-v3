// Game page (/sv, /lza, …): its regional dexes, Outside the dex and hunts.
import { card } from "../components/card.js";
import { sparkSvg } from "../components/icons.js";
import { setRing, updateSection } from "../components/progress.js";
import { empty, sectionHtml } from "../components/section.js";
import { renderSidebar } from "../components/sidebar.js";
import { done, gHas, matchText, pct } from "../core/collection.js";
import { fmtPct } from "../core/format.js";
import { el, state } from "../core/state.js";
import { hk, hunts, isActive } from "../core/store.js";
import { $, esc } from "../core/util.js";
import { lockedIn } from "../model/availability.js";
import { mons } from "../model/dex.js";
import { inGamePool, isExtraForm } from "../model/game-dex.js";
import { GAME_INFO, codeIn, gameGrad, gameNum } from "../model/games.js";

const inTab = (gid, p) => m => p === "O" ? !!m.games[gid] && isExtraForm(m, gid) : !!codeIn(m, gid, p) && !isExtraForm(m, gid);

export function renderGame() {
  const gid = state.page, g = GAME_INFO[gid];
  // Red, Blue & Yellow have no shinies, so no hunts, totals or hunt buttons, only the dex.
  el.game.classList.toggle("no-shiny", !!g.noShiny);
  if (g.noShiny && state.tab === "hunts") state.tab = "";
  $("#gForms").hidden = !g.sections.some(([p]) => p === "O");
  if (state.tab !== "hunts" && !g.sections.some(([p]) => p === state.tab)) state.tab = g.sections[0][0];
  // Tabs always show everything; only the totals follow "Count outside the dex".
  const all = mons.filter(m => m.games[gid]);
  for (const [k, v] of [["--accent", g.accent], ["--accent2", g.accent2], ["--g", gameGrad(g)]]) el.game.style.setProperty(k, v);
  $("#bannerLogo").innerHTML = g.logo ? `<img src="${g.logo}" alt="${esc(g.name)}">` : `<span class="wordmark">${esc(g.short || g.name)}</span>`;
  $("#gameTitle").textContent = g.name;

  const huntList = all.filter(m => isActive(hunts[hk(gid, m.id)]))
    .sort((x, y) => (hunts[hk(gid, y.id)].updated || 0) - (hunts[hk(gid, x.id)].updated || 0));
  el.dexTabs.innerHTML = g.sections.map(([p, t]) => {
    const l = all.filter(inTab(gid, p));
    return `<button class="seg ${state.tab === p ? "active" : ""}" data-tab="${p}">${esc(t)}<small data-tabcount="${p}">${done(l, gHas(gid))}/${l.length}</small></button>`;
  }).join("") + (g.noShiny ? "" : `<button class="seg seg-hunts ${state.tab === "hunts" ? "active" : ""}" data-tab="hunts">
      <span class="live-dot ${huntList.some(m => hunts[hk(gid, m.id)].since) ? "on" : ""}"></span>Hunts<small>${huntList.length}</small></button>`);

  if (state.tab === "hunts") {
    const items = huntList.filter(m => matchText(m, el.gq));
    $("#gCount").textContent = `${items.length} active`;
    el.gameCards.className = "game-mode";
    el.gameCards.innerHTML = items.length
      ? `<section class="dex-section"><div class="section-head"><span class="section-num">⚡</span><h3 class="section-title">Active hunts</h3></div>
           <div class="card-grid">${items.map(m => card(m, gid)).join("")}</div></section>`
      : `<div class="empty-state">${sparkSvg()}No active hunts yet<small>Open any Pokémon and start counting — it shows up here.</small></div>`;
    return renderGameStats();
  }

  const section = g.sections.find(([p]) => p === state.tab);
  const tabAll = all.filter(inTab(gid, state.tab));
  const items = tabAll
    .filter(m => matchText(m, el.gq) && !(state.gMissing && gHas(gid)(m)))
    .sort(state.tab === "O" ? (x, y) => +x.dex - +y.dex || x.id - y.id
      : (x, y) => gameNum(codeIn(x, gid, state.tab)) - gameNum(codeIn(y, gid, state.tab)) || x.id - y.id);
  $("#gCount").textContent = `${items.length} shown`;
  el.gameCards.className = "game-mode";
  el.gameCards.innerHTML = items.length
    ? sectionHtml(String(g.sections.indexOf(section) + 1).padStart(2, "0"), (section[0] === "O" ? section[1] : section[1] + " Dex"), "tab", tabAll.filter(m => !lockedIn(m, gid)), items, gameGrad(g), gid)
    : empty(el.gq);
  renderGameStats();
}

export function renderGameStats() {
  const gid = state.page, g = GAME_INFO[gid];
  const full = mons.filter(m => m.games[gid]), all = full.filter(m => inGamePool(m, gid)), f = gHas(gid);
  const p = pct(all, f), left = all.length - done(all, f);
  if (g.noShiny) {
    $("#gameSub").innerHTML = `Shiny Pokémon don't exist yet in ${esc(g.name)}: they arrived in Gold &amp; Silver. The Kanto dex is here to browse, but there's nothing to hunt or log.`;
    for (const [p2] of g.sections) {
      const n = el.dexTabs.querySelector(`[data-tabcount="${p2}"]`);
      if (n) n.textContent = full.filter(inTab(gid, p2)).length;
    }
    return renderSidebar();
  }
  $("#gamePct").textContent = fmtPct(p);
  $("#gameCount").textContent = `${done(all, f)} / ${all.length}`;
  setRing($("#gameRing"), p);
  $("#gameSub").innerHTML = left
    ? `<b>${left}</b> shinies still to log across ${(() => { const dx = g.sections.filter(([p]) => p !== "O"); return (dx.length > 1 ? dx.length + " regional dexes" : "the " + dx[0][1] + " Dex") + (state.gOutside && dx.length < g.sections.length ? " and beyond" : ""); })()}.`
    : `<b>Complete!</b> Every shiny from ${esc(g.name)} is logged. ✦`;
  for (const [p2] of g.sections) {
    const l = full.filter(m => inTab(gid, p2)(m) && !lockedIn(m, gid));
    const n = el.dexTabs.querySelector(`[data-tabcount="${p2}"]`);
    if (n) n.textContent = `${done(l, f)}/${l.length}`;
  }
  updateSection(el.gameCards, "tab", full.filter(m => inTab(gid, state.tab)(m) && !lockedIn(m, gid)), f);
  const live = full.filter(m => isActive(hunts[hk(gid, m.id)]));
  const seg = el.dexTabs.querySelector(".seg-hunts");
  if (seg) {
    seg.querySelector("small").textContent = live.length;
    seg.querySelector(".live-dot").classList.toggle("on", live.some(m => hunts[hk(gid, m.id)].since));
  }
  renderSidebar();
}

// Wiring: runs once at startup, from main.js.
export function init() {
  el.dexTabs.addEventListener("click", e => {
    const t = e.target.closest(".seg");
    if (t) { state.tab = t.dataset.tab; renderGame(); }
  });
}
