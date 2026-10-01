// Edit profile: your name, your unique @username, your picture (a shiny you logged, your Google photo or your
// initial; the admin can also upload a photo, features/photo-upload.js) and whether your profile is public.
import { avatar } from "../components/avatar.js";
import { closeDlg, openDlg, wireDlg } from "../components/dialog.js";
import { toast } from "../components/toast.js";
import { shinies } from "../core/store.js";
import { $, esc } from "../core/util.js";
import { mons } from "../model/dex.js";
import { isAdmin } from "../services/admin.js";
import * as social from "../services/social.js";
import { isUpload, pickPhoto } from "./photo-upload.js";

const dlg = $("#pfEditDlg");
let pick = { avatar: "", photo: "" }, googlePhoto = "", uploaded = "", current = null, checkTimer = null;

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
  const upload = isAdmin()
    ? (uploaded ? opt("upload", !pick.avatar && pick.photo === uploaded, avatar({ photo: uploaded }), "Your photo") : "")
      + `<button type="button" class="pe-pick pe-upload" data-pe-upload title="Upload a photo" aria-label="Upload a photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg></button>`
    : "";
  $("#peAvatars").innerHTML = upload +
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
  uploaded = isUpload(p.photo) ? p.photo : "";
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

// Admin only: a photo of your own, shown as soon as it's picked and saved with Save.
async function upload() {
  try {
    const url = await pickPhoto();
    if (!url) return;
    uploaded = url;
    pick = { avatar: "", photo: url };
    paintPicks();
  } catch (err) {
    console.error(err);
    toast("Couldn't use that photo. Try another one.");
  }
}

// Wiring: runs once at startup, from main.js.
export function init() {
  wireDlg(dlg);
  dlg.addEventListener("click", e => {
    if (e.target.closest("[data-pe-upload]")) return upload();
    const b = e.target.closest("[data-pe-pick]");
    if (!b) return;
    const id = b.dataset.pePick;
    pick = id === "photo" ? { avatar: "", photo: googlePhoto } : id === "upload" ? { avatar: "", photo: uploaded }
      : id === "letter" ? { avatar: "", photo: "" } : { avatar: id, photo: pick.photo };
    paintPicks();
  });
  $("#peName").addEventListener("input", () => { if (!pick.avatar && !pick.photo) paintPicks(); });
  $("#peUser").addEventListener("input", checkUser);
  $("#pfEditForm").addEventListener("submit", e => { e.preventDefault(); save(); });
}
