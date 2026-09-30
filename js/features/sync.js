// Serialising the collection for backups and the cloud, and loading one back in.
import { STORE } from "../core/config.js";
import { HUNTS, PREFS, SHINIES, caught, hunts, prefs, setProgress, shinies, sync } from "../core/store.js";
import { safe } from "../core/util.js";
import { entryMon, paintEntry } from "./dex-entry.js";
import { cur, dr, paintHunt, paintLog } from "./hunt-deck/deck.js";
import { mons } from "../model/dex.js";
import { render } from "../pages/router.js";

// Locally everything is keyed by entry id; backups and the cloud use the sheet's stable
// keyword ("raichu-1") so data survives a data update that renumbers entries.
const keyById = new Map(mons.map(m => [m.id, m.key]));
const idByKey = new Map(mons.map(m => [m.key, m.id]));
const outEntry = s => s.evolvedFrom ? { ...s, evolvedFrom: s.evolvedFrom.map(id => keyById.get(id)) } : s;
// Version-2 backups stored evolvedFrom as ids, newer data as keywords.
const inEntry = s => s.evolvedFrom ? { ...s, evolvedFrom: s.evolvedFrom.map(k => typeof k === "number" ? k : idByKey.get(k)).filter(Boolean) } : s;
const outMap = (obj, f = x => x) => Object.fromEntries(Object.entries(obj).map(([k, v]) => {
  const i = k.indexOf(":");
  return [`${k.slice(0, i)}:${keyById.get(+k.slice(i + 1))}`, f(v)];
}));
const inMap = (obj, f = x => x) => Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => {
  const i = k.indexOf(":"), id = idByKey.get(k.slice(i + 1));
  return id ? [`${k.slice(0, i)}:${id}`, f(v)] : null;
}).filter(Boolean));

export function snapshot() {
  return {
    version: 3,
    caught: [...caught].map(id => keyById.get(id)).filter(Boolean),
    hunts: outMap(hunts),
    shinies: outMap(shinies, list => list.map(outEntry)),
    prefs: { ...prefs },
  };
}

// Replace all progress (backup import or cloud) and redraw whatever is open.
export function applyData(data, { quiet = false } = {}) {
  setProgress(
    new Set((data.caught || []).map(k => idByKey.get(k)).filter(Boolean)),
    inMap(data.hunts),
    inMap(data.shinies, list => list.map(inEntry)),
  );
  for (const k of Object.keys(prefs)) delete prefs[k];
  Object.assign(prefs, data.prefs || {});
  safe(() => {
    localStorage.setItem(STORE, JSON.stringify([...caught]));
    localStorage.setItem(HUNTS, JSON.stringify(hunts));
    localStorage.setItem(SHINIES, JSON.stringify(shinies));
    localStorage.setItem(PREFS, JSON.stringify(prefs));
  });
  if (!quiet) sync("data");
  render();
  if (cur && dr.root.classList.contains("open")) { paintHunt(); paintLog(); }
  if (entryMon) paintEntry();
}

export const hasLocalData = () => caught.size > 0 || Object.keys(hunts).length > 0 || Object.keys(shinies).length > 0;
