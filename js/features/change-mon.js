// Change Pokémon: a logged shiny that was put on the wrong Pokémon moves to another one in the same game
// (opened from a Dex Entry log entry). Only Pokémon that game can hold are offered; GO and HOME take any.
import { closeDlg, openDlg, wireDlg } from "../components/dialog.js";
import { matchText } from "../core/collection.js";
import { $, esc } from "../core/util.js";
import { mons, speciesOf } from "../model/dex.js";
import { GAME_INFO } from "../model/games.js";
import { canHold } from "../model/transfers.js";

const dlg = $("#changeDlg"), input = $("#changeQ"), out = $("#changeList");
const MAX = 60;
let from = null, gid = "", onPick = null;

const hint = text => `<p class="fl-empty">${text}</p>`;
const allowed = m => m.id !== from.id && (GAME_INFO[gid].logOnly || canHold(m, gid));
const row = m => `<button class="cm-row" data-change-to="${m.id}">
    <span class="cm-img">${m.sprite ? `<img src="${m.sprite}" alt="" loading="lazy">` : ""}</span>
    <span class="cm-name"><b>${esc(m.name)}</b>${m.form && m.form !== "Original" ? `<small>${esc(m.form)}</small>` : ""}</span>
    <span class="cm-dex">#${m.dex}</span></button>`;

function paint() {
  const q = input.value.trim();
  if (!q) {
    // Before typing: the other forms of the same species (a regional form mixed up is the usual slip).
    const forms = speciesOf(from).filter(allowed);
    out.innerHTML = hint("Type a name or dex number.") + forms.map(row).join("");
    return;
  }
  const found = mons.filter(m => m.name && allowed(m) && matchText(m, input));
  out.innerHTML = found.length
    ? found.slice(0, MAX).map(row).join("") + (found.length > MAX ? hint(`${found.length - MAX} more — type more of the name.`) : "")
    : hint(`No Pokémon found that ${esc(GAME_INFO[gid].name)} can hold.`);
}

// `mon`: the Pokémon the shiny is logged on now; `game`: its game; `pick(to)` moves it.
export function openChangeMon(mon, game, pick) {
  from = mon;
  gid = game;
  onPick = pick;
  $("#changeFrom").textContent = `${mon.name}${mon.form && mon.form !== "Original" ? ` (${mon.form})` : ""} · ${GAME_INFO[game].name}`;
  input.value = "";
  paint();
  openDlg(dlg);
  out.scrollTop = 0;
  // Phones only open the keyboard for a focus right after the tap.
  input.focus();
}

// Wiring: runs once at startup, from main.js.
export function init() {
  wireDlg(dlg);
  input.addEventListener("input", paint);
  out.addEventListener("click", e => {
    const b = e.target.closest("[data-change-to]");
    if (!b) return;
    const to = mons.find(m => m.id === +b.dataset.changeTo);
    closeDlg(dlg);
    onPick(to);
  });
}
