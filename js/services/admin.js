// Data for the admin dashboard (/admin, pages/admin.js). Only ADMIN_UID gets anything back: the
// Firestore rules allow these queries for that account only (isAdmin() in firestore.rules).
//
//   counts()  accounts, profiles, community totals and active trainers, as count queries (1 read per 1000)
//   online()  who had the app open in the last few minutes (presence/, written by features/presence.js)
//   usage()   today's Firestore reads, writes and deletes and the stored data, from Google Cloud
//             Monitoring, next to the free plan's limits. Needs a Google sign-in with read access
//             to the project's monitoring (connectUsage), separate from the ShinyCheck sign-in.
import { ADMIN_UID } from "../core/config.js";
import { myUid, profilesOf } from "./social.js";

export const isAdmin = () => myUid() === ADMIN_UID;
// Online = seen within this long; the app stamps presence every 4 minutes (features/presence.js).
export const ONLINE_FOR = 5 * 60 * 1000;
const DAY = 86400000;

const fb = () => window.Cloud.fb;
const ago = ms => fb().fs.Timestamp.fromMillis(Date.now() - ms);

// ---------- Accounts and activity ----------
export async function counts() {
  const { fs, db } = fb(), { collection, query, where, getCountFromServer, getAggregateFromServer, sum } = fs;
  const col = name => collection(db, name);
  const n = async q => (await getCountFromServer(q)).data().count;
  const seenSince = ms => n(query(col("presence"), where("seen", ">=", ago(ms))));
  const [accounts, profiles, privateProfiles, newWeek, posts, likes, follows, shinies, online, today, week] = await Promise.all([
    n(col("users")),
    n(col("profiles")),
    n(query(col("profiles"), where("public", "==", false))),
    n(query(col("profiles"), where("createdAt", ">=", ago(7 * DAY)))),
    n(col("posts")),
    n(col("likes")),
    n(col("follows")),
    getAggregateFromServer(col("profiles"), { s: sum("shinies") }).then(r => r.data().s || 0),
    seenSince(ONLINE_FOR),
    seenSince(DAY),
    seenSince(7 * DAY),
  ]);
  return { accounts, profiles, privateProfiles, newWeek, posts, likes, follows, shinies, online, today, week };
}

// The trainers online now, newest first, with their profiles (null for an account without one).
export async function online() {
  const { collection, query, where, orderBy, limit, getDocs } = fb().fs;
  const snap = await getDocs(query(collection(fb().db, "presence"), where("seen", ">=", ago(ONLINE_FOR)), orderBy("seen", "desc"), limit(40)));
  const list = snap.docs.map(d => ({ uid: d.id, seen: d.data().seen.toMillis() }));
  const profiles = await profilesOf(list.map(x => x.uid));
  return list.map(x => ({ ...x, profile: profiles.get(x.uid) }));
}

// ---------- Firestore usage (Google Cloud Monitoring) ----------
// The free (Spark) plan's limits: https://firebase.google.com/docs/firestore/quotas
// The daily ones reset around midnight Pacific time.
export const FREE = { reads: 50000, writes: 20000, deletes: 20000, stored: 1024 ** 3 };
const PT = "America/Los_Angeles";

// Minutes Pacific time is ahead of UTC (negative) at a moment.
function ptOffset(ms) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: PT, timeZoneName: "longOffset" }).formatToParts(ms).find(p => p.type === "timeZoneName").value;
  const m = name.match(/([+-])(\d\d):(\d\d)/);
  return m ? (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +m[3]) : 0;
}
// Midnight Pacific time of the day `ms` falls in. Clocks change at 2 AM, so the offset at the
// UTC midnight before (late afternoon the day before, Pacific) is the one midnight has.
export function ptMidnight(ms = Date.now()) {
  const [y, mo, d] = new Intl.DateTimeFormat("en-CA", { timeZone: PT }).format(ms).split("-").map(Number);
  const utc = Date.UTC(y, mo - 1, d);
  return utc - ptOffset(utc) * 60000;
}
export const nextReset = (ms = Date.now()) => ptMidnight(ptMidnight(ms) + 26 * 3600000);
export const ptWeekday = ms => new Intl.DateTimeFormat("en-US", { timeZone: PT, weekday: "short" }).format(ms);
export const ptDate = ms => new Intl.DateTimeFormat("en-GB", { timeZone: PT, weekday: "long", day: "numeric", month: "short" }).format(ms);

