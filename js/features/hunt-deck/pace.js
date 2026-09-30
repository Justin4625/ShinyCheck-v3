// Pace: encounters per hour in the Hunt Deck, with how long until the next odds milestone and the
// average wait for a shiny at that pace. The maths lives in model/hunt-pace.js.
import { fmtClock, fmtEta, nf } from "../../core/format.js";
import { elapsed, hunts, isActive } from "../../core/store.js";
import { $ } from "../../core/util.js";
import { huntPace } from "../../model/hunt-pace.js";
import { curKey } from "./deck.js";

const stat = (v, l) => `<div><b>${v}</b><span>${l}</span></div>`;

export function paintPace(h) {
  const box = $("#drPace");
  box.hidden = !isActive(hunts[curKey()]);
  if (box.hidden) return;
  const secs = elapsed(h), p = huntPace(h, secs);
  if (!p) {
    $("#drPaceStats").innerHTML = stat("—", "enc. / hour") + stat("—", "to 1× odds") + stat("—", "avg. per shiny");
    $("#drPaceNote").textContent = "Your pace shows after a minute and a few encounters.";
    return;
  }
  $("#drPaceStats").innerHTML = stat(nf(Math.round(p.perHour)), "enc. / hour")
    + stat(fmtEta(p.toNext), `to ${p.next}× odds`)
    + stat(fmtEta(p.perShiny), "avg. per shiny");
  // A clock time only makes sense while the timer runs and the milestone is within the week.
  $("#drPaceNote").textContent = h.since && p.toNext < 6 * 86400
    ? `Hunting non-stop at this pace, you'd hit ${p.next}× odds around ${fmtClock(Date.now() + p.toNext * 1000)}.`
    : `Based on ${nf(h.count)} encounters in your hunt time. Every encounter has the same odds, whatever came before.`;
}
