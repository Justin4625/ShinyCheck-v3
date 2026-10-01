// Filter & sort for the card grids on the Shiny Dex (/) and game pages (/sv …): which entries to show
// (all, missing, caught, hunting), by type, without shiny locks, and in which order. Pure rules: the
// page hands in a context that answers "caught?", "hunting?" etc. for its own scope (global or one game).
export const TYPES = ["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
export const SHOWS = { all: "All", missing: "Missing", caught: "Caught", hunting: "Hunting" };
export const SORTS = { dex: "Dex number", name: "Name A–Z", recent: "Recently caught", encounters: "Most encounters" };

export const newFilter = () => ({ show: "all", types: [], sort: "dex", hideLocked: false });
// How many settings differ from the default (the badge on the Filter button).
export const activeCount = f => (f.show !== "all") + (f.types.length > 0) + (f.sort !== "dex") + f.hideLocked;

// ctx: { caught(m), hunting(m), locked(m) }
export const matches = (f, ctx) => m =>
  (f.show === "all" || (f.show === "missing" ? !ctx.caught(m) : f.show === "caught" ? ctx.caught(m) : ctx.hunting(m))) &&
  f.types.every(t => m.types.includes(t)) &&
  !(f.hideLocked && ctx.locked(m));

// ctx: { lastCaught(m) → timestamp or 0, encounters(m) → count of the running hunt }.
// `base` is the page's own order (national or regional dex); it breaks ties and is the "Dex number" order.
export function sorter(f, ctx, base) {
  if (f.sort === "name") return (x, y) => x.name.localeCompare(y.name) || base(x, y);
  if (f.sort === "recent") return (x, y) => ctx.lastCaught(y) - ctx.lastCaught(x) || base(x, y);
  if (f.sort === "encounters") return (x, y) => ctx.encounters(y) - ctx.encounters(x) || base(x, y);
  return base;
}
