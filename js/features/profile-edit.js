// Edit profile: your name, your unique @username, your picture (a shiny you logged, your Google photo or your
// initial) and whether your profile is public.
import { avatar } from "../components/avatar.js";
import { closeDlg, openDlg, wireDlg } from "../components/dialog.js";
import { toast } from "../components/toast.js";
import { shinies } from "../core/store.js";
import { $, esc } from "../core/util.js";
import { mons } from "../model/dex.js";
import * as social from "../services/social.js";

const dlg = $("#pfEditDlg");
let pick = { avatar: "", photo: "" }, googlePhoto = "", current = null, checkTimer = null;

// Checks the username as you type: its format first, then (after a pause) whether it's free.
function checkUser() {
  const name = social.cleanUsername($("#peUser").value);
  if (name !== $("#peUser").value) $("#peUser").value = name;
  $("#peUserLink").textContent = name || "…";
  const hint = $("#peUserHint");
  hint.dataset.state = "";
  clearTimeout(checkTimer);
  if (!social.USERNAME.test(name)) { if (name) { hint.dataset.state = "bad"; } return; }
  if (name === current.username) return;
  checkTimer = setTimeout(async () => {
    const free = await social.usernameFree(name).catch(() => true);
    if ($("#peUser").value === name) hint.dataset.state = free ? "ok" : "taken";
  }, 400);
}

// Your logged Pokémon (each form once), newest catch first.
function myMons() {
  const seen = new Map();
  for (const [k, list] of Object.entries(shinies)) {
    const m = mons.find(x => x.id === +k.slice(k.indexOf(":") + 1));
    if (m && m.sprite) seen.set(m.key, Math.max(seen.get(m.key) || 0, ...list.map(s => s.ts || 0)));
  }
  return [...seen].sort((a, b) => b[1] - a[1]).map(([key]) => mons.find(m => m.key === key));
}

function paintPicks() {
  const opt = (id, on, inner, label) => `<button type="button" class="pe-pick ${on ? "on" : ""}" data-pe-pick="${esc(id)}" aria-pressed="${!!on}" title="${esc(label)}">${inner}</button>`;
  const own = myMons();
  $("#peAvatars").innerHTML =
    (googlePhoto ? opt("photo", !pick.avatar && pick.photo, avatar({ photo: googlePhoto }), "Google photo") : "")
    + opt("letter", !pick.avatar && !pick.photo, avatar({ name: $("#peName").value || "?" }), "Initial")
    + own.map(m => opt(m.key, pick.avatar === m.key, avatar({ avatar: m.key }), m.name)).join("");
  $("#peAvatarsNote").hidden = own.length > 0;
}

export async function openProfileEdit() {
  const p = await social.myProfile();
  const user = window.Cloud.fb.auth.currentUser;
  googlePhoto = /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//.test(user.photoURL || "") ? user.photoURL.slice(0, 500) : "";
  current = p;
  pick = { avatar: p.avatar, photo: p.photo };
  $("#peName").value = p.name;
  $("#peUser").value = p.username || "";
  checkUser();
  $("#pePublic").checked = p.public;
  $("#peError").textContent = "";
  paintPicks();
  openDlg(dlg);
}

async function save() {
  const name = $("#peName").value.trim().replace(/\s+/g, " ");
  if (!name) { $("#peError").textContent = "Pick a name first."; return $("#peName").focus(); }
  const username = $("#peUser").value;
  if (!social.USERNAME.test(username)) { $("#peError").textContent = "Usernames are 3–20 characters: letters, numbers, _ and ."; return $("#peUser").focus(); }
  const btn = $("#peSave");
  btn.disabled = true;
  try {
    if (username !== current.username) {
      if (!(await social.usernameFree(username))) throw Object.assign(new Error("taken"), { code: "taken" });
      await social.setUsername(username);
    }
    await social.saveProfile({ name: name.slice(0, 30), avatar: pick.avatar, photo: pick.photo, public: $("#pePublic").checked });
    closeDlg(dlg);
    toast("Profile saved ✦");
  } catch (err) {
    if (err.code !== "taken") console.error(err);
    $("#peError").textContent = err.code === "taken" ? `@${username} is taken. Try another one.` : "Couldn't save. Check your connection and try again.";
  }
  btn.disabled = false;
}

// Wiring: runs once at startup, from main.js.
export function init() {
  wireDlg(dlg);
  dlg.addEventListener("click", e => {
    const b = e.target.closest("[data-pe-pick]");
    if (!b) return;
    const id = b.dataset.pePick;
    pick = id === "photo" ? { avatar: "", photo: googlePhoto } : id === "letter" ? { avatar: "", photo: "" } : { avatar: id, photo: pick.photo };
    paintPicks();
  });
  $("#peName").addEventListener("input", () => { if (!pick.avatar && !pick.photo) paintPicks(); });
  $("#peUser").addEventListener("input", checkUser);
  $("#pfEditForm").addEventListener("submit", e => { e.preventDefault(); save(); });
}
