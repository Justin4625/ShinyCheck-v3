// Per game: which entries count for its regional dex and which are "Outside the dex".
import { GAMES } from "../core/config.js";
import { state } from "../core/state.js";
import { lockedIn } from "./availability.js";
import { mons } from "./dex.js";
import { GAME_INFO, codeIn, codes, gamePrefix } from "./games.js";

// "Extra" on game pages: each regional dex number counts once. When several entries share a
// number (Raichu and Alolan Raichu on Galar #195), one is the dex entry — the game's own
// regional form (nativeForms), else the regular form — and the rest are extra. An entry is
// extra for a game if it's extra in every dex of that game it appears in.
const EXTRA = {};
for (const gid of GAMES) {
  const seen = new Map(), extraIn = new Map(), native = GAME_INFO[gid].nativeForms || [];
  const rank = m => native.includes(m.form) ? 0 : !m.variant && ["", "Original", "Basic"].includes(m.form) ? 1 : 2;
  for (const [p] of GAME_INFO[gid].sections) {
    const groups = new Map();
    for (const m of mons) {
      const c = codeIn(m, gid, p);
      if (!c) continue;
      groups.set(c, [...(groups.get(c) || []), m]);
      seen.set(m.id, (seen.get(m.id) || 0) + 1);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const base = [...list].sort((x, y) => rank(x) - rank(y) || x.id - y.id)[0];
      for (const m of list) if (m !== base) extraIn.set(m.id, (extraIn.get(m.id) || 0) + 1);
    }
  }
  EXTRA[gid] = new Set([...extraIn].filter(([id, n]) => n === seen.get(id)).map(([id]) => id));
}
// "Outside the dex" entries (code O…, e.g. Island Scan or Dynamax Adventures) are catchable
// in the game but not part of its regional dex, so they also fall under Extra.
export const outsideOnly = (m, gid) => codes(m, gid).every(c => gamePrefix(c) === "O");
export const isExtraForm = (m, gid) => EXTRA[gid].has(m.id) || outsideOnly(m, gid);
export const whereIn = (m, gid) => (m.where && m.where[gid]) || "";
export const codeLabel = (m, gid) => isExtraForm(m, gid) ? "outside the dex" : codes(m, gid).join(" / ");
// Every game with such entries gets an "Outside the dex" tab: Pokémon you can have in the
// game beyond its regional dex (other forms of a dex number, Dynamax Adventure legends…).
for (const gid of GAMES) {
  const s = GAME_INFO[gid].sections;
  if (!s.some(([p]) => p === "O") && mons.some(m => m.games[gid] && isExtraForm(m, gid))) s.push(["O", "Outside the dex"]);
}
// They only count towards totals when "Count outside the dex" is on.
// Shiny-locked Pokémon never count.
export const inGamePool = (m, gid) => (state.gOutside || !isExtraForm(m, gid)) && !lockedIn(m, gid);
