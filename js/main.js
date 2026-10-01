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
import { init as initSideMenu } from "./features/side-menu.js";
import { init as initRouter } from "./pages/router.js";
import { init as initHuntDeck } from "./features/hunt-deck/deck.js";
import { init as initPhases } from "./features/hunt-deck/phases.js";
import { init as initChain } from "./features/hunt-deck/chain.js";
import { init as initDexEntry } from "./features/dex-entry.js";
import { init as initRoulette } from "./features/roulette.js";
import { init as initPopOut } from "./features/hunt-deck/pop-out.js";
import { init as initToolbar } from "./pages/toolbar.js";
import { init as initFilterSheet } from "./features/filter-sheet.js";
import { init as initTheme } from "./features/theme.js";
import { init as initBackups } from "./features/backups.js";
import { init as initAppInstall } from "./features/app-install.js";
import { init as initInstallHelp } from "./features/install-help.js";
import { init as initStats } from "./pages/stats.js";
import { init as initShareCard } from "./features/share-card.js";
import { init as initNotifications } from "./features/notifications.js";
import { init as initWhatsNew } from "./features/whats-new.js";
import { init as initSocialSync } from "./features/social-sync.js";
import { init as initFeed } from "./pages/feed.js";
import { init as initProfile } from "./pages/profile.js";
import { init as initFollowList } from "./features/follow-list.js";
import { init as initPhotoCrop } from "./features/photo-crop.js";
import { init as initProfileEdit } from "./features/profile-edit.js";
import { init as initProfileCollection } from "./features/profile-collection.js";
import { init as initTrainerSearch } from "./features/trainer-search.js";
import { init as initLandingFeed } from "./features/landing-feed.js";
import { init as initSocialBell } from "./features/social-bell.js";
import { init as initPresence } from "./features/presence.js";
import { init as initAdmin } from "./pages/admin.js";
import { init as initSupport } from "./features/support.js";
import { init as initOwnerSocials } from "./components/owner-socials.js";
import { init as initAccountAvatar } from "./features/account-avatar.js";

// Event wiring, in the order the features depend on (e.g. which Escape handler runs first).
initFormPicker();
initCard();
initHome();
initGame();
initSidebar();
initSideMenu();
initRouter();
initHuntDeck();
initPhases();
initChain();
initDexEntry();
initRoulette();
initPopOut();
initToolbar();
initFilterSheet();
initTheme();
initBackups();
initAppInstall();
initInstallHelp();
initStats();
initShareCard();
initNotifications();
initWhatsNew();
initSocialSync();
initFeed();
initProfile();
initFollowList();
initPhotoCrop();
initProfileEdit();
initProfileCollection();
initTrainerSearch();
initLandingFeed();
initSocialBell();
initPresence();
initAdmin();
initSupport();
initOwnerSocials();
initAccountAvatar();

// Bridge for services/cloud.js (a separate module that loads Firebase).
window.ShinyApp = { snapshot, applyData, hasLocalData, toast, render, whatsNew: () => whatsNew() };
route();
