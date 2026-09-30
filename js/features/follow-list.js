// Followers / Following of a trainer, opened from the numbers on their profile.
import { avatar, trainerHref } from "../components/avatar.js";
import { closeDlg, openDlg, wireDlg } from "../components/dialog.js";
import { toast } from "../components/toast.js";
import { nf } from "../core/format.js";
import { $, esc } from "../core/util.js";
import * as social from "../services/social.js";

const dlg = $("#followDlg");
let token = 0;

// One trainer in a list: picture, name and shinies, and a Follow button (not for yourself).
export function trainerRow(p, following, extra = "") {
  const me = p.uid === social.myUid();
  return `<div class="fl-row" data-trainer="${esc(p.uid)}">
      <a class="fl-who" href="${esc(trainerHref(p.uid, p))}">${avatar(p)}<span><b>${esc(p.name)}</b><small>${p.username ? `@${esc(p.username)} · ` : ""}${extra || `${nf(p.public ? p.shinies : 0)} shinies`}</small></span></a>
      ${me ? "" : `<button class="fl-follow ${following ? "on" : ""}" data-fl-follow aria-pressed="${following}">${following ? "Following" : "Follow"}</button>`}
    </div>`;
}

export async function openFollowList(uid, which, name) {
  const t = ++token;
  $("#followEyebrow").textContent = name;
  $("#followTitle").textContent = which === "followers" ? "Followers" : "Following";
  $("#followList").innerHTML = `<p class="fl-empty">Loading…</p>`;
  openDlg(dlg);
  try {
    const uids = await (which === "followers" ? social.followersOf(uid) : social.followingOf(uid));
    const [who, mine] = await Promise.all([social.profilesOf(uids), social.myFollowing()]);
    if (t !== token) return;
    const rows = uids.map(u => who.get(u)).filter(Boolean).map(p => trainerRow(p, mine.includes(p.uid))).join("");
    $("#followList").innerHTML = rows || `<p class="fl-empty">${which === "followers" ? "No followers yet." : "Not following anyone yet."}</p>`;
  } catch (err) {
    console.error(err);
    $("#followList").innerHTML = `<p class="fl-empty">Couldn't load this list. Check your connection.</p>`;
  }
}

// Follow buttons in any trainer list (this dialog and the notifications).
export function wireFollowButtons(root, onDone = () => {}) {
  root.addEventListener("click", async e => {
    const b = e.target.closest("[data-fl-follow]");
    if (!b) return;
    const uid = b.closest("[data-trainer]").dataset.trainer, on = !b.classList.contains("on");
    b.disabled = true;
    try {
      await social.setFollow(uid, on);
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on);
      b.textContent = on ? "Following" : "Follow";
      onDone();
    } catch (err) {
      console.error(err);
      toast("Couldn't save that. Check your connection.");
    }
    b.disabled = false;
  });
}

// Wiring: runs once at startup, from main.js.
export function init() {
  wireDlg(dlg);
  wireFollowButtons(dlg);
  // Opening a trainer closes the list (the router handles the link itself).
  dlg.addEventListener("click", e => { if (e.target.closest(".fl-who")) closeDlg(dlg); });
}
