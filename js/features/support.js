// Buy me a lunch: a small sandwich button in the sidebar's bottom bar opens a dialog with a €2.99
// Stripe Payment Link (SUPPORT_URL in core/config.js; hidden while it's empty). After paying, Stripe
// sends people back to /?thanks=lunch, which shows a thank-you once and is taken out of the address.
import { burst } from "../components/burst.js";
import { openDlg, wireDlg } from "../components/dialog.js";
import { toast } from "../components/toast.js";
import { SUPPORT_URL } from "../core/config.js";
import { $ } from "../core/util.js";

const dlg = $("#supportDlg"), btn = $("#supportBtn");

function thankYou() {
  const q = new URLSearchParams(location.search);
  if (q.get("thanks") !== "lunch") return;
  q.delete("thanks");
  history.replaceState(null, "", location.pathname + (q.size ? "?" + q : "") + location.hash);
  setTimeout(() => {
    toast("Thanks for the lunch! Sparkling Power Lv. 3 ✦", null, 5000);
    burst($("#toast"));
  }, 600);
}

// Wiring: runs once at startup, from main.js.
export function init() {
  thankYou();
  if (!SUPPORT_URL) return;
  btn.hidden = false;
  $("#supportGo").href = SUPPORT_URL;
  wireDlg(dlg);
  btn.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
    openDlg(dlg);
  });
}
