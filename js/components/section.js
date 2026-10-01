// A dex section (title, progress, card grid) and the empty state.
import { card } from "./card.js";
import { sparkSvg } from "./icons.js";
import { done, gHas, has, pct } from "../core/collection.js";
import { esc } from "../core/util.js";

export const sectionHtml = (num, title, key, all, items, grad, gid, f = gid ? gHas(gid) : has) => `
    <section class="dex-section">
      <div class="section-head">
        <span class="section-num">${num}</span>
        <h3 class="section-title">${esc(title)}</h3>
        <div class="section-meta" data-sec="${key}" ${grad ? `style="--g:${grad}"` : ""}>
          <span class="sec-count">${done(all, f)} / ${all.length}</span>
          <span class="sec-bar"><i style="width:${pct(all, f)}%"></i></span>
        </div>
      </div>
      <div class="card-grid">${items.map(m => card(m, gid)).join("")}</div>
    </section>`;

// `filtered`: Filter & sort has settings on, which may be what hides everything.
export const empty = (input, filtered) => `<div class="empty-state">${sparkSvg()}No Pokémon found${input.value ? ` for “${esc(input.value)}”` : ""}${filtered ? "<small>Filters are on: check Filter &amp; sort.</small>" : ""}</div>`;
