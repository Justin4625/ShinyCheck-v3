// Install explainer: a dialog with the steps to install ShinyCheck on this device and what you get
// (its own window or icon, works offline, stays synced). Opened from the Install buttons (app-install.js).
//   ios     iPhone / iPad Safari: Share → Add to Home Screen
//   mac     Safari on a Mac (17+, macOS Sonoma or later): File → Add to Dock
//   prompt  Chrome / Edge on a computer: explained here, then the browser's own install prompt
//   android Android (Chrome and others): mostly what offline means, then the browser's own prompt
import { $ } from "../core/util.js";

const ICON = {
  share: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/></svg>`,
  window: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2.5"/><path d="M8 21h8M12 17v4"/></svg>`,
  offline: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 014.3-2.6M19 12.9a10 10 0 00-2.7-1.9M1.5 9a15 15 0 014.7-2.9M22.5 9A15 15 0 0010.7 5M12 20h.01"/></svg>`,
  app: `<img src="icons/icon-192.png" alt="">`,
};
const MODES = {
  android: {
    title: "Use it offline",
    steps: [["offline", "Installed, ShinyCheck <b>works without internet</b> — in a cave, on a plane or with bad signal."],
      ["app", "Your hunts keep counting and your shinies get logged, offline too. It opens from its own icon."],
      ["plus", "Tap <b>Install</b> below, then <b>Install</b> again in the prompt."]],
    fine: "Anything you do offline syncs to your account as soon as you're back online.",
  },
  ios: {
    title: "Add to Home Screen",
    steps: [["share", "Tap <b>Share</b> in Safari's toolbar."], ["plus", "Choose <b>Add to Home Screen</b>."],
      ["app", "Tap <b>Add</b> — ShinyCheck opens full screen from its own icon."]],
    fine: "Your shinies and hunts stay synced with your account, and the app keeps working offline.",
  },
  mac: {
    title: "Add to Dock",
    steps: [["menu", "In Safari's menu bar, click <b>File</b>."], ["plus", "Choose <b>Add to Dock</b>, then click <b>Add</b>."],
      ["app", "ShinyCheck opens in its own window from the Dock."]],
    fine: "Works offline and stays synced with your account. Add to Dock needs macOS Sonoma or later.",
  },
  prompt: {
    title: "Install ShinyCheck",
    steps: [["window", "ShinyCheck opens in <b>its own window</b>, from your Dock, Start menu or desktop."],
      ["offline", "It <b>works offline</b>: your hunts keep counting without internet."],
      ["app", "Click <b>Install</b> below, then <b>Install</b> again in your browser's prompt."]],
    fine: "Your shinies and hunts stay synced with your account. You can uninstall it any time from the app's menu.",
  },
};

const dlg = $("#installHelp");
let onInstall = null;
export function openInstallHelp(mode, install) {
  const m = MODES[mode];
  onInstall = install || null;
  $("#installTitle").textContent = m.title;
  $("#installSteps").innerHTML = m.steps.map(([ico, text]) => `<li><span class="install-ico">${ICON[ico]}</span><span>${text}</span></li>`).join("");
  $("#installFine").textContent = m.fine;
  $("#installActions").innerHTML = onInstall
    ? `<button class="rl-again" data-installclose>Not now</button><button class="rl-go v2-go" id="installGo">Install ✦</button>`
    : `<button class="rl-go v2-go" data-installclose>Got it ✦</button>`;
  document.body.classList.remove("menu-open");
  dlg.hidden = false;
  document.body.classList.add("drawer-open");
}
function close() {
  dlg.hidden = true;
  document.body.classList.remove("drawer-open");
}

// Wiring: runs once at startup, from main.js.
export function init() {
  dlg.addEventListener("click", e => {
    if (e.target.closest("#installGo")) { const run = onInstall; close(); run && run(); return; }
    if (e.target.closest("[data-installclose]") || e.target === dlg) close();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !dlg.hidden) { e.stopImmediatePropagation(); close(); } }, true);
}
