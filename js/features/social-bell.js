// Notifications inside ShinyCheck: the bell shows how many trainers started following you or liked
// one of your shinies since you last looked, and opens the list (with Follow back, and the shiny
// that was liked). While the app is open, a new follower or like also shows up as a toast.
import { avatar, monByKey, trainerHref } from "../components/avatar.js";
import { closeDlg, openDlg, wireDlg } from "../components/dialog.js";
import { toast } from "../components/toast.js";
import { fmtAgo } from "../core/format.js";
import { prefs, savePrefs } from "../core/store.js";
import { $, esc } from "../core/util.js";
import { trainerRow, wireFollowButtons } from "./follow-list.js";
import { altSprite } from "../model/forms.js";
import { navigate } from "../pages/router.js";
import * as social from "../services/social.js";

const dlg = $("#bellDlg");
const bells = () => document.querySelectorAll("[data-bell]");
// Both lists are live; `followSeen` (kept in the account) marks what you've already looked at.
let followers = [], likes = [], unsubs = [], firstFollows = true, firstLikes = true;

const all = () => [...followers.map(f => ({ ...f, type: "follow" })), ...likes.map(l => ({ ...l, type: "like" }))].sort((a, b) => b.at - a.at);
const unseen = () => all().filter(n => n.at > (prefs.followSeen || 0)).length;
function paintBells() {
  const n = unseen();
  bells().forEach(b => {
    b.hidden = !social.available();
    b.classList.toggle("has-new", n > 0);
    b.querySelector(".bell-n").textContent = n > 9 ? "9+" : n || "";
    b.setAttribute("aria-label", n ? `Notifications, ${n} new` : "Notifications");
  });
}

// Your posts by id, to show which shiny was liked (loaded when needed, per session).
let myPosts = null;
const postsById = async ids => {
  if (!myPosts || ids.some(id => !myPosts.has(id))) myPosts = await social.myPostIds();
  return myPosts;
};
const monOf = post => post && monByKey(post.key);

// A like: who, which shiny and when; tapping the trainer opens their profile.
function likeRow(p, post, at) {
  const m = monOf(post);
  return `<div class="fl-row bell-like" data-trainer="${esc(p.uid)}">
      <a class="fl-who" href="${esc(trainerHref(p.uid, p))}">${avatar(p)}<span><b>${esc(p.name)}</b><small>liked your ${esc(m ? m.name : "shiny")} · ${fmtAgo(at)}</small></span></a>
      ${m ? `<img class="bell-mon" src="${altSprite(m, post.alt)}" alt="${esc(m.name)}">` : ""}
    </div>`;
}

async function openBell() {
  const seen = prefs.followSeen || 0;
  openDlg(dlg);
  const list = all().slice(0, 50);
  $("#bellList").innerHTML = list.length ? `<p class="fl-empty">Loading…</p>` : `<p class="fl-empty">No notifications yet. When someone follows you or likes one of your shinies, it shows up here.</p>`;
  prefs.followSeen = Date.now();
  savePrefs();
  paintBells();
  if (!list.length) return;
  try {
    const [who, mine, posts] = await Promise.all([social.profilesOf(list.map(n => n.uid)), social.myFollowing(),
      list.some(n => n.type === "like") ? postsById(list.filter(n => n.type === "like").map(n => n.post)) : new Map()]);
    $("#bellList").innerHTML = list.map(n => {
      const p = who.get(n.uid);
      if (!p) return "";
      const row = n.type === "like" ? likeRow(p, posts.get(n.post), n.at) : trainerRow(p, mine.includes(p.uid), `started following you · ${fmtAgo(n.at)}`);
      return `<div class="bell-item ${n.at > seen ? "new" : ""}">${row}</div>`;
    }).join("");
  } catch (err) {
    console.error(err);
    $("#bellList").innerHTML = `<p class="fl-empty">Couldn't load your notifications. Check your connection.</p>`;
  }
}

const profileLink = (p, uid) => () => navigate(p.username ? `@${p.username}` : `trainer/${uid}`);

function watch() {
  unsubs.forEach(u => u());
  firstFollows = firstLikes = true;
  unsubs = [
    social.watchFollowers(async list => {
      const known = new Set(followers.map(f => f.uid));
      const fresh = firstFollows ? [] : list.filter(f => !known.has(f.uid) && f.at > (prefs.followSeen || 0));
      followers = list;
      firstFollows = false;
      paintBells();
      for (const f of fresh.slice(0, 3)) {
        const p = await social.profile(f.uid).catch(() => null);
        if (p) toast(`${p.name} started following you ✦`, { label: "View", run: profileLink(p, f.uid) }, 6000);
      }
    }),
    social.watchLikes(async list => {
      const known = new Set(likes.map(l => `${l.uid}_${l.post}`));
      const fresh = firstLikes ? [] : list.filter(l => !known.has(`${l.uid}_${l.post}`) && l.at > (prefs.followSeen || 0));
      likes = list;
      firstLikes = false;
      paintBells();
      for (const l of fresh.slice(0, 3)) {
        const [p, posts] = await Promise.all([social.profile(l.uid).catch(() => null), postsById([l.post]).catch(() => new Map())]);
        const m = monOf(posts.get(l.post));
        if (p) toast(`${p.name} liked your ${m ? m.name : "shiny"} ✦`, { label: "View", run: profileLink(p, l.uid) }, 6000);
      }
    }),
  ];
}

// Wiring: runs once at startup, from main.js.
export function init() {
  wireDlg(dlg);
  wireFollowButtons(dlg);
  dlg.addEventListener("click", e => { if (e.target.closest(".fl-who")) closeDlg(dlg); });
  bells().forEach(b => b.addEventListener("click", openBell));
  addEventListener("cloud:ready", watch);
  addEventListener("cloud:user", e => {
    if (!e.detail) { unsubs.forEach(u => u()); unsubs = []; followers = []; likes = []; myPosts = null; }
    paintBells();
  });
  paintBells();
}
