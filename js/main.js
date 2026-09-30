// ShinyCheck: entry point. Loads every module, wires them up in order and shows the current page.
//
// Folders: core/ (storage, state, helpers), model/ (game data and rules), components/ (reusable UI),
// pages/ (one per route), features/ (dialogs, drawers and everything else). Data lives in /data,
// the Firebase layer in services/cloud.js. See README.md for how it fits together.
import { toast } from "./components/toast.js";
import { applyData, hasLocalData, snapshot } from "./features/sync.js";
import { whatsNew } from "./features/whats-new.js";
import { render, route } from "./pages/router.js";
import { init as initFormPicker } from "./components/form-picker.js";
import { init as initCard } from "./components/card.js";
import { init as initHome } from "./pages/home.js";
import { init as initGame } from "./pages/game.js";
import { init as initSidebar } from "./components/sidebar.js";
import { init as initRouter } from "./pages/router.js";
import { init as initHuntDeck } from "./features/hunt-deck/deck.js";
import { init as initPhases } from "./features/hunt-deck/phases.js";
import { init as initDexEntry } from "./features/dex-entry.js";
import { init as initRoulette } from "./features/roulette.js";
import { init as initPopOut } from "./features/hunt-deck/pop-out.js";
import { init as initToolbar } from "./pages/toolbar.js";
import { init as initTheme } from "./features/theme.js";
import { init as initV2Import } from "./features/v2-import.js";
import { init as initBackups } from "./features/backups.js";
import { init as initAppInstall } from "./features/app-install.js";
import { init as initStats } from "./pages/stats.js";
import { init as initShareCard } from "./features/share-card.js";
import { init as initNotifications } from "./features/notifications.js";
import { init as initWhatsNew } from "./features/whats-new.js";

// Event wiring, in the order the features depend on (e.g. which Escape handler runs first).
initFormPicker();
initCard();
initHome();
initGame();
initSidebar();
initRouter();
initHuntDeck();
initPhases();
initDexEntry();
initRoulette();
initPopOut();
initToolbar();
initTheme();
initV2Import();
initBackups();
initAppInstall();
initStats();
initShareCard();
initNotifications();
initWhatsNew();

// Bridge for services/cloud.js (a separate module that loads Firebase).
window.ShinyApp = { snapshot, applyData, hasLocalData, toast, render, whatsNew: () => whatsNew() };
route();
