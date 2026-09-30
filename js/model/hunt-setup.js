// Hunt methods and bonuses per game, and the shiny odds they give.
// Odds and step are remembered per game, so they stick before the first encounter
// and carry over to the next hunt in that game.
// Hunt setup per game, built from parts instead of a list of combinations:
// a method (Wild, Masuda, Outbreak…) plus the bonuses that apply to it. Odds come from
// shiny rolls, P = 1 − (4095/4096)^rolls, or (8191/8192)^rolls up to Gen 5 (`rate: 8192`); roll counts
// checked against RotomLabs and PokéTools. Some methods have a fixed rate ({ odds, charm }) or a table/formula of their
// own (a function of the chosen levels) instead. A new game only needs its parts.
// A level bonus may set `def` (the level used when a setup hasn't picked one yet) and `tag` (how the
// chosen level reads in the method label; default "<label> <level>"). A `live` level bonus is a chain the
// Hunt Deck counts itself (see liveChain); it has a `name` for the Hunt Deck, may give its exact value per
// chain length (`value`, else the level's) and may end when a shiny shows up (`endsOnShiny`).
const CHARM = { id: "charm", label: "Shiny Charm", type: "toggle" };
const pctToOdds = pct => Math.round(1000 / pct) / 10;
// Chain fishing (X & Y, Omega Ruby & Alpha Sapphire; Bulbapedia, PokéTools): 2 extra rolls for every Pokémon
// already reeled in from the same spot, up to a chain of 20 (41 rolls, 1/100). A shiny ends the chain.
const FISH = { id: "fish", label: "Chain", type: "level", live: true, name: "Fishing chain", endsOnShiny: true,
  value: n => 2 * Math.min(n, 20), tag: lv => `chain ${lv}`, levels: [["0", 0], ["5", 10], ["10", 20], ["15", 30], ["20+", 40]] };
