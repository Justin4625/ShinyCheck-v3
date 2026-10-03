// Number fields (encounters, time, step): the mouse wheel never changes their value. A focused number
// field would count up or down while the page scrolls past it; it loses focus instead, so the page scrolls.
export function init() {
  document.addEventListener("wheel", e => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.type === "number" && t === document.activeElement) t.blur();
  }, { passive: true });
}
