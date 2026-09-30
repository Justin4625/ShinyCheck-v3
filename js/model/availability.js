// Which shinies can be had: shiny locks (overall and per game) and event-only Pokémon.
import { GAMES } from "../core/config.js";
import { GAME_INFO } from "./games.js";

// Shiny availability (checked Sept 2026 against Serebii's unavailable-Shiny table and
// shiny event archive, and NationalDex). Keyed by national dex number.
const SHINY_LOCKED = new Set([494, 720, 789, 790, 801, 802, 891, 892, 893, 896, 897, 898,
  1009, 1010, 1014, 1015, 1016, 1017, 1020, 1021, 1022, 1023, 1024, 1025]);
export const EVENT_ONLY = {
  490: "Only via a Pokémon HOME gift (Brilliant Diamond & Shining Pearl Pokédex, 2025).",
  647: "Only via a Pokémon HOME gift (Sword & Shield Pokédexes, 2025).",
  648: "Only via a Pokémon HOME gift (Scarlet & Violet Pokédexes, 2024).",
  719: "Only via event distributions (2015) and a ticketed Pokémon GO research (2025).",
  721: "Only via a Pokémon HOME gift (Legends: Z-A Pokédex, 2026).",
  807: "Only via an event distribution (2020).",
  890: "Only via an event distribution (2022).",
  1001: "Only via Tera Raid event distributions (2025).",
  1002: "Only via Tera Raid event distributions (2025).",
  1003: "Only via Tera Raid event distributions (2025).",
  1004: "Only via Tera Raid event distributions (2025).",
  1007: "Only via an event distribution (2025).",
  1008: "Only via an event distribution (2025).",
};
// Shiny locks within one game (Serebii's shiny-lock table, Sept 2026), kept only when every way
// to get the Pokémon in that game is locked — checked against Serebii's locations. A locked
// gift doesn't count if it's also wild or breedable there (e.g. the Z-A starters in Wild
// Zone 20, the PLA starters in outbreaks). "dex:Form" locks only that form; evolutions of a
// locked-only line are locked too.
const GAME_LOCKS = {
  // Diamond & Pearl: Manaphy is in the Sinnoh dex but only hatches from the Pokémon Ranger egg.
  dp: [490],
  // Platinum: Manaphy too, and Murkrow, Misdreavus, Glameow and Stunky (and their evolutions) are in its
  // Sinnoh dex but only come by trading from Diamond & Pearl.
  pt: [490, 198, 200, 429, 430, 431, 432, 434, 435],
  // HeartGold & SoulSilver: Mew and Celebi are in the Johto dex but only came through events there.
  hgss: [151, 251],
  // Black & White and Black 2 & White 2: Reshiram, Zekrom, Keldeo and Meloetta can't be shiny in Gen 5 and Genesect only
  // via later events (Bulbapedia); Rotom is only an in-game trade, which is never shiny, and can't breed.
  bw: [479, 643, 644, 647, 648, 649],
  // Black 2 & White 2 also has Tornadus, Thundurus and Landorus in its dex, only via the Dream Radar.
  bw2: [479, 641, 642, 643, 644, 645, 647, 648, 649],
  // Bulbapedia's shiny-lock table: in X & Y the legendary birds, Mewtwo and the Kalos trio can't be shiny.
  xy: [144, 145, 146, 150, 716, 717, 718],
  // Kyogre and Groudon are each only in one version, both locked there.
  oras: [382, 383, 384, 386],
  sm: [718, 785, 786, 787, 788, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800],
  usum: [718, 785, 786, 787, 788, 791, 792, 800],
  swsh: [772, 773, 803, 804, 888, 889, "144:Galarian", "145:Galarian", "146:Galarian"],
  bdsp: [151, 385],
  pla: [480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 641, 642, 645, 905],
  sv: [999, 1000, 144, 145, 146, 243, 244, 245, 249, 250, 380, 381, 382, 383, 384,
    638, 639, 640, 643, 644, 646, 791, 792, 800],
  lza: [150, 716, 717, 718, 382, 383, 384, 485, 491, 647, 648, 649, 720, 721, 801, 802, 807, 808, 809],
};
export const lockedIn = (m, gid) => !!gid && (SHINY_LOCKED.has(+m.dex)
  || (GAME_LOCKS[gid] || []).some(k => k === +m.dex || k === `${+m.dex}:${m.form}`));
export const shinyStatus = (m, gid) => SHINY_LOCKED.has(+m.dex)
  ? { kind: "locked", label: "Shiny locked", note: "No shiny has ever been released through legitimate means." }
  : lockedIn(m, gid) ? { kind: "locked", label: "Shiny locked", note: `Can't be shiny in ${GAME_INFO[gid].name}. Doesn't count toward this game's total.` }
  : EVENT_ONLY[+m.dex] ? { kind: "event", label: "Event only", note: `Shiny can't be hunted. ${EVENT_ONLY[+m.dex]}` } : null;
export const huntable = m => !shinyStatus(m) && GAMES.some(g => m.games[g]) && m.sprite;
