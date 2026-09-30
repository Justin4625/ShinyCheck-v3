// Pace: encounters per hour in the Hunt Deck, with how many more hours of hunting until the next odds
// milestone and the average hunting time per shiny at that pace (hunt time, not clock time). The maths lives in model/hunt-pace.js.
import { fmtEta, nf } from "../../core/format.js";
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
    $("#drPaceStats").innerHTML = stat("—", "enc. / hour") + stat("—", "more hunting to 1× odds") + stat("—", "hunting per shiny, avg.");
    $("#drPaceNote").textContent = "Your pace shows after a minute and a few encounters.";
    return;
  }
  $("#drPaceStats").innerHTML = stat(nf(Math.round(p.perHour)), "enc. / hour")
    + stat(fmtEta(p.toNext), `more hunting to ${p.next}× odds`)
    + stat(fmtEta(p.perShiny), "hunting per shiny, avg.");
  $("#drPaceNote").textContent = `At this pace you reach ${p.next}× odds when your timer shows about ${fmtEta(secs + p.toNext).slice(1)}. Hunt time only: pauses don't count.`;
}
