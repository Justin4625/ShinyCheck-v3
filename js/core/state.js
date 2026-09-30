// UI state (which page, tab and filters are active) and the page's main elements.
import { $ } from "./util.js";

export const el = {
  home: $("#homeView"), game: $("#gameView"), cards: $("#cards"), gameCards: $("#gameCards"),
  huntsView: $("#huntsView"), huntCards: $("#huntCards"), statsView: $("#statsView"), updatesView: $("#updatesView"),
  feedView: $("#feedView"), profileView: $("#profileView"),
  regions: $("#regions"), dexTabs: $("#dexTabs"), sideGames: $("#sideGames"), upNext: $("#upNext"),
  q: $("#q"), gq: $("#gq"), toast: $("#toast"),
};
// page: "" = Living Dex, otherwise a game id. tab = regional dex on a game page.
// huntsView: the Active hunts page (/hunts), statsView: Stats (/stats), updatesView: What's new
// (/updates), feedView: the community feed (/feed), profileId: a trainer profile (/trainer/<uid>,
// "me" for /trainer); page stays "" there. pendingHunt: Pokémon to open in the Hunt Deck after navigating.
export const state = { pendingHunt: null, huntsView: false, statsView: false, updatesView: false, feedView: false, profileId: "", page: "", gen: 0, tab: "", missing: false, forms: true, gMissing: false, gOutside: false };
