// Buy me a lunch: a small sandwich button in the sidebar's bottom bar opens a dialog that links to
// ShinyCheck's Ko-fi page (SUPPORT_URL and SUPPORT_PRICE in core/config.js; hidden while the URL is empty).
// Paying happens on Ko-fi only; it says thank you there.
import { openDlg, wireDlg } from "../components/dialog.js";
import { SUPPORT_PRICE, SUPPORT_URL } from "../core/config.js";
import { $ } from "../core/util.js";

const dlg = $("#supportDlg"), btn = $("#supportBtn");

// Wiring: runs once at startup, from main.js.
export function init() {
  if (!SUPPORT_URL) return;
  btn.hidden = false;
  $("#supportGo").href = SUPPORT_URL;
  for (const n of document.querySelectorAll("[data-support-price]")) n.textContent = SUPPORT_PRICE;
  wireDlg(dlg);
  btn.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
    openDlg(dlg);
  });
}
