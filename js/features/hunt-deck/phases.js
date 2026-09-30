// Phases: log a different shiny mid-hunt and keep going.
import { toast } from "../../components/toast.js";
import { nf } from "../../core/format.js";
import { elapsed, hk, hunts, isActive, saveShinies, shinies } from "../../core/store.js";
import { $, esc, norm } from "../../core/util.js";
import { cur, curGame, curKey, hunt, setHunt } from "./deck.js";
import { markPost } from "../social-sync.js";
import { mons } from "../../model/dex.js";
import { isExtraForm } from "../../model/game-dex.js";
import { GAME_INFO, codeIn, gameNum } from "../../model/games.js";
import { evalSetup } from "../../model/hunt-setup.js";
import { renderGameStats } from "../../pages/game.js";

export function paintPhases(h) {
  const list = h.phases || [];
  $("#drPhaseCount").textContent = list.length ? `Phase ${list.length + 1}` : "";
  $("#drPhases").innerHTML = list.map((p, i) => {
    const m = mons.find(x => x.id === p.id);
    return `<li>${m && m.sprite ? `<img src="${m.sprite}" alt="">` : ""}<span><b>Phase ${i + 1}</b> ${esc(m ? m.name : "?")}${m && m.form && m.form !== "Original" ? ` (${esc(m.form)})` : ""}</span><small>${nf(p.count)} enc.</small></li>`;
  }).join("");
  $("#drPhase").hidden = !isActive(hunts[curKey()]);
}
// The picker follows the hunt's game: its regional dexes in order (e.g. Paldea, then
// Kitakami, then Blueberry), with their numbers, and the page's Extra setting.
function gameDexOrder(gid) {
  const list = [];
  GAME_INFO[gid].sections.forEach(([p], si) => {
    for (const m of mons) {
      const c = codeIn(m, gid, p);
      if (c) list.push({ m, code: p === "O" || isExtraForm(m, gid) ? "Outside dex" : c, key: (isExtraForm(m, gid) ? 90000 : si * 10000) + gameNum(c) });
    }
  });
  const seen = new Set();
  return list.sort((x, y) => x.key - y.key || x.m.id - y.m.id).filter(x => !seen.has(x.m.id) && seen.add(x.m.id));
}
function renderPhaseList() {
  const q = norm($("#drPhaseQ").value.trim());
  const pool = gameDexOrder(curGame).filter(({ m, code }) => m.id !== cur.id
    && (!q || norm(m.name).includes(q) || norm(m.form).includes(q) || norm(code).includes(q) || m.dex.includes(q)));
  $("#drPhaseList").innerHTML = pool.slice(0, 60).map(({ m, code }) => `<button data-phase="${m.id}">${m.sprite ? `<img src="${m.sprite}" alt="">` : ""}<span><small>${esc(code)}</small>${esc(m.name)}${m.form && m.form !== "Original" ? ` <em>${esc(m.form)}</em>` : ""}</span></button>`).join("")
    || `<p class="dr-phase-none">No Pokémon in ${esc(GAME_INFO[curGame].name)} match</p>`;
}
function logPhase(id) {
  const h = hunt(), m = mons.find(x => x.id === id);
  const phases = h.phases || [], last = phases.at(-1) || { at: 0, time: 0 };
  const count = Math.max(0, h.count - last.at), time = Math.max(0, elapsed(h) - last.time);
  const method = h.setup ? evalSetup(curGame, h.setup).label : "";
  const k = hk(curGame, m.id);
  (shinies[k] = shinies[k] || []).push(markPost({ count, time, odds: h.odds, method: `${method ? method + " · " : ""}Phase ${phases.length + 1}`, ts: Date.now() }));
  saveShinies();
  setHunt({ phases: [...phases, { id: m.id, at: h.count, time: elapsed(h), count }] });
  $("#drPhasePick").hidden = true;
  $("#drPhaseQ").value = "";
  renderGameStats();
  toast(`Phase ${phases.length + 1}: shiny ${m.name} logged ✦ — keep going!`);
}

// Wiring: runs once at startup, from main.js.
export function init() {
  $("#drPhase").addEventListener("click", () => {
    const pick = $("#drPhasePick");
    pick.hidden = !pick.hidden;
    if (!pick.hidden) { renderPhaseList(); $("#drPhaseQ").focus(); }
  });
  $("#drPhaseQ").addEventListener("input", renderPhaseList);
  $("#drPhaseList").addEventListener("click", e => {
    const b = e.target.closest("[data-phase]");
    if (b) logPhase(+b.dataset.phase);
  });
}
