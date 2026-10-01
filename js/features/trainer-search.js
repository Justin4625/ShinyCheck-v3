// Find trainers: a dialog to look up profiles by @username or name, opened from the sidebar
// (Community) and the feed. Results are trainer rows with a Follow button, like the follower lists.
import { closeDlg, openDlg, wireDlg } from "../components/dialog.js";
import { toast } from "../components/toast.js";
import { $ } from "../core/util.js";
import { trainerRow, wireFollowButtons } from "./follow-list.js";
import * as social from "../services/social.js";

const dlg = $("#findDlg"), input = $("#findQ"), out = $("#findList");
let token = 0, timer = null;

const hint = text => `<p class="fl-empty">${text}</p>`;

async function search() {
  const t = ++token, text = input.value.trim().replace(/^@/, "");
  if (text.length < 2) { out.innerHTML = hint("Type at least 2 letters of a name or @username."); return; }
  out.innerHTML = hint("Searching…");
  try {
    const [found, mine] = await Promise.all([social.searchTrainers(text), social.myFollowing()]);
    if (t !== token) return;
    out.innerHTML = found.length ? found.map(p => trainerRow(p, mine.includes(p.uid))).join("") : hint("No trainers found.");
  } catch (err) {
    console.error(err);
    if (t === token) out.innerHTML = hint("Couldn't search. Check your connection.");
  }
}

export function openTrainerSearch() {
  document.body.classList.remove("menu-open");
  if (social.localOnly()) return toast("Finding trainers needs an account.");
  input.value = "";
  out.innerHTML = hint("Type at least 2 letters of a name or @username.");
  openDlg(dlg);
  // Phones only open the keyboard for a focus right after the tap.
  input.focus();
}

// Wiring: runs once at startup, from main.js.
export function init() {
  wireDlg(dlg);
  wireFollowButtons(dlg);
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(search, 300); });
  // Opening a trainer closes the dialog (the router handles the link itself).
  dlg.addEventListener("click", e => { if (e.target.closest(".fl-who")) closeDlg(dlg); });
  document.addEventListener("click", e => { if (e.target.closest("[data-find-trainers]")) openTrainerSearch(); });
}
