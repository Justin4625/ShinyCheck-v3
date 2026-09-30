// Pop-out: always-on-top mini Hunt Deck window (Document Picture-in-Picture, Chrome/Edge).
import { toast } from "../../components/toast.js";
import { fmtShort, fmtTime, nf } from "../../core/format.js";
import { state } from "../../core/state.js";
import { elapsed, hk, hunts } from "../../core/store.js";
import { $ } from "../../core/util.js";
import { addEncounter, cur, curGame, dr, gameOf, hunt, huntAlt, releaseCur, syncWakeLock, togglePlay } from "./deck.js";
import { altSprite } from "../../model/forms.js";
import { GAME_INFO } from "../../model/games.js";
import { huntPace } from "../../model/hunt-pace.js";
import { activeHunts } from "../../pages/hunts.js";
import { paintPace } from "./pace.js";

export let pip = null;
const pipBtn = $("#drPop");

async function popOut() {
  if (pip) return pip.focus();
  try {
    pip = await documentPictureInPicture.requestWindow({ width: 360, height: 196 });
  } catch {
    return toast("Pop-out isn't available here");
  }
  const d = pip.document;
  for (const l of document.querySelectorAll('link[rel="stylesheet"]')) {
    d.head.append(Object.assign(d.createElement("link"), { rel: "stylesheet", href: l.href }));
  }
  if (document.documentElement.dataset.theme) d.documentElement.dataset.theme = document.documentElement.dataset.theme;
  d.body.className = "pip-body";
  d.body.innerHTML = `<div class="pip">
      <button class="pip-stage" title="+1 (Space)"><img class="pip-img" alt=""></button>
      <div class="pip-info">
        <span class="pip-game"></span>
        <span class="pip-name"></span>
        <span class="pip-time"><i></i><b></b></span>
      </div>
      <button class="pip-play" title="Start / pause (P)"></button>
      <div class="pip-row">
        <div class="pip-tally"><span class="pip-count"></span><span class="pip-odds"></span></div>
        <button class="pip-minus" title="−1 (−)"></button>
        <button class="pip-plus" title="+1 (Space)"></button>
      </div>
      <div class="pip-meter"><i></i></div>
    </div>`;
  d.querySelector(".pip-plus").onclick = () => addEncounter(1);
  d.querySelector(".pip-stage").onclick = () => addEncounter(1);
  d.querySelector(".pip-minus").onclick = () => addEncounter(-1);
  d.querySelector(".pip-play").onclick = togglePlay;
  pip.addEventListener("keydown", e => {
    const act = { " ": () => addEncounter(1), "+": () => addEncounter(1), "=": () => addEncounter(1), "-": () => addEncounter(-1), p: togglePlay, P: togglePlay }[e.key];
    if (act) { e.preventDefault(); act(); }
  });
  pip.addEventListener("pagehide", () => {
    pip = null;
    setTimeout(syncWakeLock);
    pipBtn.classList.remove("on");
    releaseCur();
  });
  pipBtn.classList.add("on");
  paintPip();
}

export function paintPip() {
  if (!pip || !cur) return;
  const d = pip.document, g = GAME_INFO[curGame], h = hunt(), s = elapsed(h);
  d.title = `${nf(h.count)} · ${cur.name}`;
  d.body.style.setProperty("--accent", g.accent);
  d.body.style.setProperty("--accent2", g.accent2);
  d.body.classList.toggle("running", !!h.since);
  const img = d.querySelector(".pip-img");
  const src = new URL(altSprite(cur, huntAlt()) || "", location.href).href;
  if (img.src !== src) img.src = src;
  d.querySelector(".pip-game").textContent = g.abbr;
  d.querySelector(".pip-name").textContent = cur.name + (cur.form ? ` · ${cur.form}` : "");
  d.querySelector(".pip-time b").textContent = fmtTime(s);
  d.querySelector(".pip-count").textContent = nf(h.count);
  // Same luck meter as the Hunt Deck: chance a hunter would have found it by now.
  const p = 1 - Math.pow(1 - 1 / h.odds, h.count);
  const pace = huntPace(h, s);
  d.querySelector(".pip-odds").textContent = `1/${nf(h.odds)}${h.count ? ` · ${(h.count / h.odds).toFixed(2)}×` : ""}${pace ? ` · ${nf(Math.round(pace.perHour))}/h` : ""}`;
  d.querySelector(".pip-meter i").style.width = Math.min(100, p * 100) + "%";
  d.querySelector(".pip-plus").textContent = h.since ? `+${h.inc}` : "▶";
  d.querySelector(".pip-minus").textContent = `−${h.inc}`;
  d.querySelector(".pip-play").textContent = h.since ? "❚❚" : "▶";
}

// Wiring: runs once at startup, from main.js.
export function init() {
  if (!("documentPictureInPicture" in window)) pipBtn.remove();
  pipBtn.addEventListener("click", popOut);

  // One clock for everything that runs: the open drawer and live hunt strips on cards.
  setInterval(() => {
    if (cur && hunt().since) { dr.time.textContent = fmtTime(elapsed(hunt())); paintPace(hunt()); paintPip(); }
    for (const n of document.querySelectorAll("#gameCards [data-live], #huntCards [data-live]")) {
      const gid = gameOf(n);
      const h = gid && hunts[hk(gid, n.dataset.live)];
      if (h && h.since) n.textContent = fmtTime(elapsed(h));
    }
    if (state.huntsView && $("#huntsTime")) $("#huntsTime").textContent = fmtShort(activeHunts().reduce((s, x) => s + elapsed(x.h), 0));
  }, 1000);
}
