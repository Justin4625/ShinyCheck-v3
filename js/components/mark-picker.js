// Mark picker: the form picker's dropdown with a game's marks (add and edit in Dex Entry, the Hunt Deck).
// A hidden input named "mark" carries the mark id ("" = no mark).
import { esc, norm } from "../core/util.js";
import { markOf, marksFor } from "../model/marks.js";
import { pickerFaces } from "./form-picker.js";

const face = id => {
  const k = markOf(id);
  return k
    ? `<img src="${k.icon}" alt=""><span class="fp-label">${esc(k.n)}<small>${esc(k.title)}</small></span>`
    : `<span class="fp-none">–</span><span class="fp-label">No mark</span>`;
};
pickerFaces.mark = face;

// Empty for a game without marks, unless the shiny already has one (it keeps its mark when moved).
export function markPicker(g, id) {
  const list = marksFor(g).some(k => k.id === id) || !markOf(id) ? marksFor(g) : [...marksFor(g), markOf(id)];
  if (!list.length) return "";
  const cur = list.some(k => k.id === id) ? id : "";
  return `<div class="fp mp" data-kind="mark">
      <input type="hidden" name="mark" value="${cur}">
      <button type="button" class="fp-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Mark">${face(cur)}<svg class="fp-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
      <div class="fp-pop" hidden>
        <input type="search" class="fp-q" placeholder="Filter ${list.length} marks…" aria-label="Filter marks" autocomplete="off">
        <div class="fp-list" role="listbox" aria-label="Mark">
          <button type="button" role="option" class="fp-opt" data-v="" aria-selected="${!cur}">${face("")}</button>
          ${list.map(k => `<button type="button" role="option" class="fp-opt" data-v="${k.id}" data-q="${esc(norm(`${k.n} ${k.title}`))}" aria-selected="${k.id === cur}">
            <img src="${k.icon}" alt="" loading="lazy"><span class="fp-label">${esc(k.n)}<small>${esc(k.title)}</small></span></button>`).join("")}
        </div>
        <p class="fp-empty" hidden>No mark matches.</p>
      </div>
    </div>`;
}
