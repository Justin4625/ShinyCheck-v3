// Routing with clean URLs (/, /<game>, /hunts, /stats, /updates) and drawing the current page.
import { sharing } from "../core/collection.js";
import { BASE } from "../core/config.js";
import { el, state } from "../core/state.js";
import { $ } from "../core/util.js";
import { closeEntry } from "../features/dex-entry.js";
import { closeDrawer, openDrawer } from "../features/hunt-deck/deck.js";
import { renderV2Banner } from "../features/v2-import.js";
import { GAME_INFO } from "../model/games.js";
import { renderGame } from "./game.js";
import { renderHome } from "./home.js";
import { renderHunts } from "./hunts.js";
import { renderStats } from "./stats.js";
import { renderUpdates } from "./updates.js";

export function render() {
  renderV2Banner();
  $("#fShare").setAttribute("aria-pressed", sharing());
  el.home.classList.toggle("hidden", !!state.page || state.huntsView || state.statsView || state.updatesView);
  el.game.classList.toggle("hidden", !state.page);
  el.huntsView.classList.toggle("hidden", !state.huntsView);
  el.statsView.classList.toggle("hidden", !state.statsView);
  el.updatesView.classList.toggle("hidden", !state.updatesView);
  state.huntsView ? renderHunts() : state.statsView ? renderStats() : state.updatesView ? renderUpdates() : state.page ? renderGame() : renderHome();
}

// Routing with clean paths: / is the Shiny Dex, /<game> a game page, /hunts the hunts,
// /stats the stats.
// GitHub Pages has no server routing, so 404.html sends unknown paths back to the app
// as ?p=/<path>; old #/<path> links keep working too.
export function navigate(path, replace = false) {
  history[replace ? "replaceState" : "pushState"](null, "", BASE + path.replace(/^\//, ""));
  route();
}
export function route() {
  const id = location.pathname.startsWith(BASE) ? decodeURIComponent(location.pathname.slice(BASE.length)).replace(/\/$/, "") : "";
  const page = GAME_INFO[id] && !GAME_INFO[id].logOnly ? id : "";
  const huntsView = id === "hunts", statsView = id === "stats", updatesView = id === "updates";
  if (page !== state.page || huntsView !== state.huntsView || statsView !== state.statsView || updatesView !== state.updatesView) {
    closeDrawer(); closeEntry(); state.page = page; state.huntsView = huntsView; state.statsView = statsView; state.updatesView = updatesView; state.tab = ""; el.gq.value = ""; scrollTo(0, 0);
  }
  document.body.classList.remove("menu-open");
  render();
  if (state.pendingHunt && state.page) { openDrawer(state.pendingHunt); state.pendingHunt = null; }
}

// Wiring: runs once at startup, from main.js.
export function init() {
  addEventListener("popstate", route);
  addEventListener("hashchange", () => { if (location.hash.startsWith("#/")) navigate(location.hash.slice(2), true); });
  // Internal links navigate without reloading the page.
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith(BASE) || url.hash) return;
    e.preventDefault();
    navigate(url.pathname.slice(BASE.length));
  });
  {
    const redirected = new URLSearchParams(location.search).get("p");
    if (redirected !== null) history.replaceState(null, "", BASE + redirected.replace(/^\//, "") + location.hash);
    else if (location.hash.startsWith("#/")) history.replaceState(null, "", BASE + location.hash.slice(2));
  }
}
