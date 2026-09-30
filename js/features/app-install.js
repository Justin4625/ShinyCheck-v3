// Installable app: service worker, update prompt and the install buttons.
import { toast } from "../components/toast.js";
import { BASE } from "../core/config.js";
import { $, safe } from "../core/util.js";

// The service worker (sw.js) makes ShinyCheck open offline. Not on localhost unless ?sw,
// so development always gets fresh files.
export const swOk = "serviceWorker" in navigator && (location.hostname !== "localhost" || new URLSearchParams(location.search).has("sw"));

// Install: Chrome / Edge / Android fire beforeinstallprompt; iPhone and iPad (Safari) don't,
// so there the button explains Share → Add to Home Screen.
const INSTALL_DISMISSED = "shinycheck-v3-install-dismissed";
export const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let installEvent = null;
function paintInstall() {
  const can = !standalone() && (!!installEvent || isIOS);
  $("#installSide").hidden = !can;
  $("#installBanner").hidden = !can || !!safe(() => localStorage.getItem(INSTALL_DISMISSED)) || !matchMedia("(max-width: 900px)").matches;
}
export async function install() {
  if (installEvent) {
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    installEvent = null;
    if (outcome === "accepted") safe(() => localStorage.setItem(INSTALL_DISMISSED, "1"));
    paintInstall();
  } else if (isIOS) {
    document.body.classList.remove("menu-open");
    $("#installHelp").hidden = false;
    document.body.classList.add("drawer-open");
  }
}

// Wiring: runs once at startup, from main.js.
export function init() {
  if (swOk) {
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
    const launchedAt = Date.now();
    navigator.serviceWorker.register(BASE + "sw.js", { scope: BASE }).then(reg => {
      const offer = worker => {
        // Just opened the app? Take the update right away — nothing to lose yet.
        if (Date.now() - launchedAt < 4000) return worker.postMessage("skipWaiting");
        toast("A new version of ShinyCheck is ready", { label: "Update", run: () => worker.postMessage("skipWaiting") }, 15000);
      };
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w.addEventListener("statechange", () => {
          if (w.state === "installed" && navigator.serviceWorker.controller) offer(w);
        });
      });
      // Check for a new version when the app comes back to the foreground, at most every 30 min.
      let lastCheck = Date.now();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && Date.now() - lastCheck > 18e5) { lastCheck = Date.now(); reg.update().catch(() => {}); }
      });
    }).catch(err => console.warn("Service worker not registered:", err));
  }

  addEventListener("offline", () => toast("You're offline — everything keeps working and syncs when you're back", null, 4000));
  addEventListener("online", () => toast("Back online ✦"));
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvent = e; paintInstall(); });
  addEventListener("appinstalled", () => { installEvent = null; paintInstall(); toast("ShinyCheck is installed ✦ Open it from your home screen"); });
  $("#installSide").addEventListener("click", install);
  $("#installBannerGo").addEventListener("click", install);
  $("#installBannerClose").addEventListener("click", () => { safe(() => localStorage.setItem(INSTALL_DISMISSED, "1")); paintInstall(); });
  $("#installHelp").addEventListener("click", e => {
    if (e.target.closest("[data-installclose]") || e.target === e.currentTarget) {
      $("#installHelp").hidden = true;
      document.body.classList.remove("drawer-open");
    }
  });
  paintInstall();
}
