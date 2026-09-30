// Feed page (/feed): the newest catches of every trainer ("For you") or of the trainers you
// follow ("Following"), with likes. Catches get here by themselves (features/social-sync.js).
import { postCard } from "../components/post-card.js";
import { renderSidebar } from "../components/sidebar.js";
import { BASE } from "../core/config.js";
import { $, esc } from "../core/util.js";
import { remember, isLiked, wirePosts } from "../features/post-actions.js";
import * as social from "../services/social.js";

const list = () => $("#feedList");
let tab = "all", posts = [], authors = new Map(), last = null, more = false, loading = false, error = "", loadedAt = 0, token = 0;

export const skeleton = n => Array.from({ length: n }, () => `<div class="post post-ghost" aria-hidden="true"><div class="post-head"><span class="av"></span><i></i></div><div class="post-stage"></div><i></i><i></i></div>`).join("");

export function renderFeed() {
  renderSidebar();
  if (social.localOnly()) {
    list().innerHTML = `<p class="feed-empty">The feed needs an account: sign in to see other trainers' shinies.</p>`;
    $("#feedMore").innerHTML = "";
    return;
  }
  // Coming back after a minute or more loads the newest posts again.
  if (!loading && Date.now() - loadedAt > 60000) return load(true);
  paint();
}

function paint() {
  $("#feedTabs").querySelectorAll("[data-feed-tab]").forEach(b => {
    b.classList.toggle("active", b.dataset.feedTab === tab);
    b.setAttribute("aria-selected", b.dataset.feedTab === tab);
  });
  const cards = posts.map(p => postCard(p, authors.get(p.uid), isLiked(p.id))).join("");
  const empty = tab === "following"
    ? `<div class="feed-empty"><p>Nothing here yet. Follow trainers to see their catches in this tab.</p><button class="rl-again" data-feed-tab="all">Browse For you</button></div>`
    : `<p class="feed-empty">No catches yet. Log a shiny and it shows up here ✦</p>`;
  list().innerHTML = error ? `<p class="feed-empty">${esc(error)}</p>` : cards || (loading ? skeleton(3) : empty);
  $("#feedMore").innerHTML = loading && posts.length ? skeleton(1) : more && !error ? `<button class="rl-again" data-feed-more>Load more</button>` : "";
}

async function load(fresh = false) {
  const t = fresh ? ++token : token;
  if (fresh) { posts = []; last = null; more = false; error = ""; }
  loading = true;
  paint();
  try {
    await social.whenSignedIn();
    let uids = null;
    if (tab === "following") {
      uids = await social.myFollowing();
      if (!uids.length) { if (t === token) { loading = false; more = false; loadedAt = Date.now(); paint(); } return; }
    }
    const page = await social.feed({ uids, after: last });
    const [who, liked] = await Promise.all([social.profilesOf(page.posts.map(p => p.uid)), social.likedOf(page.posts)]);
    if (t !== token) return;
    who.forEach((v, k) => authors.set(k, v));
    remember(page.posts, liked);
    posts = [...posts, ...page.posts];
    last = page.last;
    more = page.more;
    loadedAt = Date.now();
  } catch (err) {
    console.error(err);
    if (t !== token) return;
    error = err.code === "failed-precondition"
      ? "The Following tab isn't set up yet (a database index is still missing). Try For you in the meantime."
      : "Couldn't load the feed. Check your connection and try again.";
  }
  loading = false;
  paint();
}

// Wiring: runs once at startup, from main.js.
export function init() {
  const view = $("#feedView");
  view.addEventListener("click", e => {
    const t = e.target.closest("[data-feed-tab]");
    if (t) {
      if (t.dataset.feedTab !== tab) { tab = t.dataset.feedTab; load(true); }
      return;
    }
    if (e.target.closest("[data-feed-more]") && !loading) load();
    if (e.target.closest("[data-feed-refresh]") && !loading) load(true);
  });
  wirePosts(list());
  // Scrolling near the end loads the next page.
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && more && !loading && !view.classList.contains("hidden")) load();
  }, { rootMargin: "600px" }).observe($("#feedMore"));
  addEventListener("social:profile", () => { loadedAt = 0; });
  addEventListener("social:follow", () => { if (tab === "following") loadedAt = 0; });
  $("#feedMe").href = `${BASE}trainer`;
}
