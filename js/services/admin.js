// Data for the admin dashboard (/admin, pages/admin.js). Only ADMIN_UID gets anything back: the
// Firestore rules allow these queries for that account only (isAdmin() in firestore.rules).
//
//   counts()  accounts, profiles, community totals and active trainers, as count queries (1 read per 1000)
//   online()  who had the app open in the last few minutes (presence/, written by features/presence.js)
//
// Firestore's own usage (reads, writes, storage) isn't read here: Google's Monitoring API needs billing,
// so the dashboard links to the Firebase console's usage page instead (USAGE_URL).
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

// ---------- Firestore usage ----------
// Shown in the Firebase console; the free (Spark) plan's daily limits reset around midnight Pacific time.
// https://firebase.google.com/docs/firestore/quotas
export const USAGE_URL = "https://console.firebase.google.com/project/shinycheck-5189f/firestore/databases/-default-/usage";
export const FREE = { reads: 50000, writes: 20000, deletes: 20000, stored: "1 GiB" };
