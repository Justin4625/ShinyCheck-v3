// The collection: logged shinies, running hunts and preferences, kept in localStorage
// and handed to the cloud module (services/cloud.js) on every change.
import { STORE } from "./config.js";
import { safe } from "./util.js";

// Legacy list of "caught" entries from the first versions; still read and written with backups
// and the cloud so nothing gets lost, but the app itself counts logged shinies.
export let caught = new Set(safe(() => JSON.parse(localStorage.getItem(STORE))) || []);
// Every change is kept in localStorage (instant, offline) and handed to the cloud
// module, which batches it into Firestore. "hunt" changes are throttled harder.
export const sync = kind => window.Cloud && window.Cloud.changed(kind);

// Hunts: { "<game>:<id>": { count, time, since, inc, odds, updated } }. `time` holds finished
// seconds; while running, `since` is the start timestamp so the clock survives reloads.
// Shinies: { "<game>:<id>": [{ count, time, odds, ts }] }.
export const HUNTS = "shinycheck-v3-hunts", SHINIES = "shinycheck-v3-shinies";
export let hunts = safe(() => JSON.parse(localStorage.getItem(HUNTS))) || {};
export let shinies = safe(() => JSON.parse(localStorage.getItem(SHINIES))) || {};
export const saveHunts = () => { safe(() => localStorage.setItem(HUNTS, JSON.stringify(hunts))); sync("hunt"); };
export const saveShinies = () => { safe(() => localStorage.setItem(SHINIES, JSON.stringify(shinies))); sync("data"); };
// Odds and step per game (see the Hunt Deck).
export const PREFS = "shinycheck-v3-prefs";
export const prefs = safe(() => JSON.parse(localStorage.getItem(PREFS))) || {};
export const savePrefs = () => { safe(() => localStorage.setItem(PREFS, JSON.stringify(prefs))); sync("data"); };
// Swap in a whole other collection (backup restore, cloud sync); callers save and redraw.
export const setProgress = (c, h, s) => { caught = c; hunts = h; shinies = s; };
export const hk = (gid, id) => `${gid}:${id}`;
export const elapsed = h => Math.floor((h.time || 0) + (h.since ? (Date.now() - h.since) / 1000 : 0));
export const isActive = h => h && (h.count > 0 || elapsed(h) > 0 || h.since);
