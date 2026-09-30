// Light / dark theme switch.
import { THEME } from "../core/config.js";
import { $, safe } from "../core/util.js";

// Theme
const applyTheme = th => th ? document.documentElement.dataset.theme = th : delete document.documentElement.dataset.theme;
const flipTheme = () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  const next = dark ? "light" : "dark";
  applyTheme(next);
  safe(() => localStorage.setItem(THEME, next));
};

// Wiring: runs once at startup, from main.js.
export function init() {
  applyTheme(safe(() => localStorage.getItem(THEME)));
  $("#themeBtn").addEventListener("click", flipTheme);
  $("#themeBtnTop").addEventListener("click", flipTheme);
  $("#lpTheme").addEventListener("click", flipTheme);
}
