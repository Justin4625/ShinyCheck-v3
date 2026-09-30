// Search and filter toggles on the Shiny Dex and game pages.
import { el, state } from "../core/state.js";
import { $ } from "../core/util.js";
import { render } from "./router.js";

let t;

// Wiring: runs once at startup, from main.js.
export function init() {

  for (const [id, key] of [["#fMissing", "missing"], ["#fForms", "forms"], ["#gMissing", "gMissing"], ["#gForms", "gOutside"]]) {
    $(id).addEventListener("click", e => {
      state[key] = !state[key];
      e.currentTarget.setAttribute("aria-pressed", state[key]);
      render();
    });
  }
  for (const input of [el.q, el.gq]) input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 120); });

  document.addEventListener("keydown", e => {
    const input = state.page ? el.gq : el.q;
    if (e.key === "/" && document.activeElement !== input && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    if (e.key === "Escape" && document.activeElement === input) { input.value = ""; render(); input.blur(); }
    if (e.key === "Escape") document.body.classList.remove("menu-open");
  });
}
