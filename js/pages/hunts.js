// Active hunts page (/hunts): every hunt across all games.
import { card } from "../components/card.js";
import { sparkSvg } from "../components/icons.js";
import { renderSidebar } from "../components/sidebar.js";
import { GAMES } from "../core/config.js";
import { fmtShort, nf } from "../core/format.js";
import { el } from "../core/state.js";
import { elapsed, hk, hunts, isActive } from "../core/store.js";
import { $, esc } from "../core/util.js";
import { mons } from "../model/dex.js";
import { GAME_INFO, gameGrad } from "../model/games.js";

export const activeHunts = () => GAMES.flatMap(gid => mons
  .filter(m => isActive(hunts[hk(gid, m.id)]))
  .map(m => ({ gid, m, h: hunts[hk(gid, m.id)] })));

export function renderHunts() {
  const list = activeHunts(), running = list.filter(x => x.h.since).length;
  const enc = list.reduce((s, x) => s + x.h.count, 0);
  $("#huntsSub").innerHTML = list.length
    ? `<b>${list.length}</b> ${list.length === 1 ? "hunt" : "hunts"} going across ${new Set(list.map(x => x.gid)).size} ${new Set(list.map(x => x.gid)).size === 1 ? "game" : "games"}. ${running ? `${running} running right now.` : "All paused."}`
    : "No hunts yet. Open a game, pick a Pokémon and press + to start one.";
  $("#huntsStats").innerHTML = [
    [list.length, "Active"], [running, "Running"], [nf(enc), "Encounters"],
    [fmtShort(list.reduce((s, x) => s + elapsed(x.h), 0)), "Hunt time", "huntsTime"],
  ].map(([v, l, id]) => `<div class="stat"><b ${id ? `id="${id}"` : ""}>${v}</b><span>${l}</span></div>`).join("");

  // Newest game first; inside a game the most recently touched hunt first.
  el.huntCards.innerHTML = [...GAMES].reverse().map(gid => {
    const g = GAME_INFO[gid];
    const items = list.filter(x => x.gid === gid).sort((x, y) => (y.h.updated || 0) - (x.h.updated || 0));
    if (!items.length) return "";
    const genc = items.reduce((s, x) => s + x.h.count, 0);
    return `<section class="dex-section game-mode" data-game="${gid}" style="--accent:${g.accent};--accent2:${g.accent2};--g:${gameGrad(g)}">
        <div class="section-head">
          <span class="section-dot"></span>
          <h3 class="section-title">${esc(g.name)}</h3>
          <div class="section-meta"><span class="sec-count">${items.length} ${items.length === 1 ? "hunt" : "hunts"} · ${nf(genc)} encounters</span></div>
        </div>
        <div class="card-grid">${items.map(x => card(x.m, gid)).join("")}</div>
      </section>`;
  }).join("") || `<div class="empty-state">${sparkSvg()}No active hunts yet<small>Start one from any game page — they all gather here.</small></div>`;
  renderSidebar();
}
