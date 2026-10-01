// Keeps the public side of the collection in step with it: the profile's shiny count, the
// collection shown on the profile page, and a feed post for every new catch.
//
// A catch gets a post id (`pid`) when it's logged (Gotcha, a phase, or a manual log of a recent
// catch: markPost). After each cloud save the posts are compared with the collection, so
// editing, moving, evolving or deleting a catch updates or removes its post as well.
import { shinies } from "../core/store.js";
import { mons } from "../model/dex.js";
import * as social from "../services/social.js";

// Logged by hand: only catches from the last few days count as new.
const RECENT = 3 * 24 * 3600 * 1000;
const ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
export function markPost(entry, { manual = false } = {}) {
  if (manual && !(entry.ts > Date.now() - RECENT)) return entry;
  entry.pid = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => ID_CHARS[b % 36]).join("");
  entry.postedAt = Date.now();
  return entry;
}

const keyOf = new Map(mons.map(m => [m.id, m.key]));
// Each catch as stored publicly, with its game and Pokémon keyword ("raichu-1").
function catches() {
  return Object.entries(shinies).flatMap(([k, list]) => {
    const i = k.indexOf(":"), g = k.slice(0, i), key = keyOf.get(+k.slice(i + 1));
    return key ? list.map(s => ({ s, g, key })) : [];
  });
}
// The fields a post has, in a fixed order so two versions compare as JSON.
// Never the nickname: that stays private.
const postFields = ({ key, g, alt, mark, count, time, odds, method, phases, ts }) => ({
  key, g, ...(alt ? { alt } : {}), ...(mark ? { mark } : {}), count: count || 0, time: time || 0,
  ...(odds !== undefined ? { odds: odds || null } : {}), ...(method ? { method: method.slice(0, 100) } : {}),
  ...(phases ? { phases } : {}), ts: ts || 0,
});
const toList = all => all.slice(-5000).map(({ s, g, key }) => ({
  k: key, g, ...(s.alt ? { a: s.alt } : {}), ...(s.mark ? { mk: s.mark } : {}), c: s.count || 0, t: s.time || 0,
  ...(s.odds ? { o: s.odds } : {}), ...(s.method ? { m: s.method.slice(0, 100) } : {}), ts: s.ts || 0,
}));

let posted = null, lastList = null, wasPublic = null, running = false, again = false, timer = null;
async function run() {
  if (!social.available()) return;
  if (running) { again = true; return; }
  running = true;
  try {
    const me = await social.myProfile();
    if (wasPublic === null) dispatchEvent(new CustomEvent("social:me", { detail: me }));
    const all = catches();
    if (!me.public) {
      // Private: nothing of the collection stays public.
      if (wasPublic !== false) {
        const mine = await social.myPostIds();
        await Promise.all([...mine.keys()].map(social.deletePost));
        await social.deleteCollection().catch(() => {});
        posted = new Map();
        lastList = null;
      }
      wasPublic = false;
      return;
    }
    wasPublic = true;
    const list = toList(all), json = JSON.stringify(list);
    if (json !== lastList) {
      await social.writeCollection(list);
      lastList = json;
      if (me.shinies !== all.length) await social.saveProfile({ shinies: all.length });
    }
    if (!posted) posted = new Map([...(await social.myPostIds())].map(([id, p]) => [id, JSON.stringify(postFields(p))]));
    const want = new Map(all.filter(c => c.s.pid).map(({ s, g, key }) => [`${social.myUid()}_${s.pid}`, { ...postFields({ ...s, g, key }), postedAt: s.postedAt || s.ts || Date.now() }]));
    for (const [id, data] of want) {
      const { postedAt, ...fields } = data, j = JSON.stringify(fields);
      if (posted.get(id) === j) continue;
      await social.writePost(id, data, !posted.has(id));
      posted.set(id, j);
    }
    for (const id of [...posted.keys()]) if (!want.has(id)) { await social.deletePost(id); posted.delete(id); }
  } catch (err) {
    console.warn("Profile not updated:", err.code || err);
    posted = null; // re-read from the server next time
  } finally {
    running = false;
    if (again) { again = false; schedule(); }
  }
}
const schedule = (ms = 1500) => { clearTimeout(timer); timer = setTimeout(run, ms); };

// Wiring: runs once at startup, from main.js.
export function init() {
  addEventListener("cloud:ready", () => schedule(3000));
  addEventListener("cloud:saved", () => schedule());
  // Signing out or switching accounts starts over.
  addEventListener("cloud:user", () => { posted = null; lastList = null; wasPublic = null; });
  // Going public or private takes effect right away.
  addEventListener("social:profile", e => { if (e.detail && e.detail.public !== wasPublic) { lastList = null; schedule(0); } });
}
