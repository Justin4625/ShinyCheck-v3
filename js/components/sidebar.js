// Sidebar navigation (collection, games, What's new) and the phone menu.
import { gHas, pct } from "../core/collection.js";
import { BASE, DEX_ONLY, GAMES } from "../core/config.js";
import { fmtPct, nf } from "../core/format.js";
import { el, state } from "../core/state.js";
import { shinies } from "../core/store.js";
import { $, esc } from "../core/util.js";
import { UPDATES, seenUpdate } from "../features/whats-new.js";
import { mons } from "../model/dex.js";
import { inGamePool } from "../model/game-dex.js";
import { GAME_INFO, gameGrad } from "../model/games.js";
import { homePool } from "../pages/home.js";
import { activeHunts } from "../pages/hunts.js";

export function renderSidebar() {
  const pool = homePool();
  $("#sideDexPct").textContent = fmtPct(pct(pool));
  $("#sideDexBar").style.width = pct(pool) + "%";
  // Newest release first (GAMES itself runs oldest → newest).
  el.sideGames.innerHTML = [...GAMES].reverse().map(id => {
    const g = GAME_INFO[id], l = mons.filter(m => m.games[id] && inGamePool(m, id));
    return `<a class="side-item ${state.page === id ? "active" : ""}" href="${BASE}${id}" style="--c:${g.accent};--g:${gameGrad(g)}">
        <span class="side-icon"></span>
        <span class="side-name">${esc(g.name)}</span>
        <span class="side-pct">${fmtPct(pct(l, gHas(id)))}</span>
        <span class="side-bar"><i style="width:${pct(l, gHas(id))}%"></i></span>
      </a>`;
  }).join("") + DEX_ONLY.map(id => {
    // Dex-only games (Gen 1, no shinies) come last, without a percentage.
    const g = GAME_INFO[id];
    return `<a class="side-item side-noshiny ${state.page === id ? "active" : ""}" href="${BASE}${id}" style="--c:${g.accent};--g:${gameGrad(g)}">
        <span class="side-icon"></span>
        <span class="side-name">${esc(g.name)}</span>
        <span class="side-pct">no shinies</span>
      </a>`;
  }).join("");
  document.querySelector('.side-item[data-page=""]').classList.toggle("active", !state.page && !state.huntsView && !state.statsView && !state.updatesView && !state.feedView && !state.adminView && !state.profileId);
  document.querySelector('.side-item[data-page="feed"]').classList.toggle("active", state.feedView);
  document.querySelector('.side-item[data-page="trainer"]').classList.toggle("active", state.profileId === "me");
  document.querySelector('.side-item[data-page="stats"]').classList.toggle("active", state.statsView);
  document.querySelector('.side-item[data-page="updates"]').classList.toggle("active", state.updatesView);
  $("#sideNew").hidden = !UPDATES.length || seenUpdate();
  $("#sideShinyCount").textContent = nf(Object.values(shinies).reduce((t, l) => t + l.length, 0));
  const live = activeHunts();
  $("#sideHuntCount").textContent = live.length;
  $("#sideHuntDot").classList.toggle("on", live.some(x => x.h.since));
  document.querySelector('.side-item[data-page="hunts"]').classList.toggle("active", state.huntsView);
}

// Wiring: runs once at startup, from main.js.
export function init() {

  // Mobile menu
  $("#menuBtn").addEventListener("click", () => document.body.classList.add("menu-open"));
  $("#scrim").addEventListener("click", () => document.body.classList.remove("menu-open"));
}
