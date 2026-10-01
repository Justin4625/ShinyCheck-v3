// Admin dashboard (/admin): accounts, who's online and the Firestore usage against the free plan's
// limits. Only for ADMIN_UID (the ⚙ menu shows it only there); the data comes from services/admin.js,
// which Firestore's rules answer for that account only.
import { avatar, trainerHref } from "../components/avatar.js";
import { chartTips, tipAttr } from "../components/chart-tip.js";
import { renderSidebar } from "../components/sidebar.js";
import { fmtAgo, nf } from "../core/format.js";
import { state } from "../core/state.js";
import { $, esc } from "../core/util.js";
import * as admin from "../services/admin.js";
import * as social from "../services/social.js";

let data = null, people = null, use = null, error = "", useError = null, loading = false, useLoading = false, loadedAt = 0;
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
  if (admin.usageConnected()) return loadUsage();
  paint();
}

async function loadUsage() {
  useLoading = true;
  useError = null;
  paint();
  try { use = await admin.usage(); }
  catch (err) { console.error(err); useError = err; if (err.code === "signed-out") use = null; }
  useLoading = false;
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
const GiB = 1024 ** 3;
const fmtBytes = b => b >= GiB ? `${(b / GiB).toFixed(2)} GiB` : b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MiB` : `${Math.round(b / 1024)} KiB`;
const fmtIn = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
// Same thresholds everywhere: fine below 70%, close from 70%, near the limit from 90%.
const level = p => (p >= 100 ? ["bad", "Over the limit"] : p >= 90 ? ["bad", "Near the limit"] : p >= 70 ? ["warn", "Getting close"] : ["ok", "Fine"]);

function meter(name, used, limit, fmt, note) {
  const p = used == null ? null : used / limit * 100;
  const [cls, label] = p == null ? ["", "No data yet"] : level(p);
  return `<div class="ad-meter ${cls}">
      <div class="ad-meter-head"><b>${name}</b><span>${note}</span></div>
      <div class="ad-meter-track" role="meter" aria-label="${name}" aria-valuemin="0" aria-valuemax="${limit}" aria-valuenow="${used || 0}"><i style="width:${p == null ? 0 : Math.min(100, Math.max(p, .6))}%"></i></div>
      <div class="ad-meter-foot"><span><b>${used == null ? "—" : fmt(used)}</b> of ${fmt(limit)}</span><span class="ad-level">${p == null ? label : `${p < 1 && p > 0 ? "<1" : Math.round(p)}% · ${label}`}</span></div>
    </div>`;
}

// Per day, the 7 days before today and today so far, against that quota's daily limit.
function dayChart(title, series, limit) {
  const max = Math.max(limit * .1, ...series.days.map(d => d.v));
  return `<div class="ad-chart">
      <div class="ad-chart-head"><b>${title}</b><span>per day · limit ${nf(limit)}</span></div>
      <div class="st-cols ad-cols">${series.days.map(d => `
        <div class="st-col ${d.today ? "ad-today" : ""}" ${tipAttr(`<b>${d.today ? "Today so far" : admin.ptDate(d.start)}</b> · ${nf(d.v)} (${Math.round(d.v / limit * 100)}% of the limit)`)}>
          <span class="st-col-bar" style="height:${d.v / max * 100}%"></span>
          <span class="st-col-label">${d.today ? "Today" : admin.ptWeekday(d.start)}</span>
        </div>`).join("")}</div>
    </div>`;
}

function usageCard() {
  const head = `<div class="st-card-head"><h3>Database usage</h3><span>Firestore free plan${use ? ` · resets in ${fmtIn(use.reset - Date.now())}` : ""}</span></div>`;
  if (!use || useError) {
    const why = !useError ? "" : useError.code === "api-disabled"
      ? `<p class="ad-error">The Cloud Monitoring API is off for this project. <a href="https://console.cloud.google.com/apis/library/monitoring.googleapis.com?project=shinycheck-5189f" target="_blank" rel="noopener">Turn it on</a>, wait a minute and try again.</p>`
      : useError.code === "signed-out" ? `<p class="ad-error">The Google Cloud access ran out (it lasts an hour). Connect again.</p>`
      : `<p class="ad-error">${esc(useError.code === "forbidden" ? `Google Cloud said no: ${useError.message}` : useError.message)}</p>`;
    return `<section class="st-card wide ad-usage">${head}
        <p class="ad-note">Reads, writes, deletes and stored data come from Google Cloud Monitoring. Sign in with the Google account that owns the Firebase project to see them (access lasts an hour).</p>
        ${why}
        <button class="pf-btn" data-ad-connect ${useLoading ? "disabled" : ""}>${useLoading ? "Loading…" : use && useError ? "Try again" : "Connect Google Cloud"}</button>
      </section>`;
  }
  return `<section class="st-card wide ad-usage">${head}
      <div class="ad-meters">
        ${meter("Reads", use.reads.today, admin.FREE.reads, nf, "today")}
        ${meter("Writes", use.writes.today, admin.FREE.writes, nf, "today")}
        ${meter("Deletes", use.deletes.today, admin.FREE.deletes, nf, "today")}
        ${meter("Stored data", use.stored, admin.FREE.stored, fmtBytes, "total")}
      </div>
      <div class="ad-charts">${dayChart("Reads", use.reads, admin.FREE.reads)}${dayChart("Writes", use.writes, admin.FREE.writes)}</div>
      <p class="st-note">Days run midnight to midnight Pacific time, when the free limits reset. Numbers are a few minutes behind. Checked ${new Date(use.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · <button class="ad-link" data-ad-usage>Refresh</button></p>
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
  chartTips($("#adBody"));
  $("#adRefresh").addEventListener("click", load);
  $("#adBody").addEventListener("click", async e => {
    if (e.target.closest("[data-ad-usage]")) return loadUsage();
    if (!e.target.closest("[data-ad-connect]")) return;
    try {
      if (!admin.usageConnected()) await admin.connectUsage();
      await loadUsage();
    } catch (err) { useError = err; paint(); }
  });
  // Signing in (or the account loading) after opening /admin.
  addEventListener("cloud:ready", () => { if (state.adminView) renderAdmin(); });
  // While the page is open: fresh counts every minute.
  setInterval(() => { if (state.adminView && !document.hidden && !loading && admin.isAdmin()) load(); }, 60000);
  // The ⚙ menu entry, for the admin only.
  const item = $("#adminOpen");
  addEventListener("cloud:user", () => { item.hidden = !admin.isAdmin(); });
}
