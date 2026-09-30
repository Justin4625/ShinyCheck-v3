// Notifications dialog: turn update news on or off on this device.
import { toast } from "../components/toast.js";
import { $ } from "../core/util.js";
import { install, isIOS, standalone, swOk } from "./app-install.js";

const pushDlg = $("#pushDlg");
const PUSH_ERR = { "push/denied": "Notifications weren't allowed", "push/unsupported": "This browser can't show notifications", "push/signed-out": "Sign in to turn on notifications" };
function paintPush() {
  const api = window.Cloud && window.Cloud.push;
  const close = `<button class="rl-again" data-pushclose>Close</button>`;
  const [cls, msg, actions] =
    isIOS && !standalone() ? ["warn", "On iPhone and iPad, notifications only work in the installed app. Add ShinyCheck to your Home Screen, open it from there and turn them on here.", close + `<button class="rl-go" data-push="install">How to install</button>`]
    : !api || !swOk || api.permission() === "unsupported" ? ["warn", "This browser can't show notifications.", close]
    : !(window.Cloud.backups && window.Cloud.backups.available()) ? ["warn", "Sign in to turn on notifications.", close]
    : api.permission() === "denied" ? ["warn", "Notifications are blocked for ShinyCheck. Allow them in your browser or phone settings, then come back here.", close]
    : api.enabled() ? ["ok", "<b>On</b> for this device ✦", `<button class="rl-again" data-push="off">Turn off</button><button class="rl-go" data-pushclose>Done</button>`]
    : ["", "Off for this device.", close + `<button class="rl-go" data-push="on">Turn on ✦</button>`];
  $("#pushState").innerHTML = `<p class="v2-note ${cls}">${msg}</p>`;
  $("#pushActions").innerHTML = actions;
}
const closePush = () => { pushDlg.hidden = true; document.body.classList.remove("drawer-open"); };

// Wiring: runs once at startup, from main.js.
export function init() {
  $("#pushOpen").addEventListener("click", () => {
    document.body.classList.remove("menu-open");
    pushDlg.hidden = false;
    document.body.classList.add("drawer-open");
    paintPush();
  });
  pushDlg.addEventListener("click", async e => {
    if (e.target === pushDlg || e.target.closest("[data-pushclose]")) return closePush();
    const b = e.target.closest("[data-push]");
    if (!b) return;
    const api = window.Cloud.push, act = b.dataset.push;
    if (act === "install") { closePush(); return install(); }
    b.disabled = true;
    try {
      if (act === "on") { b.textContent = "Turning on…"; await api.enable(); toast("Notifications on ✦ You'll hear about new updates"); }
      if (act === "off") { await api.disable(); toast("Notifications off"); }
    } catch (err) {
      console.error(err);
      toast(PUSH_ERR[err.code] || `Couldn't turn on notifications (${err.code || err.message})`);
    }
    paintPush();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !pushDlg.hidden) { e.stopImmediatePropagation(); closePush(); } }, true);
}
