// What a logged shiny can evolve into, including regional-form lines (data/evolutions.js).
import { mons, speciesOf } from "./dex.js";

// Next evolution entries for a form. PokeAPI chains are per species, so regional
// lines are resolved here: a regional form only continues into the same form or
// into its region-exclusive evolution; other forms skip those.
const REGIONAL = ["Alolan", "Galarian", "Hisuian", "Paldean", "White Stripe"];
const EXCLUSIVE = { 862: "Galarian", 863: "Galarian", 864: "Galarian", 865: "Galarian", 866: "Galarian", 867: "Galarian",
  902: "White Stripe", 903: "Hisuian", 904: "Hisuian", 980: "Paldean" };
export function evolutionsOf(m) {
  const next = (window.EVO[+m.dex] || []).flatMap(d => mons.filter(x => +x.dex === d));
  const R = REGIONAL.includes(m.form) ? m.form : "";
  if (R) return next.filter(x => x.form === R || EXCLUSIVE[+x.dex] === R);
  const ownForms = new Set(speciesOf(m).map(x => x.form));
  return next.filter(x => !EXCLUSIVE[+x.dex] && !(REGIONAL.includes(x.form) && ownForms.has(x.form)));
}
