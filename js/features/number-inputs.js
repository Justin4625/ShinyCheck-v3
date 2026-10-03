// Number fields (encounters, time, step): the mouse wheel never changes their value. A focused number
// field would count up or down while the page scrolls past it; it loses focus instead, so the page scrolls.
// A field showing 0 empties when it gets focus, so a new number can be typed straight away (the 0 stays
// visible as placeholder); left empty, it shows 0 again. Clearing it this way fires no change event.
const isNumber = t => t instanceof HTMLInputElement && t.type === "number";
export function init() {
  document.addEventListener("wheel", e => {
    if (isNumber(e.target) && e.target === document.activeElement) e.target.blur();
  }, { passive: true });
  document.addEventListener("focusin", e => {
    const t = e.target;
    if (!isNumber(t) || t.value !== "0") return;
    t.value = "";
    t.placeholder = "0";
  });
  document.addEventListener("focusout", e => {
    const t = e.target;
    if (isNumber(t) && t.value === "" && t.placeholder === "0") t.value = "0";
  });
}
