// Progress ring and section progress bars.
import { done, has, pct } from "../core/collection.js";

export function setRing(ring, p) {
  ring.querySelector(".fill").style.strokeDashoffset = 326.73 * (1 - p / 100);
}

export function updateSection(root, key, all, f = has) {
  const s = root.querySelector(`.section-meta[data-sec="${key}"]`);
  if (!s) return;
  s.querySelector(".sec-count").textContent = `${done(all, f)} / ${all.length}`;
  s.querySelector(".sec-bar i").style.width = pct(all, f) + "%";
}
