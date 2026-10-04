// Encounters and hunt time for a logged shiny (add and edit in Dex Entry), each with a "Not tracked"
// switch for a shiny whose encounters or time nobody kept. Not tracked is saved as 0, which the app
// already shows as "—" and leaves out of luck, pace and totals (like GO and HOME shinies).

const toggle = (name, off) => `<label class="tf-off"><input type="checkbox" name="${name}Off" ${off ? "checked" : ""}><span>Not tracked</span></label>`;

// `off` = start with the switches on (editing a shiny saved without encounters or time).
export function trackedFields(count, time, off = false) {
  const unit = (label, name, value, max) => `<label>${label}<input type="number" min="0" ${max ? `max="${max}"` : ""} name="${name}" value="${value}"></label>`;
  return `<div class="wide tf">
      <div class="tf-head"><span>Encounters</span>${toggle("count", off && !count)}</div>
      <div class="tf-inputs"><input type="number" min="0" name="count" value="${count}" aria-label="Encounters"></div>
      <p class="tf-none">Not tracked</p>
    </div>
    <div class="wide tf">
      <div class="tf-head"><span>Hunt time</span>${toggle("time", off && !time)}</div>
      <div class="tf-inputs tf-time">${unit("Hours", "h", Math.floor(time / 3600), 0)}${unit("Min", "m", Math.floor(time / 60) % 60, 59)}${unit("Sec", "s", time % 60, 59)}</div>
      <p class="tf-none">Not tracked</p>
    </div>`;
}

// { count, time } from a form holding trackedFields(); 0 where "Not tracked" is on.
export function readTracked(box) {
  const num = n => Math.max(0, +box.querySelector(`[name="${n}"]`).value || 0);
  const off = n => box.querySelector(`[name="${n}Off"]`).checked;
  return {
    count: off("count") ? 0 : num("count"),
    time: off("time") ? 0 : num("h") * 3600 + num("m") * 60 + num("s"),
  };
}
