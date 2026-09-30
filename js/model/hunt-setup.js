// Hunt methods and bonuses per game, and the shiny odds they give.
// Odds and step are remembered per game, so they stick before the first encounter
// and carry over to the next hunt in that game.
// Hunt setup per game, built from parts instead of a list of combinations:
// a method (Wild, Masuda, Outbreak…) plus the bonuses that apply to it. Odds come from
// shiny rolls, P = 1 − (4095/4096)^rolls (roll counts checked against RotomLabs and
// PokéTools); some methods have a fixed rate instead. A new game only needs its parts.
const CHARM = { id: "charm", label: "Shiny Charm", type: "toggle" };
export const HUNT_SETUP = {
  // Allowed bonuses may override their rolls per method ("charm:1"). Checked against
  // RotomLabs: in SwSh the charm adds 2 rolls in the wild and in Masuda, 1 for regular
  // eggs; in BD & SP it does nothing in the wild, Grand Underground or Poké Radar.
  // Ultra Sun & Ultra Moon: SOS chains add rolls at 11, 21 and 31 calls (+4/+8/+12), the
  // Shiny Charm +2; best 1/273 (checked against RotomLabs / PokéStats / RankedBoost).
  usum: { methods: [["wild", "Wild / SOS", 1, ["charm", "sos"]], ["masuda", "Masuda", 6, ["charm"]]],
    bonus: [{ ...CHARM, rolls: 2 }, { id: "sos", label: "SOS chain", type: "level", levels: [["–", 0], ["11+", 4], ["21+", 8], ["31+", 12]] }] },
  // Sun & Moon share Gen 7's SOS, Masuda and Shiny Charm rules with USUM.
  get sm() { return this.usum; },
  // Let's Go: rolls from a Lure (+1), the Shiny Charm (+2) and the species' Catch Combo
  // (11+ → +3, 21+ → +7, 31+ → +11); all three together give 1/273.
  lgpe: { methods: [["wild", "Wild", 1, ["charm", "lure", "combo"]]],
    bonus: [{ ...CHARM, rolls: 2 }, { id: "lure", label: "Lure", type: "toggle", rolls: 1 },
      { id: "combo", label: "Catch Combo", type: "level", levels: [["0–10", 0], ["11+", 3], ["21+", 7], ["31+", 11]] }] },
  swsh: { methods: [["wild", "Wild", 1, ["charm"]], ["breed", "Breeding", 1, ["charm:1"]], ["masuda", "Masuda", 6, ["charm"]],
    ["dyna", "Dynamax Adventure", { odds: 300, charm: 100 }, ["charm"]]],
    bonus: [{ ...CHARM, rolls: 2 }] },
  bdsp: { methods: [["wild", "Wild", 1, []], ["gu", "Grand Underground", 1, ["diglett"]], ["breed", "Breeding", 1, ["charm:1"]],
    ["masuda", "Masuda", 6, ["charm"]], ["radar", "Poké Radar chain 40+", { odds: 99 }, []]],
    bonus: [{ ...CHARM, rolls: 2 }, { id: "diglett", label: "Diglett bonus", type: "toggle", rolls: 1 }] },
  pla: { methods: [["wild", "Wild", 1, ["charm", "research"]], ["mo", "Mass outbreak", 26, ["charm", "research"]], ["mmo", "Massive mass outbreak", 13, ["charm", "research"]]],
    bonus: [{ ...CHARM, rolls: 3 }, { id: "research", label: "Research", type: "level", levels: [["–", 0], ["Lv 10", 1], ["Perfect", 3]] }] },
  sv: { methods: [["wild", "Wild", 1, ["charm", "outbreak", "sparkling"]], ["masuda", "Masuda", 6, ["charm"]]],
    bonus: [{ ...CHARM, rolls: 2 }, { id: "outbreak", label: "Outbreak cleared", type: "level", levels: [["–", 0], ["30+", 1], ["60+", 2]] },
      { id: "sparkling", label: "Sparkling Power", type: "level", levels: [["–", 0], ["1", 1], ["2", 2], ["3", 3]] }] },
  lza: { methods: [["wild", "Wild", 1, ["charm", "sparkling"]]],
    bonus: [{ ...CHARM, rolls: 3 }, { id: "sparkling", label: "Sparkling Power", type: "level", levels: [["–", 0], ["1", 1], ["2", 2], ["3", 3]] }] },
};
const rollsToOdds = r => Math.round(1 / (1 - Math.pow(4095 / 4096, r)));
// setup = { m: method id, charm: bool, <level id>: index }
export function evalSetup(gid, setup) {
  const conf = HUNT_SETUP[gid];
  if (!conf) return { odds: 4096, label: "" };
  const [, mLabel, base, allowedRaw] = conf.methods.find(([id]) => id === setup.m) || conf.methods[0];
  const allowed = allowedRaw.map(x => x.split(":")[0]);
  const override = Object.fromEntries(allowedRaw.filter(x => x.includes(":")).map(x => [x.split(":")[0], +x.split(":")[1]]));
  const active = conf.bonus.filter(b => allowed.includes(b.id)).map(b => b.id in override ? { ...b, rolls: override[b.id] } : b);
  const parts = [mLabel];
  if (typeof base === "object") {
    const charm = allowed.includes("charm") && setup.charm && base.charm;
    if (charm) parts.push("Shiny Charm");
    return { odds: charm ? base.charm : base.odds, label: parts.join(" · ") };
  }
  let rolls = base;
  for (const b of active) {
    if (b.type === "toggle" && setup[b.id]) { rolls += b.rolls; parts.push(b.label); }
    if (b.type === "level" && setup[b.id]) { const [lv, r] = b.levels[setup[b.id]] || b.levels[0]; rolls += r; if (r) parts.push(`${b.label} ${lv}`); }
  }
  return { odds: rollsToOdds(rolls), label: parts.join(" · ") };
}
export const defaultSetup = gid => ({ m: HUNT_SETUP[gid] ? HUNT_SETUP[gid].methods[0][0] : "wild" });
export function patchSetup(gid, setup, patch) {
  const next = { ...setup, ...patch };
  // Legends: Arceus gives the Shiny Charm only once every species is at research level 10.
  if (gid === "pla") {
    if (patch.charm && !next.research) next.research = 1;
    if ("research" in patch && !patch.research && next.charm) next.research = 1;
  }
  return next;
}
