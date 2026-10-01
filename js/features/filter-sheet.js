// Filter & sort dialog (a bottom sheet on phones), opened from the toolbar on the Shiny Dex and game pages.
// Every tap applies right away; the rules live in model/dex-filter.js, the settings in state.f (Shiny Dex)
// and state.gf (shared by all game pages). The "Missing only" chip is a shortcut for Show: Missing.
import { closeDlg, openDlg, wireDlg } from "../components/dialog.js";
import { state } from "../core/state.js";
import { $, cap } from "../core/util.js";
import { SHOWS, SORTS, TYPES, activeCount, newFilter } from "../model/dex-filter.js";
import { GAME_INFO } from "../model/games.js";
import { render } from "../pages/router.js";

const dlg = $("#filterDlg"), body = $("#filterBody");
const onHome = () => !state.page;
const current = () => onHome() ? state.f : state.gf;

const chips = (group, opts, on) => `<div class="fs-chips" data-group="${group}">${Object.entries(opts)
  .map(([k, v]) => `<button class="fs-chip ${on(k) ? "on" : ""}" data-v="${k}" aria-pressed="${on(k)}">${v}</button>`).join("")}</div>`;

function paint() {
  const f = current();
  $("#filterEyebrow").textContent = onHome() ? "Shiny Dex" : GAME_INFO[state.page].name;
  body.innerHTML = `
    <p class="mini-label">Show</p>
    ${chips("show", SHOWS, k => f.show === k)}
    <p class="mini-label">Type <small>${f.types.length ? `<button class="fs-clear" data-clear="types">Clear</button>` : "pick two for a dual type"}</small></p>
    <div class="fs-types" data-group="types">${TYPES.map(t => `<button class="fs-type ${f.types.includes(t) ? "on" : ""}" data-v="${t}" aria-pressed="${f.types.includes(t)}" title="${cap(t)}"><img src="types/${t}.png" alt="${cap(t)}"></button>`).join("")}</div>
    <p class="mini-label">Sort by</p>
    ${chips("sort", SORTS, k => f.sort === k)}
    <button class="chip-toggle fs-locked" data-toggle="hideLocked" aria-pressed="${f.hideLocked}">${onHome() ? "Hide shiny locked &amp; event only" : "Hide shiny locked"}</button>`;
  render();
  const n = (onHome() ? $("#count") : $("#gCount")).textContent.match(/\d+/);
  $("#filterDone").textContent = n ? `Show ${n[0]}` : "Done";
}

// The Filter buttons' badge and the Missing only chips follow the settings.
export function syncToolbar() {
  for (const [scope, f, chip] of [["home", state.f, "#fMissing"], ["game", state.gf, "#gMissing"]]) {
    const n = activeCount(f), b = $(`[data-filter="${scope}"]`);
    b.setAttribute("aria-pressed", n > 0);
    b.querySelector(".filter-badge").hidden = !n;
    b.querySelector(".filter-badge").textContent = n;
    $(chip).setAttribute("aria-pressed", f.show === "missing");
  }
}

function change(fn) {
  fn(current());
  syncToolbar();
  paint();
}

// Wiring: runs once at startup, from main.js.
export function init() {
  wireDlg(dlg);
  for (const b of document.querySelectorAll("[data-filter]")) b.addEventListener("click", () => { paint(); openDlg(dlg); });
  // Shortcut chips: Missing only toggles Show between Missing and All.
  for (const [id, key] of [["#fMissing", "f"], ["#gMissing", "gf"]]) {
    $(id).addEventListener("click", () => {
      state[key].show = state[key].show === "missing" ? "all" : "missing";
      syncToolbar();
      render();
    });
  }
  body.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    const group = b.closest("[data-group]")?.dataset.group, v = b.dataset.v;
    if (b.dataset.clear) change(f => { f.types = []; });
    else if (b.dataset.toggle) change(f => { f.hideLocked = !f.hideLocked; });
    else if (group === "show" || group === "sort") change(f => { f[group] = v; });
    // Up to two types (a dual type); a third replaces the oldest pick.
    else if (group === "types") change(f => { f.types = f.types.includes(v) ? f.types.filter(t => t !== v) : [...f.types, v].slice(-2); });
  });
  $("#filterReset").addEventListener("click", () => change(f => Object.assign(f, newFilter())));
  // Leaving a page with the sheet open (back button) closes it.
  addEventListener("popstate", () => { if (!dlg.hidden) closeDlg(dlg); });
  syncToolbar();
}