// The access token for Cloud Monitoring lasts an hour; kept for this tab only.
const SCOPE = "https://www.googleapis.com/auth/monitoring.read";
const TOKEN = "shinycheck-admin-monitoring";
const usageErr = (code, message) => Object.assign(new Error(message || code), { code });
function token() {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN) || "null");
    return t && t.exp > Date.now() + 60000 ? t.value : null;
  } catch { return null; }
}
export const usageConnected = () => !!token();

function loadGis() {
  if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement("script"), { src: "https://accounts.google.com/gsi/client", async: true, onload: resolve, onerror: reject });
    document.head.append(s);
  });
}
// Asks Google for read access to the project's monitoring (a popup: call it from a tap).
export async function connectUsage() {
  const clientId = window.Cloud.googleClientId;
  if (!clientId) throw usageErr("no-client", "Google sign-in isn't set up (googleClientId in firebase-config.js).");
  await loadGis();
  const user = fb().auth.currentUser;
  return new Promise((resolve, reject) => {
    google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      login_hint: (user && user.email) || undefined,
      callback: r => {
        if (r.error || !r.access_token) return reject(usageErr("denied", r.error_description || r.error || "No access given."));
        try { sessionStorage.setItem(TOKEN, JSON.stringify({ value: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 })); } catch {}
        resolve();
      },
      error_callback: e => reject(usageErr("popup", e && e.type === "popup_closed" ? "The Google window was closed." : "The Google window didn't open.")),
    }).requestAccessToken();
  });
}

// One Firestore metric, summed per `period` seconds over [start, end].
async function metric(name, start, end, period, aligner = "ALIGN_SUM") {
  const t = token();
  if (!t) throw usageErr("signed-out");
  const project = fb().db.app.options.projectId;
  const q = new URLSearchParams({
    filter: `metric.type="firestore.googleapis.com/${name}"`,
    "interval.startTime": new Date(start).toISOString(),
    "interval.endTime": new Date(end).toISOString(),
    "aggregation.alignmentPeriod": `${Math.max(60, Math.round(period))}s`,
    "aggregation.perSeriesAligner": aligner,
    "aggregation.crossSeriesReducer": "REDUCE_SUM",
  });
  const r = await fetch(`https://monitoring.googleapis.com/v3/projects/${project}/timeSeries?${q}`, { headers: { Authorization: `Bearer ${t}` } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (body.error && body.error.message) || `HTTP ${r.status}`;
    if (r.status === 401) { try { sessionStorage.removeItem(TOKEN); } catch {} throw usageErr("signed-out", msg); }
    if (/SERVICE_DISABLED|has not been used|is disabled/i.test(JSON.stringify(body))) throw usageErr("api-disabled", msg);
    throw usageErr(r.status === 403 ? "forbidden" : "failed", msg);
  }
  // Every point: when its period ends, and its value. Periods without any activity have no point.
  return ((body.timeSeries && body.timeSeries[0] && body.timeSeries[0].points) || [])
    .map(p => ({ end: Date.parse(p.interval.endTime), v: +(p.value.int64Value ?? p.value.doubleValue ?? 0) }));
}

// Today so far (since midnight Pacific) and the 7 days before, per Pacific day. Around a clock change
// one of those days is off by an hour, which doesn't matter for a quota check.
export async function usage() {
  const now = Date.now(), today = ptMidnight(now), weekStart = today - 7 * DAY;
  const daily = async name => {
    const [now7, todayPts] = await Promise.all([metric(name, weekStart, today, DAY / 1000), metric(name, today, now, (now - today) / 1000)]);
    const days = Array.from({ length: 7 }, (_, i) => ({ start: weekStart + i * DAY, v: 0 }));
    for (const p of now7) {
      const i = Math.round((p.end - weekStart) / DAY) - 1;
      if (days[i]) days[i].v += p.v;
    }
    const sofar = todayPts.reduce((t, p) => t + p.v, 0);
    return { today: sofar, days: [...days, { start: today, v: sofar, today: true }] };
  };
  const [reads, writes, deletes, stored] = await Promise.all([
    daily("document/read_ops_count"),
    daily("document/write_ops_count"),
    daily("document/delete_ops_count"),
    // Stored data is a gauge sampled now and then: the newest value of the last few days.
    metric("storage/data_and_index_storage_bytes", now - 3 * DAY, now, 3600, "ALIGN_MAX").then(p => (p[0] ? p[0].v : null)),
  ]);
  return { reads, writes, deletes, stored, at: now, reset: nextReset(now) };
}
