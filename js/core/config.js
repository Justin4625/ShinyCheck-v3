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
// ShinyCheck's owner (components/owner-socials.js): their profile gets an Owner badge and these links,
// which also fill the footer under every page and the landing page.
export const OWNER_UID = ADMIN_UID;
export const OWNER_SOCIALS = [
  { net: "instagram", label: "Instagram", handle: "justin.chg_", url: "https://www.instagram.com/justin.chg_/" },
  { net: "instagram", label: "Instagram", handle: "justin4625_", url: "https://www.instagram.com/justin4625_/" },
  { net: "x", label: "X (Twitter)", handle: "Justin4625_", url: "https://x.com/Justin4625_" },
  { net: "tiktok", label: "TikTok", handle: "justin4625", url: "https://www.tiktok.com/@justin4625" },
  { net: "tiktok", label: "TikTok", handle: "justin46252", url: "https://www.tiktok.com/@justin46252" },
];
// "Buy me a lunch" (js/features/support.js): the Ko-fi page (ko-fi.com/…) and the price of one "sandwich"
// as set there. Empty URL = no "Buy me a lunch" anywhere.
export const SUPPORT_URL = "https://ko-fi.com/shinycheck", SUPPORT_PRICE = "€3";
