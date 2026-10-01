// Accounts + cloud sync (Firebase Auth + Firestore).
// The app keeps working from localStorage; this module mirrors that state into one
// Firestore document per account (users/{uid}) and pulls changes from other devices.
// Load the config with the same ?v= cache-busting version as this module.
const { firebaseConfig, googleClientId, appCheckSiteKey, vapidKey } = await import(`../../firebase-config.js${new URL(import.meta.url).search}`);

const $ = s => document.querySelector(s);
const gate = $("#gate");
const account = $("#account");

if (!firebaseConfig) {
  // Local-only mode: no login, everything stays in this browser (and no community pages).
  window.CloudLocal = true;
  account.innerHTML = `<span class="acc-local" title="Add your Firebase config in firebase-config.js to enable accounts">Local mode · not synced</span>`;
  setTimeout(() => window.ShinyApp.whatsNew(), 1500);
} else {
  start().catch(err => {
    console.error(err);
    showGate();
    setError("Couldn't reach the login service. Check your connection and reload.");
  });
}

async function start() {
  document.body.classList.add("locked");
  const V = "12.19.0"; // also in sw.js (FIREBASE), which saves the SDK for offline use
  const [{ initializeApp }, authMod, fs] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  const {
    getAuth, onAuthStateChanged, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  } = authMod;
  const {
    initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
    doc, onSnapshot, setDoc, serverTimestamp,
    collection, addDoc, getDocs, getDoc, deleteDoc, query, orderBy,
  } = fs;

  const app = initializeApp(firebaseConfig);
  // App Check: every Firebase request carries a reCAPTCHA v3 token proving it comes from
  // this site, so a copied API key is useless elsewhere. Must run before Auth/Firestore.
  if (appCheckSiteKey) {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app-check.js`);
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
    document.body.classList.add("recaptcha");
  }
  const auth = getAuth(app);
  // Firestore's own offline cache queues writes while offline and sends them later.
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  // Testing on localhost: localStorage "shinycheck-emulator" = "1" switches to the local Firebase
  // emulators (auth 9099, Firestore 8181), so nothing reaches the real project.
  if (location.hostname === "localhost" && localStorage.getItem("shinycheck-emulator") === "1") {
    authMod.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    fs.connectFirestoreEmulator(db, "127.0.0.1", 8181);
  }
  // The social layer (services/social.js) reads and writes through the same connection.
  const emit = (name, detail) => dispatchEvent(new CustomEvent(name, { detail }));

  const OWNER = "shinycheck-v3-owner";
  // `loaded`: the account's data has arrived (from the server, or Firestore's offline copy). Until then
  // nothing is written, so a device whose local storage is empty or stale can't overwrite the account
  // while it's still loading.
  let ref = null, unsub = null, first = true, loaded = false;
  let dirty = false, timer = null, lastWrite = 0, lastRev = null;

  // ---------- Sync ----------
  // Every save is one Firestore write, so changes are batched: normal edits after
  // 1.5 s of quiet, encounter counting at most every 10 s, and everything on leave.
  const HUNT_EVERY = 10000, DEBOUNCE = 1500;
  window.Cloud = {
    changed(kind) {
      if (!ref) return;
      dirty = true;
      clearTimeout(timer);
      const wait = kind === "hunt" ? Math.max(0, HUNT_EVERY - (Date.now() - lastWrite)) : DEBOUNCE;
      timer = setTimeout(flush, wait);
    },
    flush: () => flush(),
    fb: { db, fs, auth },
    // For the admin dashboard's Google Cloud sign-in (services/admin.js).
    googleClientId,
  };

  async function flush() {
    clearTimeout(timer);
    if (!ref || !dirty || !loaded) return;
    dirty = false;
    lastWrite = Date.now();
    lastRev = Math.random().toString(36).slice(2);
    setStatus("saving");
    try {
      await setDoc(ref, { ...window.ShinyApp.snapshot(), rev: lastRev, updatedAt: serverTimestamp() });
      setStatus("saved");
      emit("cloud:saved");
    } catch (err) {
      console.error(err);
      dirty = true;
      setStatus("error");
      timer = setTimeout(flush, 30000);
    }
  }
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });

  onAuthStateChanged(auth, user => {
    unsub && unsub();
    unsub = null;
    ref = null;
    loaded = false;
    dirty = false;
    emit("cloud:user", user);
    if (!user) {
      showGate();
      renderAccount(null);
      return;
    }
    hideGate();
    renderAccount(user);
    ref = doc(db, "users", user.uid);
    first = true;
    unsub = onSnapshot(ref, { includeMetadataChanges: false }, snap => {
      if (snap.metadata.hasPendingWrites) return;
      loaded = true;
      const owner = localStorage.getItem(OWNER);
      if (!snap.exists()) {
        // New account: bring along progress made in this browser (once, and only if
        // it doesn't belong to another account).
        if (first && window.ShinyApp.hasLocalData() && (!owner || owner === user.uid)) {
          dirty = true;
          flush();
          window.ShinyApp.toast("Your shiny collection is now saved to your account ✦");
        } else if (first && owner && owner !== user.uid) {
          window.ShinyApp.applyData({}, { quiet: true });
        }
      } else {
        const data = snap.data();
        // Changes made while the account was loading were made on top of old local data: the account wins.
        if (first) dirty = false;
        if (data.rev !== lastRev) window.ShinyApp.applyData(data, { quiet: true });
      }
      localStorage.setItem(OWNER, user.uid);
      if (first) setTimeout(autoBackup, 5000);
      if (first) setTimeout(refreshPush, 8000);
      if (first) setTimeout(() => window.ShinyApp.whatsNew(), 1500);
      if (first) emit("cloud:ready", user);
      first = false;
      setStatus("saved");
    }, err => {
      console.error(err);
      setStatus("error");
    });
  });

  // ---------- Backups: users/{uid}/backups, one automatic copy a week, newest 8 kept ----------
  const WEEK = 7 * 24 * 3600 * 1000, KEEP = 8;
  const backupsCol = () => ref && collection(db, "users", auth.currentUser.uid, "backups");
  const counts = d => ({
    shinies: Object.values(d.shinies || {}).reduce((n, l) => n + l.length, 0),
    hunts: Object.keys(d.hunts || {}).length,
  });
  async function listBackups() {
    const snap = await getDocs(query(backupsCol(), orderBy("createdAt", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().createdAt?.toMillis?.() || Date.now() }));
  }
  async function createBackup(kind = "manual") {
    await flush();
    const { rev, ...data } = window.ShinyApp.snapshot();
    await addDoc(backupsCol(), { createdAt: serverTimestamp(), kind, counts: counts(data), data });
    const all = await listBackups();
    await Promise.all(all.slice(KEEP).map(b => deleteDoc(doc(backupsCol(), b.id))));
  }
  async function autoBackup() {
    if (!ref || !window.ShinyApp.hasLocalData()) return;
    try {
      const [latest] = await listBackups();
      if (!latest || Date.now() - latest.date > WEEK) await createBackup("auto");
    } catch (err) { console.warn("Automatic backup skipped:", err.code || err); }
  }
  async function restoreBackup(id) {
    await createBackup("before-restore");
    const snap = await getDoc(doc(backupsCol(), id));
    if (!snap.exists()) throw new Error("Backup not found");
    window.ShinyApp.applyData(snap.data().data);
    await flush();
  }
  window.Cloud.backups = {
    available: () => !!ref,
    list: listBackups,
    create: () => createBackup("manual"),
    restore: restoreBackup,
  };

  // ---------- Notifications: update news pushed to devices that opt in ----------
  // Each device gets a Firebase Cloud Messaging token, saved as pushTokens/{token}. The
  // "Send notification" GitHub Action (.github/workflows/notify.yml) sends to all of them
  // and sw.js shows the message.
  const PUSH_ON = "shinycheck-v3-push";
  let fcm = null;
  const pushErr = code => Object.assign(new Error(code), { code: `push/${code}` });
  async function messaging() {
    if (fcm) return fcm;
    const m = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-messaging.js`);
    if (!(await m.isSupported())) throw pushErr("unsupported");
    return (fcm = { m, it: m.getMessaging(app) });
  }
  async function pushToken() {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) throw pushErr("no-service-worker");
    const { m, it } = await messaging();
    return m.getToken(it, { vapidKey, serviceWorkerRegistration: reg });
  }
  async function saveToken(token) {
    await setDoc(doc(db, "pushTokens", token), { uid: auth.currentUser.uid, createdAt: serverTimestamp() });
    localStorage.setItem(PUSH_ON, token);
  }
  const permission = () => typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  window.Cloud.push = {
    available: !!vapidKey,
    permission,
    enabled: () => !!localStorage.getItem(PUSH_ON) && permission() === "granted",
    async enable() {
      if (permission() === "unsupported" || !("serviceWorker" in navigator)) throw pushErr("unsupported");
      if (!auth.currentUser) throw pushErr("signed-out");
      // Asked first, while the tap still counts as a user gesture (Safari requires that).
      if (await Notification.requestPermission() !== "granted") throw pushErr("denied");
      await saveToken(await pushToken());
    },
    async disable() {
      const token = localStorage.getItem(PUSH_ON);
      localStorage.removeItem(PUSH_ON);
      if (!token) return;
      await deleteDoc(doc(db, "pushTokens", token)).catch(() => {});
      await messaging().then(({ m, it }) => m.deleteToken(it)).catch(() => {});
    },
  };
  if (vapidKey) $("#pushOpen").hidden = false;
  // Tokens can rotate: re-save this device's token (under the signed-in account) once per launch.
  async function refreshPush() {
    const old = localStorage.getItem(PUSH_ON);
    if (!vapidKey || !old || permission() !== "granted" || !auth.currentUser) return;
    try {
      const token = await pushToken();
      if (token !== old) await deleteDoc(doc(db, "pushTokens", old)).catch(() => {});
      await saveToken(token);
    } catch (err) { console.warn("Notification token not refreshed:", err.code || err); }
  }

  // ---------- Account UI ----------
  function renderAccount(user) {
    // Sign out lives in the sidebar's ⚙ menu (features/side-menu.js).
    $("#signOut").hidden = !user;
    if (!user) { account.innerHTML = ""; return; }
    // Never the email: the account's name, then the profile name once it's loaded.
    const name = user.displayName || "Trainer";
    account.innerHTML = `
      <div class="acc">
        ${user.photoURL ? `<img class="acc-avatar" src="${user.photoURL}" alt="" referrerpolicy="no-referrer">`
          : `<span class="acc-avatar">${name[0].toUpperCase()}</span>`}
        <span class="acc-text"><b>${escapeHtml(name)}</b><small id="syncStatus">Synced</small></span>
      </div>`;
    $("#signOut").onclick = async () => {
      await flush();
      await signOut(auth);
      // Don't leave this account's progress behind for the next person on this browser.
      window.ShinyApp.applyData({}, { quiet: true });
      localStorage.removeItem(OWNER);
    };
  }

  // Show the profile name once it's loaded (social:me) and after it changes.
  const showName = e => {
    const b = account.querySelector(".acc-text b");
    if (b && e.detail && e.detail.uid === (auth.currentUser && auth.currentUser.uid)) b.textContent = e.detail.name;
  };
  addEventListener("social:me", showName);
  addEventListener("social:profile", showName);

  function setStatus(s) {
    const el = $("#syncStatus");
    if (!el) return;
    el.textContent = { saving: "Saving…", saved: "Synced", error: "Offline — will retry" }[s];
    el.dataset.state = s;
  }

  // ---------- Login screen ----------
  let mode = "in";
  const form = $("#gateForm");
  const setMode = m => {
    mode = m;
    gate.dataset.mode = m;
    $("#gateSubmit").textContent = { in: "Sign in", up: "Create account", reset: "Send reset link" }[m];
    $("#gateTitle").textContent = { in: "Welcome back, Trainer", up: "Start your journey", reset: "Reset your password" }[m];
    $("#gatePassword").required = m !== "reset";
    $("#gatePassword").autocomplete = m === "up" ? "new-password" : "current-password";
    $("#gateConfirm").required = m === "up";
    $("#gateConfirm").value = "";
    setError("");
  };
  gate.addEventListener("click", e => {
    const t = e.target.closest("[data-mode]");
    if (t && t !== gate) setMode(t.dataset.mode);
    // Landing page: buttons that lead to the sign-in card, links to its sections.
    if (e.target.closest("[data-lp-login]")) {
      $("#gateCard").scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => $("#gateEmail").focus({ preventScroll: true }), 400);
    }
    const go = e.target.closest("[data-lp-go], [data-lp-top]");
    if (go) {
      e.preventDefault();
      e.stopPropagation();
      if (go.dataset.lpTop !== undefined) gate.scrollTo({ top: 0, behavior: "smooth" });
      else $(go.getAttribute("href")).scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  // Google sign-in. With a client ID we use Google's own "Sign in with Google" button:
  // it runs on this domain and hands Firebase an ID token, which avoids Firebase's
  // redirect through firebaseapp.com that mobile browsers break (storage partitioning).
  // Without one, fall back to Firebase's popup (fine on desktop).
  $("#gateGoogle").onclick = async () => {
    setError("");
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (err) { setError(friendly(err)); }
  };
  if (googleClientId) {
    loadScript("https://accounts.google.com/gsi/client").then(() => {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setError("");
          try { await signInWithCredential(auth, GoogleAuthProvider.credential(credential)); }
          catch (err) { setError(friendly(err)); }
        },
        ux_mode: "popup",
        use_fedcm_for_button: true,
      });
      const slot = $("#gateGoogleSlot");
      // Measure the slot while it's visible, so the button fits a phone-width card (GIS takes 200–400px).
      $("#gateGoogle").hidden = true;
      slot.hidden = false;
      // The gate may still be hidden (width 0); the card's inner width is then ~viewport − 80 on phones, 357 on desktop.
      const fit = slot.clientWidth || Math.min(357, innerWidth - 80);
      google.accounts.id.renderButton(slot, {
        type: "standard", shape: "pill", size: "large", text: "continue_with", locale: "en",
        theme: matchMedia("(prefers-color-scheme: dark)").matches || document.documentElement.dataset.theme === "dark" ? "filled_black" : "outline",
        width: Math.max(200, Math.min(400, fit)),
      });
    }).catch(() => { /* keep the Firebase popup button */ });
  }
  form.onsubmit = async e => {
    e.preventDefault();
    const email = $("#gateEmail").value.trim(), pw = $("#gatePassword").value;
    if (mode === "up" && pw !== $("#gateConfirm").value) {
      setError("The passwords don't match.");
      $("#gateConfirm").focus();
      return;
    }
    const btn = $("#gateSubmit");
    btn.disabled = true;
    setError("");
    try {
      if (mode === "in") await signInWithEmailAndPassword(auth, email, pw);
      else if (mode === "up") await createUserWithEmailAndPassword(auth, email, pw);
      else {
        await sendPasswordResetEmail(auth, email);
        setError("Check your inbox for a reset link.", true);
      }
    } catch (err) {
      setError(friendly(err));
    }
    btn.disabled = false;
  };
  setMode("in");
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement("script"), { src, async: true, onload: resolve, onerror: reject });
    document.head.append(s);
  });
}

function friendly(err) {
  const map = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/invalid-email": "That doesn't look like an email address.",
    "auth/email-already-in-use": "There's already an account with this email. Sign in instead.",
    "auth/weak-password": "Use at least 6 characters for your password.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
    "auth/popup-closed-by-user": "The Google window was closed before signing in.",
    "auth/network-request-failed": "No connection. Check your internet and try again.",
    "auth/operation-not-allowed": "This sign-in method isn't enabled in Firebase yet.",
    "auth/unauthorized-domain": "This address isn't allowed to sign in yet. Add it under Authentication → Settings → Authorized domains.",
  };
  return map[err.code] || `Something went wrong (${err.code || err.message}).`;
}

function showGate() {
  document.body.classList.remove("locked");
  document.body.classList.add("gated");
  gate.hidden = false;
  // Only on wide screens: on phones the card sits below the intro, and focusing would jump to it.
  if (matchMedia("(min-width: 1001px)").matches) setTimeout(() => $("#gateEmail") && $("#gateEmail").focus({ preventScroll: true }), 50);
}
function hideGate() {
  document.body.classList.remove("locked", "gated");
  gate.hidden = true;
}
function setError(msg, ok = false) {
  const el = $("#gateError");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("ok", ok);
}
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
