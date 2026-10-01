// Tooltip for charts (Stats, the admin dashboard): bars carry their numbers in data-tip (tipAttr), and
// one shared tooltip shows it on hover with a mouse, tap or keyboard focus.
import { esc } from "../core/util.js";

export const tipAttr = html => `data-tip="${esc(html)}" tabindex="0"`;

const tip = Object.assign(document.createElement("div"), { className: "st-tip", role: "tooltip" });
const hide = () => tip.classList.remove("show");
function show(t) {
  tip.innerHTML = t.dataset.tip;
  tip.classList.add("show");
  const r = t.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  const bar = t.querySelector(".st-col-bar, .st-row-track i") || t, br = bar.getBoundingClientRect();
  tip.style.left = Math.min(innerWidth - w - 8, Math.max(8, br.left + br.width / 2 - w / 2)) + "px";
  tip.style.top = (br.top - h - 10 < 8 ? r.bottom + 10 : br.top - h - 10) + "px";
}

let added = false;
// Shows the tooltips of every [data-tip] inside `box` (once per box, from an init()).
export function chartTips(box) {
  if (!added) {
    document.body.append(tip);
    addEventListener("scroll", hide, { passive: true });
    added = true;
  }
  box.addEventListener("pointerover", e => { const t = e.target.closest("[data-tip]"); t ? show(t) : hide(); });
  box.addEventListener("pointerleave", hide);
  box.addEventListener("focusin", e => { const t = e.target.closest("[data-tip]"); if (t) show(t); });
  box.addEventListener("focusout", hide);
}
