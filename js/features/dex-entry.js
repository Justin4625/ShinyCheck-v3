// Dex Entry: every shiny of a species across games, forms checklist, add / edit / evolve / move.
import { burst } from "../components/burst.js";
import { card } from "../components/card.js";
import { formPicker } from "../components/form-picker.js";
import { gamePicker } from "../components/game-picker.js";
import { setupHtml, setupPatch } from "../components/hunt-setup.js";
import { statusNote } from "../components/status.js";
import { toast } from "../components/toast.js";
import { arm, disarm } from "../components/two-step.js";
import { shiniesOf } from "../core/collection.js";
import { GAMES, LOG_GAMES } from "../core/config.js";
import { fmtDate, fmtShort, nf } from "../core/format.js";
import { el, state } from "../core/state.js";
import { hk, hunts, isActive, prefs, saveShinies, shinies } from "../core/store.js";
import { $, esc } from "../core/util.js";
import { SHARE_ICO } from "./hunt-deck/deck.js";
import { openShare } from "./share-card.js";
import { markPost } from "./social-sync.js";
import { EVENT_ONLY } from "../model/availability.js";
import { mons, region, speciesOf } from "../model/dex.js";
import { evolutionsOf } from "../model/evolutions.js";
import { altId, altOf, altSprite, altsOf, formText } from "../model/forms.js";
import { codeLabel } from "../model/game-dex.js";
import { GAME_INFO } from "../model/games.js";
import { HUNT_SETUP, defaultSetup, evalSetup, patchSetup } from "../model/hunt-setup.js";
import { renderHomeStats } from "../pages/home.js";
import { navigate } from "../pages/router.js";

const en = { root: $("#entry"), panel: $("#entry .drawer-panel"), log: $("#enLog") };
export let entryMon = null, entryFocus = null, editing = null, adding = false;
// Forms checklist: the form tapped (shown in the hero, marked in the log, preset for "Add a shiny")
// and whether a long list is expanded.
let viewAlt = "", altsAll = false;
// Setup for "Add a shiny": starts from the game's remembered hunt setup.
let addSetup = null;
const addSetupFor = g => ({ ...defaultSetup(g), ...((prefs[g] || {}).setup || {}) });
function paintAddSetup(g) {
  const box = $("#enSetup");
  if (!box) return;
  box.hidden = !!GAME_INFO[g].noOdds || !HUNT_SETUP[g];
  if (box.hidden) return;
  box.innerHTML = `<div class="en-setup-head"><span>Hunt method</span><b>1/${nf(evalSetup(g, addSetup).odds)}</b></div>${setupHtml(g, addSetup)}`;
}

export function openEntry(id) {
  entryMon = mons.find(m => m.id === id);
  editing = null;
  adding = false;
  viewAlt = "";
  altsAll = false;
  paintEntry();
  if (!en.root.classList.contains("open")) {
    entryFocus = document.activeElement;
    en.root.classList.add("open");
    en.root.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    setTimeout(() => en.panel.focus(), 50);
  }
  en.panel.querySelector(".dr-scroll").scrollTop = 0;
}

export function closeEntry() {
  if (!en.root.classList.contains("open")) return;
  en.root.classList.remove("open");
  en.root.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  if (entryFocus) entryFocus.focus({ preventScroll: true });
  entryMon = null;
}

