// Profile Collection tab: every shiny a trainer logged, as big cards with all facts (like the feed) or as
// mini tiles (the viewer's choice, kept on this device). A search (name or dex number), a sort (newest,
// dex number, name) and a game filter: a swipeable chip row with only the games this trainer has shinies
// in, so it stays short however many games are added. The controls stay put while typing; only the grid
// is redrawn, a page at a time. profile.js shows it with collectionView() and calls init() once.
import { monByKey } from "../components/avatar.js";
import { collectionCard, collectionShiny } from "../components/post-card.js";
import { fmtDate, nf } from "../core/format.js";
import { $, esc, norm, safe } from "../core/util.js";
import { openShare } from "./share-card.js";
import { altSprite, formText } from "../model/forms.js";
import { markOf } from "../model/marks.js";
import { GAME_INFO } from "../model/games.js";

const SORTS = [["new", "Newest"], ["dex", "Dex #"], ["name", "A–Z"]];
const VIEWS = [["cards", "Cards", "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z"], ["mini", "Mini", "M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z"]];
const VIEW_KEY = "shinycheck-v3-collection-view", PAGE = { cards: 24, mini: 120 };
let list = [], own = false, q = "", sort = "new", game = "", limit = 0, shown = [];
let view = safe(() => localStorage.getItem(VIEW_KEY)) === "mini" ? "mini" : "cards";

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

const tile = ({ c, m, g }) => {
  const facts = [c.c ? `${nf(c.c)} encounters` : "", c.m || "", c.ts ? fmtDate(c.ts) : ""].filter(Boolean).join(" · ");
  return `<div class="pf-tile" style="--accent:${g.accent};--accent2:${g.accent2}" title="${esc(`${m.name} · ${g.name}${facts ? ` · ${facts}` : ""}`)}">
      <img src="${altSprite(m, c.a)}" alt="" loading="lazy" decoding="async">
      <small class="pf-no">#${String(+m.dex).padStart(4, "0")}</small>
      ${markOf(c.mk) ? `<img class="pf-mark" src="${markOf(c.mk).icon}" alt="${esc(markOf(c.mk).n)}" title="${esc(markOf(c.mk).n)}">` : ""}
      <b>${esc(m.name)}</b><span>${esc(g.abbr || g.name)}</span>
    </div>`;
};

function grid() {
  const query = norm(q.trim()), all = rows();
  shown = all.filter(r => (!game || r.c.g === game) && (!query || matches(r, query))).sort(ORDER[sort]);
  $("#pcCount").textContent = shown.length === all.length ? `${nf(all.length)} shinies` : `${nf(shown.length)} of ${nf(all.length)}`;
  if (!shown.length) return `<p class="feed-empty pc-none">No shinies match.</p>`;
  const page = shown.slice(0, limit);
  return (view === "cards" ? page.map((r, i) => collectionCard(r.c, i, own)) : page.map(tile)).join("")
    + (shown.length > limit ? `<button class="en-alts-more pc-more" data-pc-more>Show more · ${nf(shown.length - limit)} left</button>` : "");
}

// The tab's markup. A new trainer's collection starts unfiltered.
export function collectionView(collection, mine, uid) {
  if (uid !== collectionView.uid) { collectionView.uid = uid; q = ""; sort = "new"; game = ""; }
  list = collection; own = mine;
  if (!rows().length) return `<p class="feed-empty">${mine ? "Log your first shiny and it shows up here." : "No shinies logged yet."}</p>`;
  // Games in this collection: main series newest first, then GO and HOME; a game no longer in it drops the filter.
  const count = {};
  for (const r of rows()) count[r.c.g] = (count[r.c.g] || 0) + 1;
  const games = Object.keys(count).sort((x, y) => !!GAME_INFO[x].logOnly - !!GAME_INFO[y].logOnly
    || (GAME_INFO[y].released || "").localeCompare(GAME_INFO[x].released || ""));
  if (!games.includes(game)) game = "";
  const chip = (id, label, n, title) => {
    const g = GAME_INFO[id];
    return `<button class="pc-chip ${g ? "" : "all"} ${id === game ? "on" : ""}" data-pc-game="${id}" aria-pressed="${id === game}" title="${esc(title)}"
        ${g ? `style="--accent:${g.accent};--accent2:${g.accent2}"` : ""}>${g ? `<i></i>` : ""}${esc(label)}<small>${nf(n)}</small></button>`;
  };
  return `<div class="pc-bar">
      <label class="search pc-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        <input id="pcQ" type="search" placeholder="Search name or dex number" autocomplete="off" value="${esc(q)}">
      </label>
      <div class="segmented pc-sort" role="group" aria-label="Sort">
        ${SORTS.map(([id, label]) => `<button class="seg ${sort === id ? "active" : ""}" data-pc-sort="${id}" aria-pressed="${sort === id}">${label}</button>`).join("")}
      </div>
      <div class="segmented pc-view" role="group" aria-label="View">
        ${VIEWS.map(([id, label, d]) => `<button class="seg ${view === id ? "active" : ""}" data-pc-view="${id}" aria-pressed="${view === id}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg><span>${label}</span></button>`).join("")}
      </div>
      <span class="result-count" id="pcCount"></span>
    </div>
    ${games.length > 1 ? `<div class="pc-games" role="group" aria-label="Game">
      ${chip("", "All games", rows().length, "All games")}${games.map(g => chip(g, GAME_INFO[g].abbr || GAME_INFO[g].name, count[g], GAME_INFO[g].name)).join("")}
    </div>` : ""}
    <div class="${view === "cards" ? "post-grid" : "pf-grid"}" id="pcGrid"></div>`;
}
// Fill the grid after collectionView()'s markup is on the page.
// `more` adds a page to what's shown; any other repaint starts at the first page again.
export function paintCollection(more = false) {
  const el = $("#pcGrid");
  if (!el) return;
  limit = more ? limit + PAGE[view] : PAGE[view];
  el.className = view === "cards" ? "post-grid" : "pf-grid";
  el.innerHTML = grid();
}

// Wiring: runs once at startup, from main.js.
export function init() {
  const root = $("#profileView");
  root.addEventListener("input", e => { if (e.target.id === "pcQ") { q = e.target.value; paintCollection(); } });
  // Sort and game buttons: mark the picked one and redraw the grid.
  const pick = (b, attr, cls) => root.querySelectorAll(`[${attr}]`).forEach(x => { x.classList.toggle(cls, x === b); x.setAttribute("aria-pressed", x === b); });
  root.addEventListener("click", e => {
    const share = e.target.closest("[data-pc-share]");
    if (share && own) { const s = shown[+share.dataset.pcShare]; return s && openShare(collectionShiny(s.c)); }
    if (e.target.closest("[data-pc-more]")) return paintCollection(true);
    const s = e.target.closest("[data-pc-sort]"), g = e.target.closest("[data-pc-game]"), v = e.target.closest("[data-pc-view]");
    if (s) { sort = s.dataset.pcSort; pick(s, "data-pc-sort", "active"); }
    else if (g) { game = g.dataset.pcGame; pick(g, "data-pc-game", "on"); }
    else if (v) { view = v.dataset.pcView; pick(v, "data-pc-view", "active"); safe(() => localStorage.setItem(VIEW_KEY, view)); }
    else return;
    paintCollection();
  });
}
