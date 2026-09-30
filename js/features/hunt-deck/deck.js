// Hunt Deck: the drawer to count encounters, time a hunt and log the shiny (Gotcha!).
import { burst } from "../../components/burst.js";
import { card } from "../../components/card.js";
import { formPicker } from "../../components/form-picker.js";
import { setupHtml, setupPatch } from "../../components/hunt-setup.js";
import { sparkSvg } from "../../components/icons.js";
import { renderSidebar } from "../../components/sidebar.js";
import { statusNote } from "../../components/status.js";
import { toast } from "../../components/toast.js";
import { arm, disarm } from "../../components/two-step.js";
import { fmtDate, fmtShort, fmtTime, nf } from "../../core/format.js";
import { el, state } from "../../core/state.js";
import { elapsed, hk, hunts, isActive, prefs, saveHunts, savePrefs, saveShinies, shinies } from "../../core/store.js";
import { $, esc } from "../../core/util.js";
import { paintPace } from "./pace.js";
import { breakChain, chainStep, paintChain } from "./chain.js";
import { paintPhases } from "./phases.js";
import { paintPip, pip } from "./pop-out.js";
import { openShare } from "../share-card.js";
import { mons } from "../../model/dex.js";
import { altOf, altSprite, altsOf } from "../../model/forms.js";
import { codeLabel, whereIn } from "../../model/game-dex.js";
import { GAME_INFO } from "../../model/games.js";
import { afterShiny, defaultSetup, evalSetup, patchSetup } from "../../model/hunt-setup.js";
import { renderGameStats } from "../../pages/game.js";
import { renderHunts } from "../../pages/hunts.js";
import { render } from "../../pages/router.js";

export const dr = {
  root: $("#drawer"), panel: $(".drawer-panel"), img: $("#drImg"), count: $("#drCount"), time: $("#drTime"),
  play: $("#drPlay"), luckBar: $("#drLuckBar"), luckText: $("#drLuckText"),
  log: $("#drLog"), gotcha: $("#drGotcha"), float: $("#drFloat"), stage: $("#drStage"), celebrate: $("#drCelebrate"),
};
// cur/curGame: the Pokémon being hunted. It outlives the drawer while the pop-out is open.
export let cur = null, curGame = "", lastFocus = null;
export const curKey = () => hk(curGame, cur.id);
function paintSetup(h) {
  $("#drSetup").innerHTML = setupHtml(curGame, h.setup || defaultSetup(curGame));
  $("#drOddsShow").textContent = `1/${nf(h.odds)}`;
}
function changeSetup(patch) {
  const setup = patchSetup(curGame, hunt().setup || defaultSetup(curGame), patch);
  const { odds } = evalSetup(curGame, setup);
  setHunt({ setup, odds });
}

// Form picked in the Hunt Deck before the hunt has started (a hunt only exists once it runs).
const altPick = {};
export const huntAlt = () => (hunts[curKey()] || {}).alt || altPick[curKey()] || "";
function paintAlt() {
  const box = $("#drAlt"), alts = altsOf(cur);
  box.hidden = !alts.length;
  if (alts.length) $("#drAltBox").innerHTML = formPicker(cur, huntAlt(), "Form you're hunting");
  dr.img.src = altSprite(cur, huntAlt()) || "";
}
// A new hunt starts from the game's default method (1/8192 up to Gen 5), or the game's last setup.
const gamePrefs = () => ({ inc: 1, setup: defaultSetup(curGame), odds: evalSetup(curGame, defaultSetup(curGame)).odds, ...prefs[curGame] });
export const hunt = () => {
  const h = hunts[curKey()] || { count: 0, time: 0, since: null, ...gamePrefs() };
  // Hunts and prefs from before hunt setups existed get the default setup.
  return h.setup ? h : { ...h, setup: defaultSetup(curGame), odds: evalSetup(curGame, defaultSetup(curGame)).odds };
};
export function setHunt(patch) {
  const h = { ...hunt(), ...patch, updated: Date.now() };
  if (!h.alt && altPick[curKey()]) h.alt = altPick[curKey()];
  if ("odds" in patch || "inc" in patch || "setup" in patch) {
    prefs[curGame] = { inc: h.inc, odds: h.odds, setup: h.setup || null };
    savePrefs();
  }
  if (!isActive(h)) delete hunts[curKey()]; else hunts[curKey()] = h;
  saveHunts();
  paintHunt();
  refreshCard();
}

