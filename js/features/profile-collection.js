// Profile Collection tab: every shiny a trainer logged as a grid, with a search (name or dex number),
// a sort (newest, dex number, name) and a game filter. The controls stay put while typing; only the
// grid is redrawn. profile.js shows it with collectionView() and calls init() once.
import { monByKey } from "../components/avatar.js";
import { fmtDate, nf } from "../core/format.js";
import { $, esc, norm } from "../core/util.js";
import { altSprite, formText } from "../model/forms.js";
import { GAME_INFO } from "../model/games.js";
import { GAMES } from "../core/config.js";

const SORTS = [["new", "Newest"], ["dex", "Dex #"], ["name", "A–Z"]];
let list = [], q = "", sort = "new", game = "";

// The collection with its Pokémon and game looked up; entries of unknown Pokémon or games are left out.
const rows = () => list.map(c => ({ c, m: monByKey(c.k), g: GAME_INFO[c.g] })).filter(r => r.m && r.g);

// "25", "#025" and "0025" find Pikachu by number; anything else searches the name and form.
function matches({ m, c }, query) {
  const num = query.replace(/^#/, "");
  if (/^\d+$/.test(num)) return +m.dex === +num;
  return norm(`${m.name} ${formText(m, c.a)}`).includes(query);
}

const ORDER = {
  new: (a, b) => (b.c.ts || 0) - (a.c.ts || 0),
  dex: (a, b) => +a.m.dex - +b.m.dex || a.m.id - b.m.id || (a.c.ts || 0) - (b.c.ts || 0),
  name: (a, b) => a.m.name.localeCompare(b.m.name) || +a.m.dex - +b.m.dex,
};

function tiles() {
  const query = norm(q.trim()), all = rows();
  const shown = all.filter(r => (!game || r.c.g === game) && (!query || matches(r, query))).sort(ORDER[sort]);
  $("#pcCount").textContent = shown.length === all.length ? `${nf(all.length)} shinies` : `${nf(shown.length)} of ${nf(all.length)}`;
  return shown.length ? shown.map(({ c, m, g }) => {
    const facts = [c.c ? `${nf(c.c)} encounters` : "", c.m || "", c.ts ? fmtDate(c.ts) : ""].filter(Boolean).join(" · ");
    return `<div class="pf-tile" style="--accent:${g.accent};--accent2:${g.accent2}" title="${esc(`${m.name} · ${g.name}${facts ? ` · ${facts}` : ""}`)}">
        <img src="${altSprite(m, c.a)}" alt="" loading="lazy" decoding="async">
        <small class="pf-no">#${String(+m.dex).padStart(4, "0")}</small>
        <b>${esc(m.name)}</b><span>${esc(g.abbr || g.name)}</span>
      </div>`;
  }).join("") : `<p class="feed-empty pc-none">No shinies match.</p>`;
}

// The tab's markup. A new trainer's collection starts unfiltered.
export function collectionView(collection, mine, uid) {
  if (uid !== collectionView.uid) { collectionView.uid = uid; q = ""; sort = "new"; game = ""; }
  list = collection;
  if (!rows().length) return `<p class="feed-empty">${mine ? "Log your first shiny and it shows up here." : "No shinies logged yet."}</p>`;
  // Games in this collection, newest game first, then GO and HOME; a game no longer in it drops the filter.
  const games = [...GAMES].reverse().concat("pogo", "home").filter(g => list.some(c => c.g === g));
  if (!games.includes(game)) game = "";
  return `<div class="pc-bar">
      <label class="search pc-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <input id="pcQ" type="search" placeholder="Search name or dex number" autocomplete="off" value="${esc(q)}">
      </label>
      <div class="segmented pc-sort" role="group" aria-label="Sort">
        ${SORTS.map(([id, label]) => `<button class="seg ${sort === id ? "active" : ""}" data-pc-sort="${id}" aria-pressed="${sort === id}">${label}</button>`).join("")}
      </div>
      <select class="pc-game" id="pcGame" aria-label="Game">
        <option value="">All games</option>
        ${games.map(g => `<option value="${g}" ${g === game ? "selected" : ""}>${esc(GAME_INFO[g].name)}</option>`).join("")}
      </select>
      <span class="result-count" id="pcCount"></span>
    </div>
    <div class="pf-grid" id="pcGrid"></div>`;
}
// Fill the grid after collectionView()'s markup is on the page.
export const paintCollection = () => { const grid = $("#pcGrid"); if (grid) grid.innerHTML = tiles(); };

// Wiring: runs once at startup, from main.js.
export function init() {
  const view = $("#profileView");
  view.addEventListener("input", e => { if (e.target.id === "pcQ") { q = e.target.value; paintCollection(); } });
  view.addEventListener("change", e => { if (e.target.id === "pcGame") { game = e.target.value; paintCollection(); } });
  view.addEventListener("click", e => {
    const b = e.target.closest("[data-pc-sort]");
    if (!b) return;
    sort = b.dataset.pcSort;
    view.querySelectorAll("[data-pc-sort]").forEach(x => { x.classList.toggle("active", x === b); x.setAttribute("aria-pressed", x === b); });
    paintCollection();
  });
}
