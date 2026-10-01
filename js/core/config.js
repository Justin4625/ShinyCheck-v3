// App-wide constants: where the app lives, storage keys and the list of games.
// Where the app lives: "/" on shinycheck.nl, "/ShinyCheck-v3/" on github.io.
export const BASE = new URL("../../", import.meta.url).pathname;
export const STORE = "livingdex-za-v1";
export const THEME = "livingdex-theme";
export const GAMES = ["gs", "crystal", "rs", "frlg", "emerald", "dp", "pt", "hgss", "bw", "bw2", "xy", "oras", "sm", "usum", "lgpe", "swsh", "bdsp", "pla", "sv", "lza"];
// Places a shiny can be logged. GO and HOME have no regional dex or hunt page, only
// logs, and no odds (HOME shinies are gifts; GO odds aren't tracked).
export const LOG_GAMES = [...GAMES, "pogo", "home"];
// Games with a dex to browse but no shinies (Gen 1): a page and a menu entry, never hunts, logs or totals.
export const DEX_ONLY = ["rby"];
// The one account that sees the admin dashboard (/admin). Firestore's rules check the same uid
// (isAdmin() in firestore.rules), so hiding the page is only cosmetic: the data stays locked.
export const ADMIN_UID = "uKIRqdQ6OIfzQST0yUdGplTiWc73";
