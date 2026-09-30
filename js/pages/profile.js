// Trainer profile (/trainer/<uid>, /trainer = your own): picture, name, shinies, likes,
// followers and following, a Follow button, and their catches and whole collection.
import { avatar, monByKey, trainerHref } from "../components/avatar.js";
import { postCard } from "../components/post-card.js";
import { renderSidebar } from "../components/sidebar.js";
import { toast } from "../components/toast.js";
import { fmtDate, nf } from "../core/format.js";
import { state } from "../core/state.js";
import { $, esc } from "../core/util.js";
import { openFollowList } from "../features/follow-list.js";
import { isLiked, remember, wirePosts } from "../features/post-actions.js";
import { openProfileEdit } from "../features/profile-edit.js";
import { skeleton } from "./feed.js";
import { altSprite } from "../model/forms.js";
import { GAME_INFO } from "../model/games.js";
import * as social from "../services/social.js";

// Everything shown for the trainer on screen; `uid` says whose it is.
let shown = { uid: null }, tab = "catches", loadedAt = 0, token = 0;

// "me", "@username" or a uid; usernames are looked up first.
let wanted = "", resolved = null;
function uidOf() {
  const id = state.profileId;
  if (id === "me") return social.myUid();
  if (!id.startsWith("@")) return id;
  if (wanted !== id) {
    wanted = id;
    resolved = undefined;
    social.whenSignedIn().then(() => social.uidOfUsername(id.slice(1))).then(uid => {
      if (wanted !== id) return;
      resolved = uid;
      if (state.profileId === id) uid ? renderProfile() : (shown = { uid: id, missing: true }, paint());
    }).catch(() => { if (wanted === id) { shown = { uid: id, error: true }; paint(); } });
  }
  return resolved;
}
const own = () => shown.uid && shown.uid === social.myUid();

export function renderProfile() {
  renderSidebar();
  if (social.localOnly()) {
    $("#pfHero").innerHTML = `<div class="hero-text"><h1>Profiles</h1><p class="hero-sub">Profiles need an account: sign in to see other trainers.</p></div>`;
    $("#pfBody").innerHTML = "";
    return;
  }
  const uid = uidOf();
  if (!uid) {
    if (state.profileId === "me") social.whenSignedIn().then(() => state.profileId && renderProfile());
    else if (resolved === undefined) { shown = { uid: null }; paint(); }
    return;
  }
  if (uid !== shown.uid) { shown = { uid }; tab = "catches"; load(uid); }
  else if (Date.now() - loadedAt > 60000) load(uid);
  paint();
}

async function load(uid) {
  const t = ++token;
  try {
    await social.whenSignedIn();
    const me = uid === social.myUid();
    // Your own profile is created on first visit, like it is on your first save.
    const p = me ? await social.myProfile().then(() => social.profile(uid, true)) : await social.profile(uid, true);
    if (t !== token) return;
    if (!p) { shown = { uid, missing: true }; return paint(); }
    const canSee = p.public || me;
    const [counts, posts, collection, following] = await Promise.all([
      social.followCounts(uid),
      canSee ? social.postsOf(uid) : [],
      canSee ? social.collectionOf(uid) : [],
      me ? false : social.isFollowing(uid),
    ]);
    const liked = await social.likedOf(posts);
    if (t !== token) return;
    remember(posts, liked);
    shown = { uid, p, counts, posts, collection, following };
    loadedAt = Date.now();
  } catch (err) {
    console.error(err);
    if (t !== token) return;
    shown = { uid, error: true };
  }
  paint();
}

