// Admin dashboard (/admin): accounts, who's online, community totals and a link to the Firestore usage
// in the Firebase console. Only for ADMIN_UID (the ⚙ menu shows it only there); the data comes from services/admin.js,
// which Firestore's rules answer for that account only.
import { avatar, trainerHref } from "../components/avatar.js";
import { renderSidebar } from "../components/sidebar.js";
import { fmtAgo, nf } from "../core/format.js";
import { state } from "../core/state.js";
import { $, esc } from "../core/util.js";
import * as admin from "../services/admin.js";
import * as social from "../services/social.js";

let data = null, people = null, error = "", loading = false, loadedAt = 0;
const plural = (n, one, many = one + "s") => `${nf(n)} ${n === 1 ? one : many}`;

export function renderAdmin() {
  renderSidebar();
  if (social.localOnly() || (social.available() && !admin.isAdmin())) {
    $("#adStats").innerHTML = "";
    $("#adBody").innerHTML = `<p class="feed-empty">This page is only for the ShinyCheck admin.</p>`;
    return;
  }
  if (!social.available()) { $("#adBody").innerHTML = `<p class="feed-empty">Loading…</p>`; return; }
  // Coming back after half a minute loads fresh numbers.
  if (!loading && Date.now() - loadedAt > 30000) load();
  paint();
}

async function load() {
  loading = true;
  error = "";
  paint();
  try {
    [data, people] = await Promise.all([admin.counts(), admin.online()]);
    loadedAt = Date.now();
  } catch (err) {
    console.error(err);
    error = err.code === "permission-denied" ? "Firestore said no: publish the latest firestore.rules first." : `Couldn't load the numbers (${err.code || err.message}).`;
  }
  loading = false;
  paint();
}

function paint() {
  if (!state.adminView) return;
  $("#adSub").textContent = loading && !data ? "Loading…" : loadedAt ? `Only you can see this page. Updated ${new Date(loadedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.` : "";
  $("#adStats").innerHTML = data ? [
    [nf(data.accounts), "Accounts"], [nf(data.online), "Online now"], [nf(data.today), "Active today"], [nf(data.newWeek), "New this week"],
  ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("") : "";
  $("#adBody").innerHTML = error ? `<p class="feed-empty">${esc(error)}</p>` : `<div class="st-grid">${usageCard()}${onlineCard()}${communityCard()}</div>`;
}

// ---------- Database usage ----------
// Google's usage numbers need billing to read from here, so this links to the Firebase console instead.
function usageCard() {
  const rows = [["Reads", nf(admin.FREE.reads), "per day"], ["Writes", nf(admin.FREE.writes), "per day"],
    ["Deletes", nf(admin.FREE.deletes), "per day"], ["Stored data", admin.FREE.stored, "in total"]];
  return `<section class="st-card ad-usage">
      <div class="st-card-head"><h3>Database usage</h3><span>Firestore free plan</span></div>
      <p class="ad-note">Today's reads, writes, deletes and stored data are on the Firebase console's usage page. These are the free plan's limits; the daily ones reset at midnight Pacific time.</p>
      <dl class="ad-list">${rows.map(([k, v, note]) => `<div><dt>${k} <small>${note}</small></dt><dd>${v}</dd></div>`).join("")}</dl>
      <a class="pf-btn ad-usage-go" href="${admin.USAGE_URL}" target="_blank" rel="noopener">Open usage in Firebase ↗</a>
    </section>`;
}

// ---------- Online now ----------
function onlineCard() {
  const list = people || [];
  return `<section class="st-card ad-online">
      <div class="st-card-head"><h3>Online now</h3><span>app open · last 5 min</span></div>
      ${list.length ? `<ul class="ad-people">${list.map(({ uid, seen, profile: p }) => `
        <li><a href="${trainerHref(uid, p)}">${avatar(p)}<span><b>${esc((p && p.name) || "Trainer without a profile")}</b><small>${p && p.username ? "@" + esc(p.username) + " · " : ""}${fmtAgo(seen) === "now" ? "just now" : fmtAgo(seen) + " ago"}</small></span></a></li>`).join("")}</ul>`
        : `<p class="ad-note">${loading ? "Loading…" : "Nobody right now."}</p>`}
      ${data ? `<p class="st-note">${plural(data.today, "trainer")} today · ${plural(data.week, "trainer")} in the last 7 days.</p>` : ""}
    </section>`;
}

// ---------- Community ----------
function communityCard() {
  if (!data) return "";
  const rows = [
    ["Accounts", data.accounts, "with saved progress"],
    ["Profiles", data.profiles, `${nf(data.privateProfiles)} private`],
    ["Shinies", data.shinies, "on profiles"],
    ["Posts", data.posts, "in the feed"],
    ["Likes", data.likes, ""],
    ["Follows", data.follows, ""],
  ];
  return `<section class="st-card ad-community">
      <div class="st-card-head"><h3>Community</h3><span>all time</span></div>
      <dl class="ad-list">${rows.map(([k, v, note]) => `<div><dt>${k}${note ? ` <small>${note}</small>` : ""}</dt><dd>${nf(v)}</dd></div>`).join("")}</dl>
      <p class="st-note">Accounts that signed up but never saved anything aren't counted; Firebase → Authentication has every sign-up.</p>
    </section>`;
}

// Wiring: runs once at startup, from main.js.
export function init() {
  $("#adRefresh").addEventListener("click", load);
  // Signing in (or the account loading) after opening /admin.
  addEventListener("cloud:ready", () => { if (state.adminView) renderAdmin(); });
  // While the page is open: fresh counts every minute.
  setInterval(() => { if (state.adminView && !document.hidden && !loading && admin.isAdmin()) load(); }, 60000);
  // The ⚙ menu entry, for the admin only.
  const item = $("#adminOpen");
  addEventListener("cloud:user", () => { item.hidden = !admin.isAdmin(); });
}
