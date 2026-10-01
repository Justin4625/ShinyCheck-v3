// Routing with clean URLs (/, /<game>, /hunts, /stats, /updates) and drawing the current page.
import { sharing } from "../core/collection.js";
import { BASE } from "../core/config.js";
import { el, state } from "../core/state.js";
import { $ } from "../core/util.js";
import { closeEntry } from "../features/dex-entry.js";
import { closeDrawer, openDrawer } from "../features/hunt-deck/deck.js";
import { GAME_INFO } from "../model/games.js";
import { renderGame } from "./game.js";
import { renderHome } from "./home.js";
import { renderHunts } from "./hunts.js";
import { renderStats } from "./stats.js";
import { renderUpdates } from "./updates.js";
import { renderFeed } from "./feed.js";
import { renderProfile } from "./profile.js";
import { renderAdmin } from "./admin.js";

export function render() {
  $("#fShare").setAttribute("aria-pressed", sharing());
  const other = state.huntsView || state.statsView || state.updatesView || state.feedView || state.adminView || !!state.profileId;
  el.home.classList.toggle("hidden", !!state.page || other);
  el.game.classList.toggle("hidden", !state.page);
  el.huntsView.classList.toggle("hidden", !state.huntsView);
  el.statsView.classList.toggle("hidden", !state.statsView);
  el.updatesView.classList.toggle("hidden", !state.updatesView);
  el.feedView.classList.toggle("hidden", !state.feedView);
  el.profileView.classList.toggle("hidden", !state.profileId);
  el.adminView.classList.toggle("hidden", !state.adminView);
  state.huntsView ? renderHunts() : state.statsView ? renderStats() : state.updatesView ? renderUpdates()
    : state.feedView ? renderFeed() : state.adminView ? renderAdmin() : state.profileId ? renderProfile() : state.page ? renderGame() : renderHome();
}

// Routing with clean paths: / is the Shiny Dex, /<game> a game page, /hunts the hunts,
// /stats the stats, /feed the community feed, /admin the admin dashboard, /@<username> or /trainer/<uid> a profile (/trainer: your own).
// GitHub Pages has no server routing, so 404.html sends unknown paths back to the app
// as ?p=/<path>; old #/<path> links keep working too.
export function navigate(path, replace = false) {
  history[replace ? "replaceState" : "pushState"](null, "", BASE + path.replace(/^\//, ""));
  route();
}
export function route() {
  const id = location.pathname.startsWith(BASE) ? decodeURIComponent(location.pathname.slice(BASE.length)).replace(/\/$/, "") : "";
  const page = GAME_INFO[id] && !GAME_INFO[id].logOnly ? id : "";
  const huntsView = id === "hunts", statsView = id === "stats", updatesView = id === "updates", feedView = id === "feed", adminView = id === "admin";
  const profileId = id === "trainer" ? "me" : id.startsWith("trainer/") ? id.slice(8) : /^@[a-z0-9_.]{3,20}$/.test(id) ? id : "";
  if (page !== state.page || huntsView !== state.huntsView || statsView !== state.statsView || updatesView !== state.updatesView
    || feedView !== state.feedView || adminView !== state.adminView || profileId !== state.profileId) {
    closeDrawer(); closeEntry(); state.page = page; state.huntsView = huntsView; state.statsView = statsView; state.updatesView = updatesView;
    state.feedView = feedView; state.adminView = adminView; state.profileId = profileId; state.tab = ""; el.gq.value = ""; scrollTo(0, 0);
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