function paint() {
  const { p, counts, posts, collection, missing, error } = shown;
  const hero = $("#pfHero"), body = $("#pfBody");
  if (missing || error) {
    hero.innerHTML = `<div class="hero-glow" aria-hidden="true"></div><div class="hero-text"><p class="eyebrow">Trainer</p><h1>${missing ? "Trainer not found" : "Couldn't load"}</h1>
      <p class="hero-sub">${missing ? "This profile doesn't exist (anymore)." : "Check your connection and try again."}</p></div>`;
    body.innerHTML = "";
    return;
  }
  if (!p) {
    hero.innerHTML = `<div class="hero-glow" aria-hidden="true"></div><div class="pf-top">${avatar(null, "av-xl pf-ghost")}<div class="pf-id"><p class="eyebrow">Trainer</p><h1 class="pf-ghost-line">&nbsp;</h1></div></div>`;
    body.innerHTML = `<div class="post-grid">${skeleton(3)}</div>`;
    return;
  }
  const mine = own(), hidden = !p.public && !mine;
  const likes = posts.reduce((n, x) => n + (x.likes || 0), 0);
  const stat = (n, label, list) => list
    ? `<button class="stat pf-stat" data-pf-list="${list}"><b>${nf(n)}</b><span>${label}</span></button>`
    : `<div class="stat"><b>${nf(n)}</b><span>${label}</span></div>`;
  hero.innerHTML = `<div class="hero-glow" aria-hidden="true"></div>
    <div class="pf-top">
      ${avatar(p, "av-xl")}
      <div class="pf-id">
        <p class="eyebrow"><svg class="eyebrow-spark"><use href="#spark" fill="url(#holo)"/></svg> ${mine ? "Your profile" : "Trainer"}</p>
        <h1>${esc(p.name)}</h1>
        ${p.username ? `<p class="pf-handle">@${esc(p.username)}</p>` : ""}
        <p class="hero-sub">Joined ${new Date(p.joined).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}${!p.public ? " · Private" : ""}</p>
      </div>
      <div class="pf-actions">
        ${mine ? `<button class="pf-btn" data-pf-edit>Edit profile</button>`
          : `<button class="pf-btn pf-follow ${shown.following ? "on" : ""}" data-pf-follow aria-pressed="${shown.following}">${shown.following ? "Following" : "Follow"}</button>`}
        ${p.public ? `<button class="pf-btn ghost" data-pf-link>Share profile</button>` : ""}
      </div>
    </div>
    <div class="stats pf-stats">
      ${stat(hidden ? 0 : p.shinies, "Shinies")}${stat(likes, "Likes")}${stat(counts.followers, "Followers", "followers")}${stat(counts.following, "Following", "following")}
    </div>`;
  if (hidden) { body.innerHTML = `<p class="feed-empty">${esc(p.name)} keeps their shinies private.</p>`; return; }
  const note = mine && !p.public ? `<p class="pf-note">Your profile is private: only you see this. Turn it on in <b>Edit profile</b> to show up in the feed.</p>` : "";
  const tabs = `<div class="segmented pf-tabs" role="tablist">
      <button class="seg ${tab === "catches" ? "active" : ""}" data-pf-tab="catches" role="tab">Catches <small>${nf(posts.length)}</small></button>
      <button class="seg ${tab === "collection" ? "active" : ""}" data-pf-tab="collection" role="tab">Collection <small>${nf(collection.length)}</small></button>
    </div>`;
  body.innerHTML = note + tabs + (tab === "catches"
    ? (posts.length ? `<div class="post-grid">${posts.map(x => postCard(x, p, isLiked(x.id))).join("")}</div>`
      : `<p class="feed-empty">${mine ? "Your new catches show up here — and in the feed — as soon as you log them ✦" : "No catches posted yet."}</p>`)
    : collectionGrid(collection, mine));
}

// Every logged shiny, newest first.
function collectionGrid(list, mine) {
  const tiles = [...list].sort((a, b) => (b.ts || 0) - (a.ts || 0)).map(c => {
    const m = monByKey(c.k), g = GAME_INFO[c.g];
    if (!m || !g) return "";
    const facts = [c.c ? `${nf(c.c)} encounters` : "", c.m || "", c.ts ? fmtDate(c.ts) : ""].filter(Boolean).join(" · ");
    return `<div class="pf-tile" style="--accent:${g.accent};--accent2:${g.accent2}" title="${esc(`${m.name} · ${g.name}${facts ? ` · ${facts}` : ""}`)}">
        <img src="${altSprite(m, c.a)}" alt="" loading="lazy" decoding="async">
        <b>${esc(m.name)}</b><span>${esc(g.abbr || g.name)}</span>
      </div>`;
  }).join("");
  return tiles ? `<div class="pf-grid">${tiles}</div>` : `<p class="feed-empty">${mine ? "Log your first shiny and it shows up here." : "No shinies logged yet."}</p>`;
}

async function toggleFollow(btn) {
  const on = !shown.following, uid = shown.uid;
  btn.disabled = true;
  shown.following = on;
  shown.counts.followers += on ? 1 : -1;
  paint();
  try {
    await social.setFollow(uid, on);
  } catch (err) {
    console.error(err);
    if (shown.uid === uid) { shown.following = !on; shown.counts.followers += on ? -1 : 1; paint(); }
    toast("Couldn't save that. Check your connection.");
  }
}

async function shareProfile() {
  const url = location.origin + trainerHref(shown.uid, shown.p), title = `${shown.p.name} on ShinyCheck`;
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { return await navigator.share({ title, url }); } catch (err) { if (err.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); toast("Profile link copied ✦"); }
  catch { toast(url); }
}

// Wiring: runs once at startup, from main.js.
export function init() {
  $("#profileView").addEventListener("click", e => {
    const t = e.target.closest("[data-pf-tab]");
    if (t) { tab = t.dataset.pfTab; return paint(); }
    const f = e.target.closest("[data-pf-follow]");
    if (f) return toggleFollow(f);
    if (e.target.closest("[data-pf-edit]")) return openProfileEdit();
    if (e.target.closest("[data-pf-link]")) return shareProfile();
    const l = e.target.closest("[data-pf-list]");
    if (l) return openFollowList(shown.uid, l.dataset.pfList, shown.p.name);
  });
  wirePosts($("#pfBody"));
  // After editing your profile (name, picture, public), show the new version.
  addEventListener("social:profile", () => { if (own() && state.profileId) { loadedAt = 0; load(shown.uid); } });
  // Following someone (here or in a list) changes their followers and your following.
  addEventListener("social:follow", e => {
    loadedAt = 0;
    if (state.profileId && shown.p && (own() || e.detail.uid === shown.uid)) load(shown.uid);
  });
}
