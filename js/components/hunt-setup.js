// Hunt method chips and bonus switches, shared by the Hunt Deck and "Add a shiny".
import { esc } from "../core/util.js";
import { HUNT_SETUP, levelOf } from "../model/hunt-setup.js";

// Method chips + bonus rows for a game's setup; shared by the Hunt Deck and "Add a shiny".
export function setupHtml(gid, setup) {
  const conf = HUNT_SETUP[gid];
  const chip = (attr, on, text) => `<button class="hs-chip ${on ? "on" : ""}" ${attr}>${text}</button>`;
  // A single method needs no picker (Legends: Z-A).
  const methods = conf && conf.methods.length > 1 ? conf.methods.map(([id, label]) => chip(`data-hm="${id}"`, setup.m === id, esc(label))).join("") : "";
  let rows = "";
  if (conf) {
    const allowed = (conf.methods.find(([id]) => id === setup.m) || conf.methods[0])[3].map(x => x.split(":")[0]);
    rows = conf.bonus.filter(b => allowed.includes(b.id)).map(b => b.type === "toggle"
      ? `<div class="hs-row"><span>${esc(b.label)}</span><button class="hs-switch" role="switch" aria-checked="${!!setup[b.id]}" data-hb="${b.id}"><i></i></button></div>`
      : `<div class="hs-row"><span>${esc(b.label)}</span><div class="hs-seg">${b.levels.map(([lv], i) => chip(`data-hl="${b.id}:${i}"`, levelOf(b, setup) === i, esc(lv))).join("")}</div></div>`).join("");
  }
  return `<div class="hs-methods">${methods}</div>${rows}`;
}
// Turn a click on a setup chip/switch into a patch (or null).
export function setupPatch(t, setup) {
  if (t.dataset.hm) return { m: t.dataset.hm };
  if (t.dataset.hb) return { [t.dataset.hb]: !setup[t.dataset.hb] };
  if (t.dataset.hl) { const [id, i] = t.dataset.hl.split(":"); return { [id]: +i }; }
  return null;
}