export function openDrawer(id, gid = state.page) {
  cur = mons.find(m => m.id === id);
  curGame = gid;
  const g = GAME_INFO[curGame];
  $("#drPhasePick").hidden = true;
  $("#drPhaseQ").value = "";
  for (const [k, v] of [["--accent", g.accent], ["--accent2", g.accent2]]) dr.root.style.setProperty(k, v);
  $("#drGame").textContent = g.name;
  $("#drMeta").textContent = `#${cur.dex} · ${g.short || g.name} ${codeLabel(cur, curGame)}${whereIn(cur, curGame) ? " · " + whereIn(cur, curGame) : ""}`;
  $("#drName").textContent = cur.name;
  $("#drSub").innerHTML = (cur.form ? `<span class="form-tag">${esc(cur.form)}</span>` : "") + statusNote(cur, curGame);
  dr.celebrate.classList.remove("show");
  paintAlt();
  paintHunt();
  paintLog();
  disarm();
  if (!dr.root.classList.contains("open")) {
    lastFocus = document.activeElement;
    dr.root.classList.add("open");
    dr.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    setTimeout(() => dr.panel.focus(), 50);
  }
  dr.panel.querySelector(".dr-scroll").scrollTop = 0;
}

// Phones: −1 / +1 move to a thumb dock at the bottom of the Hunt Deck (above Gotcha!).
const phoneDeck = matchMedia("(max-width: 560px)");
const placeCountActions = () => {
  const acts = $(".dr-count-actions");
  if (phoneDeck.matches) $(".dr-foot").prepend(acts);
  else $("#drCount").after(acts);
};

export function closeDrawer() {
  if (!dr.root.classList.contains("open")) return;
  dr.root.classList.remove("open");
  dr.root.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  if (lastFocus) lastFocus.focus({ preventScroll: true });
  releaseCur();
  syncWakeLock();
}
// Forget the hunted Pokémon once neither the Hunt Deck nor the pop-out shows it.
export function releaseCur() {
  if (!pip && !dr.root.classList.contains("open")) cur = null;
}

