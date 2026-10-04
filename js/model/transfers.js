// Which games a logged shiny can be moved to ("Move to game" in Dex Entry). A shiny only moves along
// the real transfer routes, and only into a game that can hold that Pokémon — even when it can't be
// caught there (Mew can be moved into Scarlet & Violet through HOME).
import { speciesOf } from "./dex.js";

// Routes: trading within a generation; Gen 3 → 4 (Pal Park), 4 → 5 (Poké Transfer), 5 → 6 / 7
// (Poké Transporter + Bank); the Virtual Console Gold, Silver & Crystal only to Gen 7 (Poké
// Transporter). From Gen 2 on everything reaches HOME, and HOME connects the Switch games both
// ways. Let's Go and GO only send to HOME (Let's Go takes back what came from it; GO can also send
// to Let's Go through the GO Park). Nothing moves back to an older generation, and nothing moves into GO.
const GEN = { gs: 2, crystal: 2, rs: 3, frlg: 3, emerald: 3, dp: 4, pt: 4, hgss: 4, bw: 5, bw2: 5, xy: 6, oras: 6, sm: 7, usum: 7 };
const HOME_GAMES = ["swsh", "bdsp", "pla", "sv", "lza"];

// What an older game can hold: every species up to its generation's last one (Gen 7 stops at
// Marshadow and Zeraora; Meltan only came later), and no regional form newer than the game.
const MAX_DEX = { 2: 251, 3: 386, 4: 493, 5: 649, 6: 721, 7: 807 };
const FORM_GEN = { Alolan: 7, Galarian: 8, Hisuian: 8, "White Stripe": 8, Paldean: 9, "Paldean Combat Breed": 9 };
const isOriginal = m => ["", "Original", "Basic"].includes(m.form);

// Switch games also hold Pokémon they can't be caught in. Serebii's "Transfer Only Pokémon" pages
// (Oct 2026): national dex numbers, "dex:Form" for one form. Legends: Arceus takes only its Hisui
// dex; Legends: Z-A only adds forms (Vivillon patterns…), which Dex Entry keeps on the species.
const TRANSFER_ONLY = {
  swsh: [151, 251, 385, 422, 423, 494, 649, 719, 721, 801, 802, 807, 808, 809],
  bdsp: [251, 386, 489, 490],
  sv: [150, 151, 377, 378, 379, 385, 386, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493,
    641, 642, 645, 647, 719, 720, 721, 789, 790, 801, 888, 889, 890, 893, 894, 895, 898, 899, 901, 903, 905,
    "26:Alolan", "100:Hisuian", "101:Hisuian", "110:Galarian", "144:Galarian", "145:Galarian", "146:Galarian",
    "157:Hisuian", "215:Hisuian", "503:Hisuian", "549:Hisuian", "570:Hisuian", "571:Hisuian", "628:Hisuian",
    "705:Hisuian", "706:Hisuian", "713:Hisuian", "724:Hisuian"],
};
// Serebii: "any original form or Alolan form" of a Pokémon in Sword & Shield is transferable; Scarlet &
// Violet takes the original and every regional form of a Pokémon it has.
const SIBLING_FORMS = { swsh: ["Alolan"], sv: Object.keys(FORM_GEN) };

export function canHold(m, gid) {
  if (m.games[gid] || gid === "home") return true;
  const gen = GEN[gid];
  if (gen) return +m.dex <= MAX_DEX[gen] && (FORM_GEN[m.form] || 0) <= gen;
  if ((TRANSFER_ONLY[gid] || []).some(k => isOriginal(m) ? k === +m.dex : k === `${+m.dex}:${m.form}`)) return true;
  const forms = SIBLING_FORMS[gid];
  return !!forms && (isOriginal(m) || forms.includes(m.form)) && speciesOf(m).some(x => x.games[gid]);
}

// A logged shiny `l` ({ g, m, caughtIn }) can go from its game to `to`.
function canReach(l, to) {
  const from = l.g, gen = GEN[from];
  if (to === from || to === "pogo") return false;
  if (to === "home" || HOME_GAMES.includes(to)) return true;
  if (to === "lgpe") return from === "pogo" || (l.caughtIn || from) === "lgpe";
  const tg = GEN[to];
  return !!gen && (tg === gen || (tg > gen && (gen >= 3 || tg === 7)));
}

export const canMove = (l, to) => canReach(l, to) && canHold(l.m, to);
