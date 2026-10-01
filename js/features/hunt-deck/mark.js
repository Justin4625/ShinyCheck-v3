// Mark in the Hunt Deck: for games with marks (Sword & Shield, Scarlet & Violet, HOME) you pick the mark
// the shiny has (or the one you're hunting for) under the title; Gotcha! logs it with the shiny.
import { markPicker } from "../../components/mark-picker.js";
import { hunts, saveHunts } from "../../core/store.js";
import { $ } from "../../core/util.js";
import { cur, curGame, curKey } from "./deck.js";

// Mark picked before the hunt has started (a hunt only exists once it runs), like the form.
const markPick = {};
export const huntMark = () => (hunts[curKey()] || {}).mark || markPick[curKey()] || "";

export function paintMark() {
  const box = $("#drMark"), pick = cur ? markPicker(curGame, huntMark()) : "";
  box.hidden = !pick;
  $("#drMarkBox").innerHTML = pick;
}
// A new hunt keeps the mark picked before it started.
export function carryMark(h, k) {
  if (!h.mark && markPick[k]) h.mark = markPick[k];
}
// After Gotcha! the next hunt starts without a mark.
export const clearMark = k => { delete markPick[k]; };

// Wiring: runs once at startup, from main.js.
export function init() {
  $("#drMark").addEventListener("change", e => {
    const v = e.target.value, k = curKey();
    if (v) markPick[k] = v; else delete markPick[k];
    if (hunts[k]) { if (v) hunts[k].mark = v; else delete hunts[k].mark; saveHunts(); }
  });
}
