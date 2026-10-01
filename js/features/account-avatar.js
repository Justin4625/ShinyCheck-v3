// The account in the sidebar's foot shows your profile picture (an uploaded photo, a shiny, your Google photo
// or your initial) once the profile has loaded, and again after Edit profile. services/cloud.js draws the
// account itself from the sign-in alone, so the picture is swapped in here.
import { avatar } from "../components/avatar.js";
import { $ } from "../core/util.js";
import * as social from "../services/social.js";

let mine = null;

// Only #account's own children are watched, so swapping the picture inside it doesn't call this again.
function show() {
  const slot = $("#account .acc-avatar");
  if (slot && mine && mine.uid === social.myUid()) slot.outerHTML = avatar(mine, "acc-avatar");
}

// Wiring: runs once at startup, from main.js.
export function init() {
  const remember = e => { if (e.detail && e.detail.uid === social.myUid()) { mine = e.detail; show(); } };
  addEventListener("social:me", remember);
  addEventListener("social:profile", remember);
  // Signing in again redraws the account: put the picture back.
  new MutationObserver(show).observe($("#account"), { childList: true });
}
