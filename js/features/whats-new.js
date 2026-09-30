// What's new popup: the newest update (data/updates.js), shown once per account and device.
import { renderSidebar } from "../components/sidebar.js";
import { prefs, savePrefs } from "../core/store.js";
import { $, esc, safe } from "../core/util.js";
import { openEntry } from "./dex-entry.js";
import { hasLocalData } from "./sync.js";
import { mons } from "../model/dex.js";
import { navigate } from "../pages/router.js";

// "Seen" is kept per account (prefs, synced) and per device (localStorage), so the popup
// shows once. People new to ShinyCheck don't get it: every update is news to them anyway.
export const UPDATES = window.UPDATES || [];
const SEEN = "shinycheck-v3-seen-update";
export const seenUpdate = () => !UPDATES.length || prefs.seenUpdate === UPDATES[0].id || safe(() => localStorage.getItem(SEEN)) === UPDATES[0].id;
export function markSeen() {
  if (!UPDATES.length || seenUpdate()) return;
  safe(() => localStorage.setItem(SEEN, UPDATES[0].id));
  // Only in the account once it's loaded (whatsNew runs after that), so this never races the cloud.
  if (wnReady) { prefs.seenUpdate = UPDATES[0].id; savePrefs(); }
  renderSidebar();
}
export const rich = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
export const fmtDay = d => new Date(d + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
export const wnSteps = u => u.steps && u.steps.length ? `<ol class="wn-steps">${u.steps.map(t => `<li>${rich(t)}</li>`).join("")}</ol>` : "";
export const wnShot = (u, lazy = true) => u.shot ? `<figure class="wn-shot"><img src="${u.shot}" alt="${esc(u.title)} on a phone" ${lazy ? 'loading="lazy"' : ""} decoding="async"></figure>` : "";
export const wnAction = (u, cls) => u.action ? `<button class="${cls}" data-wn-go="${esc(u.action.go)}">${esc(u.action.label)} →</button>` : "";

const wnDlg = $("#wnDlg");
let wnReady = false;
function openWhatsNew(u = UPDATES[0]) {
  $("#wnBody").innerHTML = `${wnShot(u, false)}
      <p class="eyebrow"><svg class="eyebrow-spark"><use href="#spark" fill="url(#holo)"/></svg> New in ShinyCheck</p>
      <h3 class="wn-title" id="wnTitle">${esc(u.title)}</h3>
      <p class="wn-desc">${rich(u.text)}</p>
      ${wnSteps(u)}
      <div class="rl-actions">
        <button class="rl-again" data-wnclose>Got it</button>
        ${u.action ? `<button class="rl-go wn-dlg-go" data-wn-go="${esc(u.action.go)}">${esc(u.action.label)}</button>` : ""}
      </div>
      <a class="wn-all" href="updates" data-wnclose>See all updates</a>`;
  wnDlg.hidden = false;
  document.body.classList.add("drawer-open");
  setTimeout(() => wnDlg.querySelector(".rl-again").focus({ preventScroll: true }), 50);
}
const closeWhatsNew = () => { if (wnDlg.hidden) return; wnDlg.hidden = true; document.body.classList.remove("drawer-open"); };
// Called once the account's data is in (services/cloud.js), or right away without an account.
export function whatsNew() {
  wnReady = true;
  if (seenUpdate()) return renderSidebar();
  if (!hasLocalData()) return markSeen();
  // Not on top of an open Hunt Deck, Dex Entry or another dialog: try again a bit later.
  if (document.body.classList.contains("drawer-open") || document.body.classList.contains("gated")) return setTimeout(whatsNew, 4000);
  openWhatsNew();
  markSeen();
}
function wnGo(go) {
  closeWhatsNew();
  if (go.startsWith("entry:")) {
    const m = mons.find(x => x.key === go.slice(6));
    if (!m) return;
    navigate("");
    return setTimeout(() => openEntry(m.id), 60);
  }
  navigate(go);
}

// Wiring: runs once at startup, from main.js.
export function init() {
  document.addEventListener("click", e => {
    const go = e.target.closest("[data-wn-go]");
    if (go) return wnGo(go.dataset.wnGo);
    if (e.target === wnDlg || (e.target.closest("[data-wnclose]") && e.target.closest("#wnDlg"))) {
      if (!e.target.closest(".wn-all")) e.preventDefault();
      closeWhatsNew();
    }
  });
  addEventListener("keydown", e => { if (e.key === "Escape" && !wnDlg.hidden) { e.stopImmediatePropagation(); closeWhatsNew(); } }, true);
}
