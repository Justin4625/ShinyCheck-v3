// Questions about the collection: is an entry logged, in which games, how complete is a list.
import { LOG_GAMES } from "./config.js";
import { hk, prefs, shinies } from "./store.js";
import { norm } from "./util.js";
import { GAME_INFO } from "../model/games.js";

export const matchText = (m, input) => {
  const q = norm(input.value.trim());
  return !q || norm(m.name).includes(q) || m.key.includes(q) || m.dex.includes(q) ||
    norm(m.form).includes(q) || String(+m.dex) === q;
};
// Living Dex status is global; on a game page "caught" means a shiny logged in that game.
// Living Dex: an entry counts once a shiny of it is logged in any game (including GO).
export const loggedIn = m => LOG_GAMES.filter(g => (shinies[hk(g, m.id)] || []).length);
export const has = m => loggedIn(m).length > 0;
// "Share across games" (Shiny Dex toolbar, off by default): a shiny logged anywhere also
// counts in every other game the form appears in, like moving it there through HOME.
export const sharing = () => !!prefs.shareAcrossGames;
const ownIn = (gid, m) => (shinies[hk(gid, m.id)] || []).length > 0;
export const gHas = gid => m => ownIn(gid, m) || (sharing() && has(m));
export const viaLabel = m => loggedIn(m).map(g => GAME_INFO[g].name).join(", ");
export const done = (list, f = has) => list.filter(f).length;
export const pct = (list, f = has) => list.length ? (done(list, f) / list.length) * 100 : 0;

// All logged shinies of one entry (form) across every game.
export const shiniesOf = m => LOG_GAMES.flatMap(g => (shinies[hk(g, m.id)] || []).map((s, i) => ({ ...s, g, i, m })));
