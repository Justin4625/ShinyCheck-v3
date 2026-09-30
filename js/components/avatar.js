// A trainer's picture: a shiny they picked, their Google photo, or their initial on holo.
import { BASE } from "../core/config.js";
import { esc } from "../core/util.js";
import { mons } from "../model/dex.js";

const byKey = new Map(mons.map(m => [m.key, m]));
export const monByKey = key => byKey.get(key) || null;

export function avatar(p, cls = "") {
  const mon = p && p.avatar && monByKey(p.avatar);
  if (mon && mon.sprite) return `<span class="av av-mon ${cls}"><img src="${mon.sprite}" alt="" loading="lazy"></span>`;
  if (p && p.photo) return `<span class="av ${cls}"><img src="${esc(p.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
  return `<span class="av av-letter ${cls}">${esc(((p && p.name) || "?")[0].toUpperCase())}</span>`;
}

// Link to a trainer's profile: /@username, or /trainer/<uid> while the name isn't known.
export const trainerHref = (uid, p) => (p && p.username ? `${BASE}@${p.username}` : `${BASE}trainer/${uid}`);
