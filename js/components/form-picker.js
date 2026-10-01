// Form picker: dropdown with sprites to choose a Pokémon's form (add, edit, Hunt Deck); the mark picker reuses it.
import { $, esc, norm } from "../core/util.js";
import { mons } from "../model/dex.js";
import { altId, altOf, altSprite, altsOf } from "../model/forms.js";

// Form picker: one dropdown for every place a form is chosen (add, edit, Hunt Deck). It is built
// from data/forms.js only, so new forms show up by themselves. A hidden input carries the value and
// fires "change" like a <select>; long lists get a filter. Wiring: see "Form picker" below.
const FP_FILTER = 8;
// Other pickers built on the same dropdown (mark-picker.js) set `data-kind` and register their face here.
export const pickerFaces = {};
const fpFace = (m, id) => {
  const f = altOf(m, id);
  return `${f ? `<img src="${altSprite(m, id)}" alt="">` : `<span class="fp-none">?</span>`}<span class="fp-label">${esc(f ? f.n : "Form not set")}</span>`;
};
export const formPicker = (m, id, label = "Form") => {
  const alts = altsOf(m);
  return `<div class="fp" data-mon="${m.id}">
      <input type="hidden" name="alt" value="${altOf(m, id) ? altId(m, id) : ""}">
      <button type="button" class="fp-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(label)}">${fpFace(m, id)}<svg class="fp-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
      <div class="fp-pop" hidden>
        ${alts.length > FP_FILTER ? `<input type="search" class="fp-q" placeholder="Filter ${alts.length} forms…" aria-label="Filter forms" autocomplete="off">` : ""}
        <div class="fp-list" role="listbox" aria-label="${esc(label)}">
          <button type="button" role="option" class="fp-opt" data-v="" aria-selected="${!altOf(m, id)}"><span class="fp-none">?</span><span class="fp-label">Form not set</span></button>
          ${alts.map(f => `<button type="button" role="option" class="fp-opt" data-v="${f.id}" data-q="${esc(norm(f.n))}" aria-selected="${f.id === altId(m, id)}">
            <img src="${altSprite(m, f.id)}" alt="" loading="lazy"><span class="fp-label">${esc(f.n)}</span></button>`).join("")}
        </div>
        <p class="fp-empty" hidden>No form matches.</p>
      </div>
    </div>`;
};

const fpOpen = () => document.querySelector(".fp.open");
function fpClose(fp = fpOpen(), focus = false) {
  if (!fp) return;
  fp.classList.remove("open");
  fp.querySelector(".fp-pop").hidden = true;
  fp.querySelector(".fp-btn").setAttribute("aria-expanded", "false");
  if (focus) fp.querySelector(".fp-btn").focus();
}
function fpToggle(fp) {
  const was = fp.classList.contains("open");
  fpClose();
  if (was) return;
  fp.classList.add("open");
  const pop = fp.querySelector(".fp-pop"), q = fp.querySelector(".fp-q");
  pop.hidden = false;
  fp.querySelector(".fp-btn").setAttribute("aria-expanded", "true");
  // Open upwards when there's no room below (e.g. the Hunt Deck near the thumb dock).
  const r = fp.getBoundingClientRect(), dock = $(".dr-foot"), bottom = dock && dock.offsetParent && fp.closest("#drawer") ? dock.getBoundingClientRect().top : innerHeight;
  fp.classList.toggle("up", bottom - r.bottom < 300 && r.top > bottom - r.bottom);
  const sel = pop.querySelector('[aria-selected="true"]');
  if (sel) sel.scrollIntoView({ block: "nearest" });
  // No auto-focus on the filter on touch screens: the keyboard would cover the list.
  (q && matchMedia("(hover: hover)").matches ? q : sel || pop.querySelector(".fp-opt")).focus({ preventScroll: true });
}
function fpPick(opt) {
  const fp = opt.closest(".fp"), input = fp.querySelector('input[type="hidden"]');
  input.value = opt.dataset.v;
  fp.querySelectorAll(".fp-opt").forEach(o => o.setAttribute("aria-selected", o === opt));
  const face = pickerFaces[fp.dataset.kind] || (v => fpFace(mons.find(x => x.id === +fp.dataset.mon), v));
  fp.querySelector(".fp-btn").innerHTML = face(opt.dataset.v) + fp.querySelector(".fp-chev").outerHTML;
  fpClose(fp, true);
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

// Wiring: runs once at startup, from main.js.
export function init() {
  document.addEventListener("click", e => {
    const btn = e.target.closest(".fp-btn"), opt = e.target.closest(".fp-opt");
    if (btn) return fpToggle(btn.closest(".fp"));
    if (opt) return fpPick(opt);
    if (!e.target.closest(".fp-pop")) fpClose();
  });
  document.addEventListener("input", e => {
    if (!e.target.classList.contains("fp-q")) return;
    const fp = e.target.closest(".fp"), q = norm(e.target.value.trim());
    let any = false;
    fp.querySelectorAll(".fp-opt").forEach(o => { o.hidden = !!q && !(o.dataset.q || "").includes(q); any = any || !o.hidden; });
    fp.querySelector(".fp-empty").hidden = any;
  });
  // Runs before the drawers' own keys (window capture), so Esc closes only the list.
  addEventListener("keydown", e => {
    const fp = fpOpen();
    if (!fp) return;
    const opts = [...fp.querySelectorAll(".fp-opt:not([hidden])")], i = opts.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); return fpClose(fp, true); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); e.stopImmediatePropagation();
      const next = opts[e.key === "ArrowDown" ? Math.min(opts.length - 1, i + 1) : Math.max(0, i - 1)];
      if (next) next.focus();
    } else if (e.key === "Enter" && i < 0 && opts.length === 1) { e.preventDefault(); fpPick(opts[0]); }
    else if (e.key === " " || e.key === "Enter") e.stopImmediatePropagation();
  }, true);
}
