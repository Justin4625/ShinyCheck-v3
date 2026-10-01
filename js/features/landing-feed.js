// Landing page Feed tab: before signing in, visitors can switch the landing page (the gate in index.html)
// between Home and Feed. The feed shows everyone's newest catches like the Feed page, but read-only:
// liking, following and opening a trainer ask to create an account first. Firestore lets anyone read
// posts and public profiles for this (firestore.rules).
import { postCard } from "../components/post-card.js";
import { toast } from "../components/toast.js";
import { $ } from "../core/util.js";
import { skeleton } from "../pages/feed.js";
import * as social from "../services/social.js";

const gate = $("#gate"), list = $("#lpFeedList"), moreBox = $("#lpFeedMore");
let posts = [], authors = new Map(), last = null, more = false, loading = false, failed = false, loadedAt = 0;

function paint() {
  const cards = posts.map(p => postCard(p, authors.get(p.uid), false, false)).join("");
  list.innerHTML = failed ? `<p class="feed-empty">Couldn't load the feed. Check your connection and try again.</p>`
    : cards || (loading ? skeleton(3) : `<p class="feed-empty">No catches yet. Be the first ✦</p>`);
  moreBox.innerHTML = loading && posts.length ? skeleton(1) : more && !failed ? `<button class="rl-again" data-lp-more>Load more</button>` : "";
}

async function load(fresh = false) {
  if (loading || !window.Cloud) return;
  if (fresh) { posts = []; last = null; more = false; failed = false; }
  loading = true;
  paint();
  try {
    const page = await social.feed({ after: last });
    const who = await social.profilesOf(page.posts.map(p => p.uid));
    who.forEach((v, k) => authors.set(k, v));
    posts = [...posts, ...page.posts];
    last = page.last;
    more = page.more;
    loadedAt = Date.now();
  } catch (err) {
    console.error(err);
    failed = true;
  }
  loading = false;
  paint();
}

function showTab(tab) {
  gate.querySelectorAll("[data-lp-tab]").forEach(b => {
    if (!b.closest(".lp-tabs")) return;
    b.classList.toggle("active", b.dataset.lpTab === tab);
    b.setAttribute("aria-selected", b.dataset.lpTab === tab);
  });
  $("#lpHome").hidden = tab !== "home";
  $("#lpFeed").hidden = tab !== "feed";
  gate.scrollTo({ top: 0 });
  if (tab === "feed" && (!posts.length || Date.now() - loadedAt > 60000)) load(true);
}

// Liking, following or opening a trainer: back to Home, with the card on "Create account".
function join(why) {
  showTab("home");
  gate.querySelector('.lp-hero [data-mode="up"][data-lp-login]').click();
  if (why) toast(why);
}

// Wiring: runs once at startup, from main.js.
export function init() {
  gate.addEventListener("click", e => {
    const tab = e.target.closest("[data-lp-tab]");
    if (tab) return showTab(tab.dataset.lpTab);
    if (e.target.closest("[data-lp-join]")) return join();
    if (e.target.closest("[data-lp-more]")) return load();
    if (!e.target.closest("#lpFeedList")) return;
    if (e.target.closest(".post-like")) return join("Create a free account to like shinies ✦");
    // A trainer's profile needs an account; stop the router from opening it behind the landing page.
    if (e.target.closest(".post-who")) { e.preventDefault(); e.stopPropagation(); return join("Create a free account to see trainers' profiles ✦"); }
  });
  // Links to Home's sections (nav, logo) first switch back to Home, before cloud.js scrolls to them.
  gate.addEventListener("click", e => { if (e.target.closest("[data-lp-go], [data-lp-top]") && $("#lpHome").hidden) showTab("home"); }, true);
  // Scrolling near the end loads the next page.
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && more && !loading && !$("#lpFeed").hidden) load();
  }, { root: gate, rootMargin: "600px" }).observe(moreBox);
}
