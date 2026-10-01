// Buy me a lunch: "Buy me a lunch" in the sidebar's ⚙ menu and a small card at the
// bottom of What's new open a dialog that links to
// ShinyCheck's Ko-fi page (SUPPORT_URL and SUPPORT_PRICE in core/config.js; hidden while the URL is empty).
// Paying happens on Ko-fi only; it says thank you there.
import { openDlg, wireDlg } from "../components/dialog.js";
import { SUPPORT_PRICE, SUPPORT_URL } from "../core/config.js";
import { $ } from "../core/util.js";

const dlg = $("#supportDlg");

// Wiring: runs once at startup, from main.js.
export function init() {
  if (!SUPPORT_URL) return;
  $("#supportGo").href = SUPPORT_URL;
  for (const n of document.querySelectorAll("[data-support-price]")) n.textContent = SUPPORT_PRICE;
  wireDlg(dlg);
  for (const b of document.querySelectorAll("[data-support]")) {
    b.hidden = false;
    b.addEventListener("click", () => {
      document.body.classList.remove("menu-open");
      openDlg(dlg);
    });
  }
}