export function paintEntry() {
  const m = entryMon, forms = speciesOf(m);
  const logs = forms.flatMap(shiniesOf).sort((a, b) => b.ts - a.ts);
  $("#enChip").textContent = `National Dex #${m.dex}`;
  $("#enImg").src = altSprite(m, viewAlt) || "";
  $("#enMeta").textContent = `${region(m.gen)} · Gen ${m.gen}`;
  $("#enWiki").href = m.url;
  $("#enStatus").innerHTML = statusNote(m);
  $("#enName").innerHTML = `${esc(m.name)}${logs.length ? ` <span class="en-x">✦${logs.length}</span>` : ""}`;
  $("#enForms").innerHTML = forms.length > 1
    ? forms.map(f => `<button class="en-form ${f.id === m.id ? "active" : ""}" data-form="${f.id}" title="${esc(f.form || f.name)}">
          ${f.sprite ? `<img src="${f.sprite}" alt="">` : ""}<span>${esc(f.form || "Original")}</span></button>`).join("")
    : m.form ? `<span class="form-tag">${esc(m.form)}</span>` : "";

  const enc = logs.reduce((s, l) => s + l.count, 0), time = logs.reduce((s, l) => s + l.time, 0);
  $("#enStats").innerHTML = [
    [logs.length, "Shinies"], [nf(enc), "Encounters"], [logs.length ? fmtShort(time) : "—", "Hunt time"],
  ].map(([v, l]) => `<div class="en-stat"><b>${v}</b><span>${l}</span></div>`).join("");

  // Forms checklist for this entry: which forms have a shiny, and in which games.
  const alts = altsOf(m), own = shiniesOf(m);
  $("#enAlts").hidden = !alts.length;
  if (alts.length) {
    const gamesOf = id => [...new Set(own.filter(l => altId(m, l.alt) === id).map(l => GAME_INFO[l.g].abbr || GAME_INFO[l.g].name))];
    const got = alts.filter(f => gamesOf(f.id).length).length, unset = own.filter(l => !altOf(m, l.alt)).length;
    // Long lists (Vivillon, Unown, Alcremie) start folded: collected forms plus the first ones, in order.
    const LIMIT = 12, fold = !altsAll && alts.length > LIMIT + 3;
    const keep = new Set(alts.filter(f => gamesOf(f.id).length).map(f => f.id));
    for (const f of alts) if (keep.size < LIMIT) keep.add(f.id);
    if (viewAlt) keep.add(viewAlt);
    const shown = fold ? alts.filter(f => keep.has(f.id)) : alts;
    $("#enAlts").innerHTML = `<div class="en-alts-head"><span class="dr-label">Forms</span>
          <b class="${got === alts.length ? "done" : ""}">${got}/${alts.length}</b></div>
        <div class="en-alts">${shown.map(f => {
        const gs = gamesOf(f.id);
        return `<button class="en-alt ${gs.length ? "got" : ""} ${f.id === viewAlt ? "sel" : ""}" data-alt-view="${f.id}" aria-pressed="${f.id === viewAlt}" title="${gs.length ? `Shiny ${esc(f.n)} in ${esc(gs.join(", "))}` : `${esc(f.n)}: not caught yet`}">
            <span class="en-alt-img"><img src="${altSprite(m, f.id)}" alt="" loading="lazy">${gs.length ? `<i class="en-alt-check">✓</i>` : ""}</span>
            <b>${esc(f.n)}</b><small>${gs.length ? esc(gs.join(" · ")) : "Not yet"}</small></button>`;
      }).join("")}</div>
        ${shown.length < alts.length ? `<button class="en-alts-more" data-alts-all>Show all ${alts.length} forms</button>` : ""}
        ${unset ? `<p class="en-alts-note">${unset === 1 ? "1 shiny has" : `${unset} shinies have`} no form yet — tap it in the log to set one.</p>` : ""}`;
  }

  en.log.innerHTML = logs.length ? logs.map(l => {
    const g = GAME_INFO[l.g], key = `${l.g}:${l.m.id}:${l.i}`, open = editing === key;
    const d = new Date(l.ts), local = l.ts ? new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : "";
    const mark = !viewAlt ? "" : l.m.id === m.id && altId(m, l.alt) === viewAlt ? "hl" : "dim";
    return `<li class="en-item ${open ? "open" : ""} ${mark}" style="--accent:${g.accent};--accent2:${g.accent2}">
        <button class="en-row" data-edit="${key}">
          <span class="en-thumb">${l.m.sprite ? `<img src="${altSprite(l.m, l.alt)}" alt="">` : ""}</span>
          <span class="en-main">
            <b>${esc(l.m.name)}${formText(l.m, l.alt) ? ` <em>${esc(formText(l.m, l.alt))}</em>` : ""}</b>
            <span class="en-game">${esc(g.name)}${l.caughtIn && GAME_INFO[l.caughtIn] ? ` <em class="en-from">· caught in ${esc(GAME_INFO[l.caughtIn].abbr || GAME_INFO[l.caughtIn].name)}</em>` : ""}</span>
            <small>${fmtDate(l.ts)}${l.method ? ` · ${esc(l.method)}` : ""}${l.odds && !GAME_INFO[l.g].noOdds ? ` · 1/${l.odds}` : ""}${l.phases ? ` · after ${l.phases} ${l.phases === 1 ? "phase" : "phases"}` : ""}</small>
          </span>
          <span class="en-nums"><b>${nf(l.count)}</b><small>${fmtShort(l.time)}</small></span>
        </button>
        ${open ? `<div class="en-edit" data-key="${key}">
          <label>Encounters<input type="number" min="0" name="count" value="${l.count}"></label>
          <label>Hours<input type="number" min="0" name="h" value="${Math.floor(l.time / 3600)}"></label>
          <label>Min<input type="number" min="0" max="59" name="m" value="${Math.floor(l.time / 60) % 60}"></label>
          <label>Sec<input type="number" min="0" max="59" name="s" value="${l.time % 60}"></label>
          <label class="wide">Caught on<input type="datetime-local" name="ts" value="${local}"></label>
          ${altsOf(l.m).length ? `<div class="wide en-fp"><span>Form</span>${formPicker(l.m, l.alt)}</div>` : ""}
          ${(() => {
          const prev = (l.evolvedFrom || []).length && mons.find(x => x.id === l.evolvedFrom.at(-1));
          return prev ? `<button class="en-devolve" data-devolve title="Move this shiny back to ${esc(prev.name)}">
              <svg class="undo-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></svg>Undo evolve${prev.sprite ? `<img src="${prev.sprite}" alt="">` : ""}<b>${esc(prev.name)}</b></button>` : "";
        })()}
          ${(() => {
          const evos = evolutionsOf(l.m);
          return evos.length ? `<div class="en-evolve"><span>Evolve into</span>${evos.map(x => `<button class="en-evo" data-evolve="${x.id}" title="Move this shiny to ${esc(x.name)}${x.form ? " (" + esc(x.form) + ")" : ""}">
              ${x.sprite ? `<img src="${x.sprite}" alt="">` : ""}<b>${esc(x.name)}</b>${x.form && x.form !== "Original" ? `<small>${esc(x.form)}</small>` : ""}</button>`).join("")}</div>`
            : `<div class="en-evolve final"><span>Final evolution ✦</span></div>`;
        })()}
          ${(() => {
          // Moved through HOME to another game: the shiny then counts there.
          const to = LOG_GAMES.filter(x => x !== l.g && (GAME_INFO[x].logOnly || l.m.games[x]))
            .sort((x, y) => !!GAME_INFO[x].logOnly - !!GAME_INFO[y].logOnly || (GAME_INFO[y].released || "").localeCompare(GAME_INFO[x].released || ""));
          return to.length ? `<div class="en-move"><span>Move to game</span>${to.map(x => `<button class="en-move-btn" data-move="${x}" style="--accent:${GAME_INFO[x].accent};--accent2:${GAME_INFO[x].accent2}">${esc(GAME_INFO[x].abbr || GAME_INFO[x].name)}</button>`).join("")}</div>` : "";
        })()}
          <div class="en-edit-actions">
            <button class="en-save" data-save>Save</button>
            <button class="en-share" data-share title="Share card">${SHARE_ICO}Share</button>
            <button class="dr-danger" data-delete>Delete</button>
          </div>
        </div>` : ""}
      </li>`;
  }).join("") : `<li class="log-empty">No shinies of ${esc(m.name)} yet. Start a hunt below or add one manually ✦</li>`;

  const addGames = LOG_GAMES.filter(g => GAME_INFO[g].logOnly || m.games[g]);
  // Shinies that only exist as Pokémon HOME gifts start with HOME selected.
  // Otherwise the newest main-series game this form is in.
  const newest = addGames.filter(g => !GAME_INFO[g].logOnly).sort((x, y) => GAME_INFO[y].released.localeCompare(GAME_INFO[x].released))[0];
  const preset = (EVENT_ONLY[+m.dex] || "").includes("Pokémon HOME gift") ? "home" : newest || addGames[0];
  if (adding && !addSetup) addSetup = addSetupFor(preset);
  const now = new Date(), nowLocal = new Date(now - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  $("#enAdd").innerHTML = adding ? `<div class="en-add-form">
        <div class="wide">${gamePicker(addGames, preset)}</div>
        <label>Encounters<input type="number" min="0" name="count" value="0"></label>
        <label>Hours<input type="number" min="0" name="h" value="0"></label>
        <label>Min<input type="number" min="0" max="59" name="m" value="0"></label>
        <label>Sec<input type="number" min="0" max="59" name="s" value="0"></label>
        <div class="wide en-setup" id="enSetup"></div>
        <label class="wide">Caught on<input type="datetime-local" name="ts" value="${nowLocal}"></label>
        ${alts.length ? `<div class="wide en-fp"><span>Form</span>${formPicker(m, viewAlt)}</div>` : ""}
        <div class="en-edit-actions">
          <button class="en-save" data-add-save>Add ${esc(m.name)}${m.form && m.form !== "Original" ? ` (${esc(m.form)})` : ""} ✦</button>
          <button class="dr-danger en-cancel" data-add-cancel>Cancel</button>
        </div>
      </div>`
    : `<button class="en-add-btn" data-add-open><span>+</span> Add a shiny${altOf(m, viewAlt) ? ` ${esc(altOf(m, viewAlt).n)}` : " manually"}</button>`;
  if (adding) paintAddSetup(preset);

  const games = GAMES.filter(gid => m.games[gid]);
  $("#enGames").innerHTML = games.length
    ? games.map(gid => {
      const g = GAME_INFO[gid], h = hunts[hk(gid, m.id)];
      return `<button class="en-game-chip" data-hunt="${gid}" style="--accent:${g.accent};--accent2:${g.accent2}">
          <span>${esc(g.name)}</span><small>${isActive(h) ? `⚡ ${nf(h.count)}` : codeLabel(m, gid)}</small></button>`;
    }).join("")
    : `<p class="en-none">Not obtainable in the tracked games.</p>`;
}

function refreshHomeCard(id) {
  const c = el.cards.querySelector(`.pcard[data-id="${id}"]`);
  if (c) c.outerHTML = card(mons.find(m => m.id === id));
}

const entryStep = dir => {
  const ids = [...el.cards.querySelectorAll(".pcard")].map(c => +c.dataset.id);
  const i = ids.indexOf(entryMon.id);
  if (i < 0) return;
  const next = ids[(i + dir + ids.length) % ids.length];
  openEntry(next);
  el.cards.querySelector(`.pcard[data-id="${next}"]`).scrollIntoView({ block: "nearest" });
};

// Wiring: runs once at startup, from main.js.
export function init() {

  // Picking a game loads its setup (GO and HOME have none); defaults to the setup last used there.
  en.root.addEventListener("change", e => {
    if (e.target.name !== "game" || !e.target.closest(".en-add-form")) return;
    addSetup = addSetupFor(e.target.value);
    paintAddSetup(e.target.value);
  });

  en.root.addEventListener("input", e => {
    if (!e.target.classList.contains("gp-filter")) return;
    const pick = e.target.closest(".game-pick"), q = e.target.value.trim().toLowerCase();
    pick.querySelectorAll(".gp-tile").forEach(t => { t.hidden = !!q && !t.dataset.name.includes(q); });
    pick.querySelectorAll(".gp-group").forEach(g => { g.hidden = !g.querySelector(".gp-tile:not([hidden])"); });
    pick.querySelector(".gp-empty").hidden = !!pick.querySelector(".gp-tile:not([hidden])");
  });

  en.root.addEventListener("click", e => {
    if (e.target.closest("[data-eclose]")) return closeEntry();
    if (e.target.closest("[data-add-open]")) { adding = true; addSetup = null; editing = null; return paintEntry(); }
    if (e.target.closest("[data-add-cancel]")) { adding = false; viewAlt = ""; return paintEntry(); }
    if (e.target.closest("[data-alts-all]")) { altsAll = true; return paintEntry(); }
    const altView = e.target.closest("[data-alt-view]");
    if (altView) {
      viewAlt = viewAlt === altView.dataset.altView ? "" : altView.dataset.altView;
      paintEntry();
      const hero = $("#entry .en-sprite");
      hero.classList.remove("pop");
      void hero.offsetWidth;
      hero.classList.add("pop");
      return;
    }
    const setupBtn = e.target.closest("#enSetup button");
    if (setupBtn) {
      const g = en.root.querySelector('.en-add-form [name="game"]:checked').value, patch = setupPatch(setupBtn, addSetup);
      if (patch) { addSetup = patchSetup(g, addSetup, patch); paintAddSetup(g); }
      return;
    }
    const addBtn = e.target.closest("[data-add-save]");
    if (addBtn) {
      const f = addBtn.closest(".en-add-form"), val = n => f.querySelector(`[name="${n}"]:not([type="radio"]), [name="${n}"]:checked`).value;
      const g = val("game"), ts = new Date(val("ts")).getTime(), num = n => Math.max(0, +val(n) || 0);
      const k = hk(g, entryMon.id), alt = f.querySelector('[name="alt"]') ? f.querySelector('[name="alt"]').value : "";
      (shinies[k] = shinies[k] || []).push(markPost({ count: num("count"), time: num("h") * 3600 + num("m") * 60 + num("s"), ...(GAME_INFO[g].noOdds || !HUNT_SETUP[g] ? { odds: null } : { odds: evalSetup(g, addSetup).odds, method: evalSetup(g, addSetup).label }), ...(alt ? { alt } : {}), ts: isNaN(ts) ? Date.now() : ts, manual: true }, { manual: true }));
      shinies[k].sort((x, y) => x.ts - y.ts);
      saveShinies();
      adding = false;
      viewAlt = "";
      const r = addBtn.getBoundingClientRect();
      paintEntry();
      refreshHomeCard(entryMon.id);
      renderHomeStats();
      burst({ getBoundingClientRect: () => r });
      return toast(`Shiny ${entryMon.name}${altOf(entryMon, alt) ? ` (${altOf(entryMon, alt).n})` : ""} logged in ${GAME_INFO[g].name} ✦`);
    }
    const form = e.target.closest("[data-form]");
    if (form) { entryMon = mons.find(m => m.id === +form.dataset.form); editing = null; viewAlt = ""; altsAll = false; return paintEntry(); }
    const row = e.target.closest("[data-edit]");
    if (row) { editing = editing === row.dataset.edit ? null : row.dataset.edit; return paintEntry(); }
    const hunt = e.target.closest("[data-hunt]");
    if (hunt) {
      state.pendingHunt = entryMon.id;
      closeEntry();
      navigate(hunt.dataset.hunt);
      return;
    }
    const box = e.target.closest(".en-edit");
    if (!box) return;
    const [gid, id, i] = box.dataset.key.split(":"), list = shinies[`${gid}:${id}`];
    // Move a log entry to another form of the chain and follow it with the panel.
    const moveEntry = (to, patch, msg, fromEl) => {
      const from = mons.find(m => m.id === +id);
      const [entry] = list.splice(+i, 1);
      if (!list.length) delete shinies[`${gid}:${id}`];
      const dest = shinies[hk(gid, to.id)] = shinies[hk(gid, to.id)] || [];
      dest.push({ ...entry, ...patch(entry, from) });
      dest.sort((x, y) => x.ts - y.ts);
      saveShinies();
      refreshHomeCard(from.id);
      refreshHomeCard(to.id);
      renderHomeStats();
      const r = fromEl.getBoundingClientRect();
      openEntry(to.id);
      editing = `${gid}:${to.id}:${dest.findIndex(x => x.ts === entry.ts)}`;
      paintEntry();
      burst({ getBoundingClientRect: () => r });
      toast(msg(from));
    };
    const mv = e.target.closest("[data-move]");
    if (mv) {
      const to = mv.dataset.move, mon = mons.find(m => m.id === +id);
      const [entry] = list.splice(+i, 1);
      if (!list.length) delete shinies[`${gid}:${id}`];
      const caughtIn = entry.caughtIn || gid;
      const moved = { ...entry, caughtIn };
      if (caughtIn === to) delete moved.caughtIn;
      const dest = shinies[hk(to, mon.id)] = shinies[hk(to, mon.id)] || [];
      dest.push(moved);
      dest.sort((x, y) => (x.ts || 0) - (y.ts || 0));
      saveShinies();
      editing = `${to}:${mon.id}:${dest.indexOf(moved)}`;
      paintEntry();
      refreshHomeCard(mon.id);
      renderHomeStats();
      return toast(`Shiny ${mon.name} moved to ${GAME_INFO[to].name}`, { label: "Undo", run: () => {
        const d = shinies[hk(to, mon.id)], j = d.indexOf(moved);
        if (j >= 0) d.splice(j, 1);
        if (!d.length) delete shinies[hk(to, mon.id)];
        (shinies[`${gid}:${id}`] = shinies[`${gid}:${id}`] || []).push(entry);
        shinies[`${gid}:${id}`].sort((x, y) => (x.ts || 0) - (y.ts || 0));
        saveShinies();
        editing = null;
        if (entryMon) paintEntry();
        refreshHomeCard(mon.id);
        renderHomeStats();
      } });
    }
    const back = e.target.closest("[data-devolve]");
    if (back) {
      const hist = list[+i].evolvedFrom, to = mons.find(m => m.id === hist.at(-1));
      return moveEntry(to, en => ({ evolvedFrom: en.evolvedFrom.slice(0, -1) }), from => `${from.name} is back to ${to.name}`, back);
    }
    const evo = e.target.closest("[data-evolve]");
    if (evo) {
      const to = mons.find(m => m.id === +evo.dataset.evolve);
      return moveEntry(to, (en, from) => ({ evolvedFrom: [...(en.evolvedFrom || []), from.id] }), from => `${from.name} evolved into ${to.name} ✦`, evo);
    }
    if (e.target.closest("[data-share]")) return openShare({ ...list[+i], g: gid, m: mons.find(m => m.id === +id) });
    if (e.target.closest("[data-save]")) {
      const v = n => Math.max(0, +box.querySelector(`[name="${n}"]`).value || 0);
      const ts = new Date(box.querySelector('[name="ts"]').value).getTime();
      Object.assign(list[+i], { count: v("count"), time: v("h") * 3600 + v("m") * 60 + v("s"), ts: isNaN(ts) ? list[+i].ts : ts });
      const altBox = box.querySelector('[name="alt"]');
      if (altBox) { if (altBox.value) list[+i].alt = altBox.value; else delete list[+i].alt; }
      saveShinies();
      editing = null;
      paintEntry();
      toast("Entry saved");
    } else if (e.target.closest("[data-delete]")) {
      const b = e.target.closest("[data-delete]");
      if (!arm(b, "Tap again to delete")) return;
      disarm();
      list.splice(+i, 1);
      if (!list.length) delete shinies[`${gid}:${id}`];
      saveShinies();
      editing = null;
      paintEntry();
      refreshHomeCard(+id);
      renderHomeStats();
      toast("Entry deleted");
    }
  });
  $("#enPrev").addEventListener("click", () => entryStep(-1));
  $("#enNext").addEventListener("click", () => entryStep(1));
  document.addEventListener("keydown", e => {
    if (!entryMon || !en.root.classList.contains("open")) return;
    if (e.key === "Escape") { e.stopImmediatePropagation(); return closeEntry(); }
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const act = { ArrowLeft: () => entryStep(-1), ArrowRight: () => entryStep(1) }[e.key];
    if (act) { e.preventDefault(); e.stopImmediatePropagation(); act(); }
    else if (e.key === "/") e.stopImmediatePropagation();
  }, true);
}
