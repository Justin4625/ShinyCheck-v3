// Random hunt: a slot-machine reel that picks a missing shiny to hunt on a game page.
import { burst } from "../components/burst.js";
import { toast } from "../components/toast.js";
import { gHas } from "../core/collection.js";
import { state } from "../core/state.js";
import { hk, hunts, isActive } from "../core/store.js";
import { $ } from "../core/util.js";
import { dr, openDrawer } from "./hunt-deck/deck.js";
import { huntable } from "../model/availability.js";
import { mons } from "../model/dex.js";
import { inGamePool } from "../model/game-dex.js";
import { GAME_INFO, codes } from "../model/games.js";

// A slot-machine reel of candidates decelerates onto a random pick: a shiny still missing
// in this game, huntable (not locked or event-only) and not already being hunted.
const rl = { root: $("#roulette"), strip: $("#rlStrip"), pick: null, gid: "" };
const ITEM = 104; // tile width + gap, keep in sync with .rl-tile
function spin() {
  const gid = state.page, g = GAME_INFO[gid];
  const pool = mons.filter(m => m.games[gid] && inGamePool(m, gid) && !gHas(gid)(m) && huntable(m) && !isActive(hunts[hk(gid, m.id)]));
  if (!pool.length) return toast("Nothing left to hunt in this game ✦");
  const pickFrom = () => pool[Math.floor(Math.random() * pool.length)];
  rl.gid = gid;
  rl.pick = pickFrom();
  const reel = Array.from({ length: 42 }, pickFrom);
  const at = reel.length - 4;
  reel[at] = rl.pick;
  rl.root.style.setProperty("--accent", g.accent);
  rl.root.style.setProperty("--accent2", g.accent2);
  $("#rlGame").textContent = g.name;
  $("#rlName").textContent = "Spinning…";
  $("#rlMeta").textContent = "";
  rl.root.classList.remove("landed");
  rl.root.hidden = false;
  document.body.classList.add("drawer-open");
  rl.strip.style.transition = "none";
  rl.strip.style.transform = "translateX(0)";
  rl.strip.innerHTML = reel.map((m, i) => `<div class="rl-tile ${i === at ? "win" : ""}"><img src="${m.sprite}" alt=""></div>`).join("");
  const win = rl.strip.parentElement.clientWidth;
  const target = -(at * ITEM - (win / 2 - (ITEM - 8) / 2)) + (Math.random() * 40 - 20);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    rl.strip.style.transition = reduce ? "none" : "transform 3.2s cubic-bezier(.12, .75, .1, 1)";
    rl.strip.style.transform = `translateX(${target}px)`;
    if (reduce) land();
  }));
}
function land() {
  if (!rl.pick || rl.root.classList.contains("landed")) return;
  // Settle exactly on the winner after the slightly-off stop.
  const win = rl.strip.parentElement.clientWidth, at = [...rl.strip.children].findIndex(t => t.classList.contains("win"));
  rl.strip.style.transition = "transform .35s ease-out";
  rl.strip.style.transform = `translateX(${-(at * ITEM - (win / 2 - (ITEM - 8) / 2))}px)`;
  rl.root.classList.add("landed");
  const m = rl.pick;
  $("#rlName").textContent = m.name + (m.form && m.form !== "Original" ? ` (${m.form})` : "");
  $("#rlMeta").textContent = `#${m.dex} · ${GAME_INFO[rl.gid].name} ${codes(m, rl.gid).join(" / ")}`;
  setTimeout(() => burst(rl.strip.children[at]), 150);
}
function closeRoulette() {
  rl.root.hidden = true;
  rl.pick = null;
  if (!dr.root.classList.contains("open")) document.body.classList.remove("drawer-open");
}

// Wiring: runs once at startup, from main.js.
export function init() {
  rl.strip.addEventListener("transitionend", e => { if (e.propertyName === "transform" && !rl.root.classList.contains("landed")) land(); });
  $("#randomHunt").addEventListener("click", spin);
  $("#rlAgain").addEventListener("click", spin);
  $("#rlGo").addEventListener("click", () => {
    if (!rl.pick || !rl.root.classList.contains("landed")) return;
    const { pick, gid } = rl;
    closeRoulette();
    openDrawer(pick.id, gid);
  });
  rl.root.addEventListener("click", e => { if (e.target === rl.root || e.target.closest("[data-rlclose]")) closeRoulette(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !rl.root.hidden) { e.stopImmediatePropagation(); closeRoulette(); } }, true);
}
