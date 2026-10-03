// The Pokédex (data/pokedex.js) as entries plus generations, with the Legends: Z-A Mega Dimension dex added.
// Split data into Pokémon entries and generation names.
export const genNames = { 1: "Gen 1 (Kanto)" };
export const mons = [];
for (const e of window.DEX) {
  if (e.header) genNames[e.gen] = e.header;
  else mons.push(e);
}
// Legends: Z-A Mega Dimension DLC (Hyperspace) dex, shown as M001… — species and order
// checked against Serebii's Hyperspace Pokédex.
const LZA_MD = [56,57,979,52,53,863,83,865,104,105,137,233,474,951,952,957,958,959,967,969,970,479,971,972,769,770,352,973,615,977,978,996,997,998,999,1000,211,904,252,253,254,255,256,257,258,259,260,349,350,433,358,876,509,510,517,518,538,539,562,563,867,767,768,827,828,852,853,778,900,877,622,623,821,822,823,174,39,40,926,927,396,397,398,325,326,931,739,740,932,933,934,316,317,41,42,169,935,936,937,942,943,848,849,944,945,335,336,439,122,866,590,591,485,721,638,639,640,647,648,649,720,802,808,809,491,380,381,382,383,384,801,807];
const MD_FORMS = { 52: ["Alolan", "Galarian"], 53: ["Alolan"], 83: ["Galarian"], 105: ["Alolan"], 122: ["Galarian"], 211: ["Hisuian"], 562: ["Galarian"] };
for (const m of mons) {
  const i = LZA_MD.indexOf(+m.dex);
  if (i < 0 || !(["", "Original", "Basic"].includes(m.form) || (MD_FORMS[+m.dex] || []).includes(m.form))) continue;
  const code = "M" + String(i + 1).padStart(3, "0");
  if (m.games.lza) m.extra = { lza: code }; else m.games.lza = code;
}

export const region = g => (genNames[g].match(/\((.*)\)/) || [, genNames[g]])[1];
// Shiny Dex regions, in order. Each generation is one region, except that the species Legends: Arceus
// introduced (#899–905, Wyrdeer to Enamorus) are Gen 8 but from Hisui, so they get a region of their own
// after Galar. Regional forms (Hisuian Growlithe…) stay with their species, like Alolan and Galarian forms.
export const REGIONS = Object.keys(genNames).flatMap(g => [{ key: g, gen: +g, name: region(g) },
  ...(g === "8" ? [{ key: "8h", gen: 8, name: "Hisui" }] : [])]);
export const regionOf = m => m.gen === 8 && +m.dex >= 899 && +m.dex <= 905 ? "8h" : String(m.gen);
export const regionName = m => REGIONS.find(r => r.key === regionOf(m)).name;
export const speciesOf = m => mons.filter(x => x.dex === m.dex);