const fishOdds = lv => rollsToOdds(1 + lv("fish") + (lv("charm") ? 2 : 0));
// DexNav (Omega Ruby & Alpha Sapphire), after RotomLabs' DexNav calculator: the search level gives a
// chance p per extra roll; the next Pokémon gets 1 (3 with the charm) extra rolls, +4 on every 5th in the
// chain (a guaranteed boost; otherwise a 4% chance of one), +5 on the 50th and +10 on the 100th.
// `chain` is the chain before the encounter, as the DexNav shows it (49 → the 50th). A search level of 0 gives the normal odds.
function dexNavOdds(level, chain, charm) {
  const q = 4095 / 4096, base = 1 - Math.pow(q, charm ? 3 : 1);
  if (!level) return Math.round(1 / base);
  const s = Math.min(level, 999);
  const p = Math.ceil(0.01 * (s > 200 ? s + 600 : s > 100 ? 2 * s + 400 : 6 * s)) / 10000;
  let rolls = charm ? 3 : 1, boost = 0;
  if ((chain + 1) % 5 === 0) rolls += 4; else boost = 0.04;
  if (chain === 49) rolls += 5; else if (chain === 99) rolls += 10;
  const hit = n => 1 - Math.pow(1 - p, n);
  const h = (1 - boost) * hit(rolls) + boost * hit(rolls + 4);
  return Math.round(1 / ((1 - h) * base + h));
}
export const HUNT_SETUP = {
  // Gold & Silver (RotomLabs): 1/8192 in the wild and for eggs; a shiny parent gives 1/64 (see Crystal).
  gs: { rate: 8192, methods: [["wild", "Wild", 1, []], ["breed", "Breeding", 1, []], ["sparent", "Shiny parent", { odds: 64 }, []]], bonus: [] },
  // Crystal (RotomLabs): 1/8192 in the wild and for eggs. A shiny parent passes on its DVs: 1/64 for its
  // opposite-gender children (Gold & Silver too). The Odd Egg is shiny 1 in 10.
  crystal: { rate: 8192, methods: [["wild", "Wild", 1, []], ["breed", "Breeding", 1, []], ["sparent", "Shiny parent", { odds: 64 }, []],
    ["oddegg", "Odd Egg", { odds: 10 }, []]], bonus: [] },
  // Ruby & Sapphire (RotomLabs): 1/8192 in the wild and for eggs; no Masuda Method or Shiny Charm yet.
  rs: { rate: 8192, methods: [["wild", "Wild", 1, []], ["breed", "Breeding", 1, []]], bonus: [] },
  // FireRed & LeafGreen (RotomLabs): 1/8192 in the wild and for eggs; no Masuda Method or Shiny Charm yet.
  frlg: { rate: 8192, methods: [["wild", "Wild", 1, []], ["breed", "Breeding", 1, []]], bonus: [] },
  // Emerald (RotomLabs): 1/8192 in the wild and for eggs; no Masuda Method or Shiny Charm yet.
  emerald: { rate: 8192, methods: [["wild", "Wild", 1, []], ["breed", "Breeding", 1, []]], bonus: [] },
  // Diamond & Pearl (RotomLabs, PokéTools): 1/8192, Masuda 5 rolls (1/1639), no Shiny Charm. Poké Radar: the
  // chance a patch is shiny, ⌈65535 / (8200 − 200 × chain)⌉ / 65536, from 1/8192 at 0 to 1/200 at 40.
  dp: { rate: 8192, methods: [["wild", "Wild", 1, []], ["radar", "Poké Radar", lv => lv("rchain"), ["rchain"]],
    ["breed", "Breeding", 1, []], ["masuda", "Masuda", 5, []]],
    bonus: [{ id: "rchain", label: "Chain", type: "level", live: true, tag: lv => `chain ${lv}`,
      levels: [["0–9", 8192], ["10+", 5958], ["20+", 4096], ["30+", 2185], ["35", 1192], ["36", 993], ["37", 799], ["38", 596], ["39", 400], ["40", 200]] }] },
  // Platinum has the same odds and Poké Radar as Diamond & Pearl.
  get pt() { return this.dp; },
  // HeartGold & SoulSilver (RotomLabs): 1/8192; the Masuda Method gives 5 rolls (1/1639). No Shiny Charm.
  hgss: { rate: 8192, methods: [["wild", "Wild", 1, []], ["breed", "Breeding", 1, []], ["masuda", "Masuda", 5, []]], bonus: [] },
  // Black & White (RotomLabs): 1/8192, no Shiny Charm yet; the Masuda Method gives 6 rolls (1/1366).
  bw: { rate: 8192, methods: [["wild", "Wild", 1, []], ["breed", "Breeding", 1, []], ["masuda", "Masuda", 6, []]], bonus: [] },
  // Black 2 & White 2 (RotomLabs, Serebii): the Shiny Charm arrives, +2 rolls in the wild and for eggs
  // (1/2731), Masuda with the charm 1/1024. Hidden Grotto Pokémon can never be shiny.
  bw2: { rate: 8192, methods: [["wild", "Wild", 1, ["charm"]], ["breed", "Breeding", 1, ["charm"]], ["masuda", "Masuda", 6, ["charm"]]],
    bonus: [{ ...CHARM, rolls: 2 }] },
  // Omega Ruby & Alpha Sapphire (RotomLabs): the Shiny Charm adds 2 rolls, 1 for regular eggs. Chain
  // fishing adds 2 rolls per hook in a row, up to 20 (1/100, 1/96 with the charm). A horde is 5 Pokémon
  // with their own rolls: 1/820 per horde, 1/274 with the charm. DexNav: see dexNavOdds.
  oras: { methods: [["wild", "Wild", 1, ["charm"]], ["dexnav", "DexNav", lv => dexNavOdds(lv("search"), lv("dchain"), lv("charm")), ["search", "dchain", "charm"]],
    ["horde", "Horde", 5, ["charm:10"]], ["fish", "Chain fishing", fishOdds, ["fish", "charm"]],
    ["breed", "Breeding", 1, ["charm:1"]], ["masuda", "Masuda", 6, ["charm"]]],
    bonus: [{ ...CHARM, rolls: 2 },
      { id: "search", label: "Search level", type: "level", tag: lv => `search level ${lv}`,
        levels: [["0", 0], ["10+", 10], ["25+", 25], ["50+", 50], ["100+", 100], ["200+", 200], ["400+", 400], ["600+", 600], ["800+", 800], ["999", 999]] },
      { id: "dchain", label: "Chain", type: "level", live: true, name: "DexNav chain", value: n => n, tag: lv => `chain ${lv}`,
        levels: [["0", 0], ["10", 10], ["25", 25], ["50", 50], ["100", 100]] },
      FISH] },
  // X & Y (RotomLabs / PokéTools): the Shiny Charm adds 2 rolls, 1 for regular eggs; chain fishing and
  // hordes as in ORAS. The Friend Safari gives 5 rolls (1/820, 1/586 with the charm). Poké Radar: the
  // chance a patch is shiny, ⌈65535 / (8200 − 200 × chain)⌉ / 65536, up to 1/200 at 40; below a chain
  // of 30 that's no better than a normal encounter. The Shiny Charm isn't counted for the radar.
  xy: { methods: [["wild", "Wild", 1, ["charm"]], ["radar", "Poké Radar", lv => lv("rchain"), ["rchain"]],
    ["fish", "Chain fishing", fishOdds, ["fish", "charm"]], ["horde", "Horde", 5, ["charm:10"]], ["safari", "Friend Safari", 5, ["charm"]],
    ["breed", "Breeding", 1, ["charm:1"]], ["masuda", "Masuda", 6, ["charm"]]],
    bonus: [{ ...CHARM, rolls: 2 }, FISH,
      { id: "rchain", label: "Chain", type: "level", def: 7, live: true, name: "Radar chain", tag: lv => `chain ${lv}`,
        levels: [["0–29", 4096], ["30+", 2185], ["35", 1192], ["36", 993], ["37", 799], ["38", 596], ["39", 400], ["40", 200]] }] },
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
      { id: "chain", label: "Chain", type: "level", def: 8, live: true, name: "Radar chain", tag: lv => `chain ${lv}`,
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
const rollsToOdds = (r, rate = 4096) => Math.round(1 / (1 - Math.pow((rate - 1) / rate, r)));
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
    // Table/formula methods: every chosen level (and switched-on toggle) is part of the label, the
    // function gives the odds. A tag may return "" to leave its level out of the label.
    const lv = id => {
      const b = active.find(x => x.id === id);
      if (b.type === "toggle") return !!setup[id];
      return b.value && setup[id + "N"] != null ? b.value(setup[id + "N"]) : (b.levels[levelOf(b, setup)] || b.levels[0])[1];
    };
    for (const b of active) {
      if (b.type === "toggle") { if (setup[b.id]) parts.push(b.label); continue; }
      // A live chain reads as its real length ("chain 37"), not the level it falls in.
      const l = b.live && setup[b.id + "N"] != null ? String(setup[b.id + "N"]) : (b.levels[levelOf(b, setup)] || b.levels[0])[0];
      const tag = b.tag ? b.tag(l) : `${b.label} ${l}`;
      if (tag) parts.push(tag);
    }
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
  return { odds: rollsToOdds(rolls, conf.rate), label: parts.join(" · ") };
}
// Live chains (Poké Radar, chain fishing, DexNav): the chain length itself is kept in setup[`${id}N`] and picks the level
// (the last one it has reached, "36" from 36, "30+" from 30). Tapping a level jumps the chain to its
// start. Setups from before live chains only have the level; their chain is that level's start.
const levelStart = (b, i) => parseInt(b.levels[i][0], 10) || 0;
export function liveChain(gid, setup = {}) {
  const conf = HUNT_SETUP[gid];
  if (!conf) return null;
  const allowed = (conf.methods.find(([id]) => id === setup.m) || conf.methods[0])[3].map(x => x.split(":")[0]);
  return conf.bonus.find(b => b.live && allowed.includes(b.id)) || null;
}
export const chainOf = (b, setup) => setup[b.id + "N"] ?? levelStart(b, levelOf(b, setup));
const levelFor = (b, n) => b.levels.reduce((best, _, i) => levelStart(b, i) <= n ? i : best, 0);
// The setup for the next hunt after a shiny: a chain that a shiny ends starts over at 0.
export function afterShiny(gid, setup) {
  const b = liveChain(gid, setup);
  return b && b.endsOnShiny ? patchSetup(gid, setup, { [b.id + "N"]: 0 }) : setup;
}
export const defaultSetup = gid => ({ m: HUNT_SETUP[gid] ? HUNT_SETUP[gid].methods[0][0] : "wild" });
export function patchSetup(gid, setup, patch) {
  const next = { ...setup, ...patch };
  const live = liveChain(gid, next);
  if (live) {
    const n = live.id + "N";
    // Switching to a chain method starts a fresh chain, unless this setup already counts one.
    if ("m" in patch && patch.m !== setup.m && !(n in next)) { next[n] = 0; next[live.id] = 0; }
    if (live.id in patch) next[n] = levelStart(live, patch[live.id]);
    if (n in patch) next[live.id] = levelFor(live, next[n]);
  }
  // Legends: Arceus gives the Shiny Charm only once every species is at research level 10.
  if (gid === "pla") {
    if (patch.charm && !next.research) next.research = 1;
    if ("research" in patch && !patch.research && next.charm) next.research = 1;
  }
  return next;
}