// Keep the screen on while a hunt's timer runs in the open Hunt Deck (or pop-out),
// so the phone doesn't lock mid-hunt. The browser drops the lock when the tab is hidden.
let wakeLock = null;
export async function syncWakeLock() {
  const want = !!(cur && hunt().since && (pip || dr.root.classList.contains("open"))) && document.visibilityState === "visible";
  if (want && !wakeLock && "wakeLock" in navigator) {
    wakeLock = "pending";
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch { wakeLock = null; }
  } else if (!want && wakeLock && wakeLock !== "pending") {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

export function paintHunt() {
  if (!cur) return;
  syncWakeLock();
  const h = hunt(), s = elapsed(h);
  dr.count.textContent = nf(h.count);
  dr.time.textContent = fmtTime(s);
  const idleLabel = s ? "▶ Resume" : "▶ Start";
  $("#drPlusLabel").textContent = h.since ? `+${h.inc}` : idleLabel;
  $("#drPlus").classList.toggle("idle", !h.since);
  $("#drMinus").textContent = `−${h.inc}`;
  dr.play.textContent = h.since ? "❚❚ Pause" : s ? "▶ Resume" : "▶ Start";
  dr.play.classList.toggle("running", !!h.since);
  dr.root.classList.toggle("running", !!h.since);
  $("#drCancel").hidden = !isActive(hunts[curKey()]);
  $("#drTimeHint").textContent = h.since ? "Running — keeps going when you close this" : s ? "Paused — press + to resume" : "Press + to start the hunt";
  paintSetup(h);
  paintPhases(h);
  paintChain(h);
  const inputs = { drInc: h.inc, drSetCount: h.count, drH: Math.floor(s / 3600), drM: Math.floor(s / 60) % 60, drS: s % 60 };
  for (const [id, v] of Object.entries(inputs)) if (document.activeElement !== $("#" + id)) $("#" + id).value = v;
  // Chance that a hunter would have hit the shiny by now: 1 - (1 - 1/odds)^n.
  const p = 1 - Math.pow(1 - 1 / h.odds, h.count);
  dr.luckBar.style.width = Math.min(100, p * 100) + "%";
  const ratio = h.count / h.odds;
  dr.luckText.innerHTML = !h.count
    ? "The meter fills as you encounter. The mark is where most hunters (63%) have found theirs."
    : ratio >= 1
      ? `<b>${(ratio).toFixed(2)}× odds.</b> ${(p * 100).toFixed(1)}% of hunters would have it by now — it's out there ✦`
      : `<b>${(p * 100).toFixed(1)}%</b> of hunters would have found it by now · ${(ratio * 100).toFixed(0)}% of odds`;
  paintPace(h);
  paintPip();
}

export const SHARE_ICO = `<svg class="share-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1"/></svg>`;
export function paintLog() {
  const list = shinies[curKey()] || [];
  dr.log.innerHTML = list.length
    ? list.map((s, i) => `<li>
          <span class="log-n">${sparkSvg()}${i + 1}</span>
          <span class="log-main"><b>${nf(s.count)}</b> encounters · ${fmtShort(s.time)}<small>${altOf(cur, s.alt) ? `${esc(altOf(cur, s.alt).n)} · ` : ""}${fmtDate(s.ts)}${s.method ? ` · ${esc(s.method)}` : ""}${s.odds ? ` · 1/${s.odds}` : ""}${s.phases ? ` · after ${s.phases} ${s.phases === 1 ? "phase" : "phases"}` : ""}</small></span>
          <button class="log-share" data-share="${i}" title="Share card" aria-label="Share card">${SHARE_ICO}</button>
          <button class="log-del" data-del="${i}" title="Delete entry">✕</button>
        </li>`).join("")
    : `<li class="log-empty">No shinies logged yet. Hit <b>Gotcha!</b> when it sparkles.</li>`;
}

function refreshCard() {
  if (!cur) return;
  if (state.huntsView) return renderHunts();
  if (state.page !== curGame) return renderSidebar();
  const c = el.gameCards.querySelector(`.pcard[data-id="${cur.id}"]`);
  if (c) c.outerHTML = card(cur, curGame);
  renderGameStats();
}

// Encounters only count while the timer runs; pressing + while it's stopped starts it instead.
export function addEncounter(sign = 1) {
  const h = hunt();
  if (sign > 0 && !h.since) return togglePlay();
  // On a chain method the chain moves with every encounter (chain.js).
  setHunt({ count: Math.max(0, h.count + sign * h.inc), ...(h.count || sign > 0 ? chainStep(h, sign) : {}) });
  if (sign > 0) {
    // A short buzz confirms the tap on phones that support it (Android; iOS ignores it).
    if (navigator.vibrate) navigator.vibrate(12);
    const f = document.createElement("span");
    f.textContent = `+${h.inc}`;
    f.style.left = 40 + Math.random() * 20 + "%";
    dr.float.append(f);
    setTimeout(() => f.remove(), 900);
    for (const c of [dr.count, pip && pip.document.querySelector(".pip-count")].filter(Boolean)) {
      c.classList.remove("bump");
      void c.offsetWidth;
      c.classList.add("bump");
    }
  }
}

export function togglePlay() {
  const h = hunt();
  setHunt(h.since ? { time: elapsed(h), since: null } : { since: Date.now() - 0 });
}

function gotcha() {
  if (!arm(dr.gotcha, "Tap again to log it ✦")) return;
  disarm();
  const h = hunt();
  const k = curKey();
  const method = h.setup ? evalSetup(curGame, h.setup).label : "";
  const phases = (h.phases || []).length, alt = huntAlt();
  (shinies[k] = shinies[k] || []).push({ count: h.count, time: elapsed(h), odds: h.odds, ...(method ? { method } : {}), ...(phases ? { phases } : {}), ...(alt ? { alt } : {}), ts: Date.now() });
  saveShinies();
  delete hunts[k];
  delete altPick[k];
  saveHunts();
  // A shiny ends a fishing chain: the next hunt in this game starts at 0.
  const next = afterShiny(curGame, h.setup);
  if (next !== h.setup) { prefs[curGame] = { ...prefs[curGame], setup: next, odds: evalSetup(curGame, next).odds }; savePrefs(); }
  paintHunt();
  paintLog();
  refreshCard();
  celebrate();
  const s = { ...shinies[k].at(-1), g: curGame, m: cur };
  toast(`Shiny ${cur.name} logged ✦`, { label: "Share card", run: () => openShare(s) }, 8000);
}

function celebrate() {
  dr.celebrate.innerHTML = `<b>✦ Shiny ${esc(cur.name)}!</b><span>${nf((shinies[curKey()].at(-1)).count)} encounters · logged</span>`;
  dr.celebrate.classList.remove("show");
  void dr.celebrate.offsetWidth;
  dr.celebrate.classList.add("show");
  const r = dr.stage.getBoundingClientRect();
  for (let i = 0; i < 3; i++) setTimeout(() => {
    const fake = { getBoundingClientRect: () => ({ left: r.left + r.width * (.25 + .25 * i), top: r.top + r.height * (.35 + .1 * (i % 2)), width: 0, height: 0 }) };
    burst(fake);
  }, i * 140);
  setTimeout(() => dr.celebrate.classList.remove("show"), 2600);
}
// On the Active hunts page the same Pokémon can appear for several games.
export const gameOf = c => (c.closest("[data-game]") || {}).dataset?.game || state.page;
const step = dir => {
  const cards = [...(state.huntsView ? el.huntCards : el.gameCards).querySelectorAll(".pcard")];
  const i = cards.findIndex(c => +c.dataset.id === cur.id && gameOf(c) === curGame);
  if (i < 0) return;
  const next = cards[(i + dir + cards.length) % cards.length];
  openDrawer(+next.dataset.id, gameOf(next));
  next.scrollIntoView({ block: "nearest" });
};

// Wiring: runs once at startup, from main.js.
export function init() {
  phoneDeck.addEventListener("change", placeCountActions);
  placeCountActions();
  document.addEventListener("visibilitychange", syncWakeLock);

  // Drawer events
  dr.root.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeDrawer(); });
  $("#drPlus").addEventListener("click", () => addEncounter(1));
  $("#drSprite").addEventListener("click", () => addEncounter(1));
  $("#drMinus").addEventListener("click", () => addEncounter(-1));
  dr.play.addEventListener("click", togglePlay);
  dr.gotcha.addEventListener("click", gotcha);
  $("#drSetup").addEventListener("click", e => {
    const t = e.target.closest("button");
    const patch = t && setupPatch(t, hunt().setup || defaultSetup(curGame));
    if (patch) changeSetup(patch);
  });
  $("#drAlt").addEventListener("change", e => {
    const v = e.target.value, k = curKey();
    if (v) altPick[k] = v; else delete altPick[k];
    if (hunts[k]) { hunts[k].alt = v || undefined; if (!v) delete hunts[k].alt; saveHunts(); }
    dr.img.src = altSprite(cur, v) || "";
  });
  $("#drInc").addEventListener("change", e => setHunt({ inc: Math.max(1, +e.target.value || 1) }));
  $("#drSetCount").addEventListener("change", e => setHunt({ count: Math.max(0, +e.target.value || 0) }));
  for (const id of ["drH", "drM", "drS"]) $("#" + id).addEventListener("change", () => {
    const t = Math.max(0, (+$("#drH").value || 0) * 3600 + (+$("#drM").value || 0) * 60 + (+$("#drS").value || 0));
    setHunt({ time: t, since: hunt().since ? Date.now() : null });
  });
  // Delete the running hunt (two taps), with a short Undo window.
  $("#drCancel").addEventListener("click", e => {
    if (!arm(e.currentTarget, "Tap again to delete")) return;
    disarm();
    const k = curKey(), prev = hunts[k], mon = cur, gid = curGame;
    delete hunts[k];
    saveHunts();
    paintHunt();
    refreshCard();
    toast(`Hunt for ${mon.name} deleted`, { label: "Undo", run: () => {
      hunts[k] = prev;
      saveHunts();
      render();
      if (cur && cur.id === mon.id && curGame === gid) paintHunt();
      toast("Hunt restored ✦");
    } });
  });
  $("#drReset").addEventListener("click", e => {
    if (!arm(e.currentTarget, "Tap again to reset")) return;
    disarm();
    delete hunts[curKey()];
    saveHunts();
    paintHunt();
    refreshCard();
    toast("Hunt reset");
  });
  dr.log.addEventListener("click", e => {
    const sh = e.target.closest("[data-share]");
    if (sh) return openShare({ ...shinies[curKey()][+sh.dataset.share], g: curGame, m: cur });
    const b = e.target.closest("[data-del]");
    if (!b || !arm(b, "Delete?")) return;
    disarm();
    const list = shinies[curKey()];
    list.splice(+b.dataset.del, 1);
    if (!list.length) delete shinies[curKey()];
    saveShinies();
    paintLog();
    refreshCard();
  });
  $("#drPrev").addEventListener("click", () => step(-1));
  $("#drNext").addEventListener("click", () => step(1));
  document.addEventListener("keydown", e => {
    if (!cur || !dr.root.classList.contains("open")) return;
    const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if (e.key === "Escape") { e.stopImmediatePropagation(); return closeDrawer(); }
    if (typing) return;
    const act = { " ": () => addEncounter(1), "+": () => addEncounter(1), "=": () => addEncounter(1), "-": () => addEncounter(-1),
      p: togglePlay, P: togglePlay, b: breakChain, B: breakChain, ArrowLeft: () => step(-1), ArrowRight: () => step(1) }[e.key];
    if (act && !(e.key === " " && document.activeElement.tagName === "BUTTON" && document.activeElement !== dr.panel)) {
      e.preventDefault(); e.stopImmediatePropagation(); act();
    } else if (e.key === "/") e.stopImmediatePropagation();
  }, true);
}
