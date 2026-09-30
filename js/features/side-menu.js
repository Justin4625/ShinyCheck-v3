// Sidebar ⚙ menu: Notifications, Backups, Sign out and Reset collection, opened from the compact bar at
// the bottom of the sidebar. Each item has its own handler elsewhere (notifications.js, backups.js,
// services/cloud.js); this only opens and closes the menu, and closes the phone menu for dialogs.
import { $ } from "../core/util.js";

const menu = $("#sideMenu"), btn = $("#sideMenuBtn");
function setOpen(open) {
  menu.hidden = !open;
  btn.setAttribute("aria-expanded", open);
}

// Wiring: runs once at startup, from main.js.
export function init() {
  btn.addEventListener("click", () => setOpen(menu.hidden));
  // Picking an item closes the menu; dialogs shouldn't sit on top of the phone menu either.
  menu.addEventListener("click", e => {
    if (!e.target.closest(".side-menu-item")) return;
    setOpen(false);
    document.body.classList.remove("menu-open");
  });
  document.addEventListener("click", e => { if (!menu.hidden && !e.target.closest("#sideMenu, #sideMenuBtn")) setOpen(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) { e.stopImmediatePropagation(); setOpen(false); btn.focus(); } }, true);
}
