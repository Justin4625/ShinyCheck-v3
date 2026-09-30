// Hunt methods and bonuses per game, and the shiny odds they give.
// Odds and step are remembered per game, so they stick before the first encounter
// and carry over to the next hunt in that game.
// Hunt setup per game, built from parts instead of a list of combinations:
// a method (Wild, Masuda, Outbreak…) plus the bonuses that apply to it. Odds come from
// shiny rolls, P = 1 − (4095/4096)^rolls (roll counts checked against RotomLabs and
// PokéTools); some methods have a fixed rate ({ odds, charm }) or a table/formula of their
// own (a function of the chosen levels) instead. A new game only needs its parts.
// A level bonus may set `def` (the level used when a setup hasn't picked one yet) and `tag` (how the
// chosen level reads in the method label; default "<label> <level>").
const CHARM = { id: "charm", label: "Shiny Charm", type: "toggle" };
const pctToOdds = pct => Math.round(1000 / pct) / 10;
export const HUNT_SETUP = {
  // Allowed bonuses may override their rolls per method ("charm:1"). Checked against
  // RotomLabs: in SwSh the charm adds 2 rolls in the wild and in Masuda, 1 for regular
  // eggs; in BD & SP it does nothing in the wild, Grand Underground or Poké Radar.
  // Ultra Sun & Ultra Moon: SOS chains add rolls at 11, 21 and 31 calls (+4/+8/+12), the
  // Shiny Charm +2; best 1/273 (checked against RotomLabs / PokéStats / RankedBoost).
  // Ultra Wormholes (USUM only, Serebii + GamerGuides): regular Pokémon in the Ultra Space Wilds are
  // shiny at a percentage set by the wormhole's rings and the light-years flown: no ring 1%, 1 ring
  // 1 + n%, 2 rings 1 + 2n%, 2 rings with aura 4n%, n = min(9, ⌊ly / 500⌋ − 1), so 10/19/36% from
  // 5,000 ly. Below 1,000 ly only ring-less wormholes appear. The Shiny Charm doesn't count there,
  // and legendaries in wormholes are ordinary encounters (hunt those with Wild).
  usum: { methods: [["wild", "Wild / SOS", 1, ["charm", "sos"]], ["masuda", "Masuda", 6, ["charm"]],
    ["uw", "Ultra Wormhole", lv => { const n = lv("ly"); return pctToOdds([1, 1 + n, 1 + 2 * n, 4 * n][lv("ring")]); }, ["ring", "ly"]]],
    bonus: [{ ...CHARM, rolls: 2 }, { id: "sos", label: "SOS chain", type: "level", levels: [["–", 0], ["11+", 4], ["21+", 8], ["31+", 12]] },
      { id: "ring", label: "Wormhole", type: "level", tag: lv => lv, levels: [["No ring", 0], ["1 ring", 1], ["2 rings", 2], ["2 rings + aura", 3]] },
      { id: "ly", label: "Light-years", type: "level", def: 8, tag: lv => `${lv} ly`,
        levels: [["1,000", 1], ["1,500", 2], ["2,000", 3], ["2,500", 4], ["3,000", 5], ["3,500", 6], ["4,000", 7], ["4,500", 8], ["5,000+", 9]] }] },
  // Sun & Moon share Gen 7's SOS, Masuda and Shiny Charm rules with USUM, but have no Ultra Wormholes.
  get sm() { return { ...this.usum, methods: this.usum.methods.filter(([id]) => id !== "uw") }; },
  // Let's Go: rolls from a Lure (+1), the Shiny Charm (+2) and the species' Catch Combo
  // (11+ → +3, 21+ → +7, 31+ → +11); all three together give 1/273.
  lgpe: { methods: [["wild", "Wild", 1, ["charm", "lure", "combo"]]],
    bonus: [{ ...CHARM, rolls: 2 }, { id: "lure", label: "Lure", type: "toggle", rolls: 1 },
      { id: "combo", label: "Catch Combo", type: "level", levels: [["0–10", 0], ["11+", 3], ["21+", 7], ["31+", 11]] }] },
  // Sword & Shield (RotomLabs): the Number Battled bonus only helps Pokémon with a Brilliant Aura, which
  // need at least 1 KO of the species: 2 rolls, 3 from 50, 4 from 100, 5 from 200, 6 from 300, 7 from 500
  // (+2 with the charm, best 1/455.6). Other wild spawns stay at the normal rate. Max Raids are 1/4096
  // and ignore the charm.
  swsh: { methods: [["wild", "Wild", 1, ["charm"]], ["brilliant", "Brilliant Aura", 2, ["charm", "ko"]],
    ["breed", "Breeding", 1, ["charm:1"]], ["masuda", "Masuda", 6, ["charm"]],
    ["raid", "Max Raid", { odds: 4096 }, []], ["dyna", "Dynamax Adventure", { odds: 300, charm: 100 }, ["charm"]]],
    bonus: [{ ...CHARM, rolls: 2 },
      { id: "ko", label: "Number battled", type: "level", levels: [["1+", 0], ["50+", 1], ["100+", 2], ["200+", 3], ["300+", 4], ["500+", 5]] }] },
  // Poké Radar (RotomLabs): the chance a shiny patch appears, by chain length. It climbs slowly to
  // 1/1192 at 35, then jumps: 36 → 1/993, 37 → 1/799, 38 → 1/400, 39 → 1/200, 40+ → 1/99.
  // "10+" etc. use the lowest rate of that stretch. Hunts from before the chain picker were at 40.
  bdsp: { methods: [["wild", "Wild", 1, []], ["gu", "Grand Underground", 1, ["diglett"]], ["breed", "Breeding", 1, ["charm:1"]],
    ["masuda", "Masuda", 6, ["charm"]], ["radar", "Poké Radar", lv => lv("chain"), ["chain"]]],
    bonus: [{ ...CHARM, rolls: 2 }, { id: "diglett", label: "Diglett bonus", type: "toggle", rolls: 1 },
      { id: "chain", label: "Chain", type: "level", def: 8, tag: lv => `chain ${lv}`,
        levels: [["0–9", 4096], ["10+", 2521], ["20+", 1820], ["30+", 1310], ["36", 993], ["37", 799], ["38", 400], ["39", 200], ["40+", 99]] }] },
  pla: { methods: [["wild", "Wild", 1, ["charm", "research"]], ["mo", "Mass outbreak", 26, ["charm", "research"]], ["mmo", "Massive mass outbreak", 13, ["charm", "research"]]],
    bonus: [{ ...CHARM, rolls: 3 }, { id: "research", label: "Research", type: "level", levels: [["–", 0], ["Lv 10", 1], ["Perfect", 3]] }] },
  // Scarlet & Violet (RotomLabs): eggs 1/4096, 1/2048 with the charm; Tera Raids 1/4103 and the
  // charm doesn't apply.
  sv: { methods: [["wild", "Wild", 1, ["charm", "outbreak", "sparkling"]], ["breed", "Breeding", 1, ["charm:1"]], ["masuda", "Masuda", 6, ["charm"]],
    ["raid", "Tera Raid", { odds: 4103 }, []]],
    bonus: [{ ...CHARM, rolls: 2 }, { id: "outbreak", label: "Outbreak cleared", type: "level", levels: [["–", 0], ["30+", 1], ["60+", 2]] },
      { id: "sparkling", label: "Sparkling Power", type: "level", levels: [["–", 0], ["1", 1], ["2", 2], ["3", 3]] }] },
  lza: { methods: [["wild", "Wild", 1, ["charm", "sparkling"]]],
    bonus: [{ ...CHARM, rolls: 3 }, { id: "sparkling", label: "Sparkling Power", type: "level", levels: [["–", 0], ["1", 1], ["2", 2], ["3", 3]] }] },
};
const rollsToOdds = r => Math.round(1 / (1 - Math.pow(4095 / 4096, r)));
// The level index a setup picked for a level bonus (or the bonus's default).
export const levelOf = (b, setup) => setup[b.id] ?? b.def ?? 0;
// setup = { m: method id, charm: bool, <level id>: index }
export function evalSetup(gid, setup) {
  const conf = HUNT_SETUP[gid];
  if (!conf) return { odds: 4096, label: "" };
  const [, mLabel, base, allowedRaw] = conf.methods.find(([id]) => id === setup.m) || conf.methods[0];
  const allowed = allowedRaw.map(x => x.split(":")[0]);
  const override = Object.fromEntries(allowedRaw.filter(x => x.includes(":")).map(x => [x.split(":")[0], +x.split(":")[1]]));
  const active = conf.bonus.filter(b => allowed.includes(b.id)).map(b => b.id in override ? { ...b, rolls: override[b.id] } : b);
  const parts = [mLabel];
  if (typeof base === "function") {
    // Table/formula methods: every chosen level is part of the label, the function gives the odds.
    const lv = id => { const b = active.find(x => x.id === id); return (b.levels[levelOf(b, setup)] || b.levels[0])[1]; };
    for (const b of active) { const l = (b.levels[levelOf(b, setup)] || b.levels[0])[0]; parts.push(b.tag ? b.tag(l) : `${b.label} ${l}`); }
    return { odds: base(lv), label: parts.join(" · ") };
  }
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
