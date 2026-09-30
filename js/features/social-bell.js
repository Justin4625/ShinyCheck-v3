// Notifications inside ShinyCheck: the bell shows how many trainers started following you
// since you last looked, and opens the list (with Follow back). While the app is open, a new
// follower also shows up as a toast.
import { closeDlg, openDlg, wireDlg } from "../components/dialog.js";
import { toast } from "../components/toast.js";
import { fmtAgo } from "../core/format.js";
import { prefs, savePrefs } from "../core/store.js";
import { $ } from "../core/util.js";
import { trainerRow, wireFollowButtons } from "./follow-list.js";
import { navigate } from "../pages/router.js";
import * as social from "../services/social.js";

const dlg = $("#bellDlg");
const bells = () => document.querySelectorAll("[data-bell]");
let followers = [], unsub = null, first = true;

const unseen = () => followers.filter(f => f.at > (prefs.followSeen || 0)).length;
function paintBells() {
  const n = unseen();
  bells().forEach(b => {
    b.hidden = !social.available();
    b.classList.toggle("has-new", n > 0);
    b.querySelector(".bell-n").textContent = n > 9 ? "9+" : n || "";
    b.setAttribute("aria-label", n ? `Notifications, ${n} new` : "Notifications");
  });
}

async function openBell() {
  const seen = prefs.followSeen || 0;
  openDlg(dlg);
  const list = followers.slice(0, 50);
  $("#bellList").innerHTML = list.length ? `<p class="fl-empty">Loading…</p>` : `<p class="fl-empty">No notifications yet. When someone follows you, it shows up here.</p>`;
  prefs.followSeen = Date.now();
  savePrefs();
  paintBells();
  if (!list.length) return;
  try {
    const [who, mine] = await Promise.all([social.profilesOf(list.map(f => f.uid)), social.myFollowing()]);
    $("#bellList").innerHTML = list.map(f => {
      const p = who.get(f.uid);
      return p ? `<div class="bell-item ${f.at > seen ? "new" : ""}">${trainerRow(p, mine.includes(p.uid), `started following you · ${fmtAgo(f.at)}`)}</div>` : "";
    }).join("");
  } catch (err) {
    console.error(err);
    $("#bellList").innerHTML = `<p class="fl-empty">Couldn't load your notifications. Check your connection.</p>`;
  }
}

function watch() {
  unsub && unsub();
  first = true;
  unsub = social.watchFollowers(async list => {
    const known = new Set(followers.map(f => f.uid));
    const fresh = first ? [] : list.filter(f => !known.has(f.uid) && f.at > (prefs.followSeen || 0));
    followers = list;
    first = false;
    paintBells();
    for (const f of fresh.slice(0, 3)) {
      const p = await social.profile(f.uid).catch(() => null);
      if (p) toast(`${p.name} started following you ✦`, { label: "View", run: () => navigate(p.username ? `@${p.username}` : `trainer/${f.uid}`) }, 6000);
    }
  });
}

// Wiring: runs once at startup, from main.js.
export function init() {
  wireDlg(dlg);
  wireFollowButtons(dlg);
  dlg.addEventListener("click", e => { if (e.target.closest(".fl-who")) closeDlg(dlg); });
  bells().forEach(b => b.addEventListener("click", openBell));
  addEventListener("cloud:ready", watch);
  addEventListener("cloud:user", e => {
    if (!e.detail) { unsub && unsub(); unsub = null; followers = []; }
    paintBells();
  });
  paintBells();
}
