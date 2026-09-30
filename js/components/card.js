// Pokémon card in the grids, and what clicking, keys and the pointer do on cards.
import { sparkSvg, typeImgs } from "./icons.js";
import { statusChip } from "./status.js";
import { gHas, has, loggedIn, shiniesOf, viaLabel } from "../core/collection.js";
import { fmtTime, nf } from "../core/format.js";
import { el } from "../core/state.js";
import { elapsed, hk, hunts, isActive, shinies } from "../core/store.js";
import { esc } from "../core/util.js";
import { openEntry } from "../features/dex-entry.js";
import { gameOf, openDrawer } from "../features/hunt-deck/deck.js";
import { outsideOnly, whereIn } from "../model/game-dex.js";
import { GAME_INFO } from "../model/games.js";

export function card(m, gid) {
  const h = gid && hunts[hk(gid, m.id)];
  const found = gid ? (shinies[hk(gid, m.id)] || []).length : shiniesOf(m).length;
  const on = gid ? gHas(gid)(m) : has(m);
  const via = gid && on && !found;
  return `<article class="pcard ${on ? "on" : ""}" data-id="${m.id}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${esc(m.name)}${m.form ? " " + esc(m.form) : ""}">
      <div class="card-top">
        <span class="no">#${m.dex}</span>${statusChip(m, gid)}
        ${found ? `<span class="shiny-count" title="${found} shiny found">${sparkSvg("", "#fff")}${found}</span>` : ""}
        ${via ? `<span class="via-chip" title="Counted via ${esc(viaLabel(m))} (Share across games)">via ${esc(loggedIn(m).map(g => GAME_INFO[g].abbr).join("·"))}</span>` : ""}
        <a class="wiki" href="${m.url}" target="_blank" rel="noopener" title="Open on Bulbapedia">↗</a>
        ${sparkSvg("seal")}
      </div>
      <div class="sprite">${m.sprite ? `<img src="${m.sprite}" alt="" loading="lazy" decoding="async">` : `<span class="nosprite">?</span>`}</div>
      <h4 class="pname">${esc(m.name)}</h4>
      ${gid && outsideOnly(m, gid)
      ? `<span class="where-tag" title="${esc(whereIn(m, gid))}">${esc(whereIn(m, gid) || "Outside the dex")}</span>`
      : `<span class="form-tag ${m.form ? "" : "blank"}" title="${esc(m.form)}">${esc(m.form) || "&nbsp;"}</span>`}
      <div class="types">${typeImgs(m)}</div>
      ${isActive(h) ? `<div class="hunt-strip ${h.since ? "live" : ""}"><span>⚡ ${nf(h.count)}</span><span data-live="${m.id}">${fmtTime(elapsed(h))}</span></div>` : ""}
    </article>`;
}

// Wiring: runs once at startup, from main.js.
export function init() {

  // ---------- Events ----------
  for (const root of [el.cards, el.gameCards, el.huntCards]) {
    // The Shiny Dex and games without shinies (Red, Blue & Yellow) open Dex Entry; game pages open the Hunt Deck.
    const activate = c => root === el.cards || GAME_INFO[gameOf(c)].noShiny ? openEntry(+c.dataset.id) : openDrawer(+c.dataset.id, gameOf(c));
    root.addEventListener("click", e => {
      if (e.target.closest(".wiki")) return;
      const c = e.target.closest(".pcard");
      if (c) activate(c);
    });
    root.addEventListener("keydown", e => {
      const c = e.target.closest(".pcard");
      if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); activate(c); }
    });
    // Holo tilt + sheen follow the pointer.
    root.addEventListener("pointermove", e => {
      const c = e.target.closest(".pcard");
      if (!c || e.pointerType !== "mouse") return;
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty("--mx", x * 100 + "%");
      c.style.setProperty("--my", y * 100 + "%");
      c.style.setProperty("--ry", (x - .5) * 14 + "deg");
      c.style.setProperty("--rx", (.5 - y) * 14 + "deg");
      c.classList.add("tilt");
    });
    root.addEventListener("pointerout", e => {
      const c = e.target.closest(".pcard");
      if (c && !c.contains(e.relatedTarget)) c.classList.remove("tilt");
    });
  }
}
