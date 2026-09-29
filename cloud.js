// Accounts + cloud sync (Firebase Auth + Firestore).
// The app keeps working from localStorage; this module mirrors that state into one
// Firestore document per account (users/{uid}) and pulls changes from other devices.
// Load the config with the same ?v= cache-busting version as this module.
const { firebaseConfig, googleClientId, appCheckSiteKey } = await import(`./firebase-config.js${new URL(import.meta.url).search}`);

const $ = s => document.querySelector(s);
const gate = $("#gate");
const account = $("#account");

if (!firebaseConfig) {
  // Local-only mode: no login, everything stays in this browser.
  account.innerHTML = `<span class="acc-local" title="Add your Firebase config in firebase-config.js to enable accounts">Local mode · not synced</span>`;
} else {
  start().catch(err => {
    console.error(err);
    showGate();
    setError("Couldn't reach the login service. Check your connection and reload.");
  });
}

async function start() {
  document.body.classList.add("locked");
  const V = "12.19.0";
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

  const OWNER = "shinycheck-v3-owner";
  let ref = null, unsub = null, first = true;
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
  };

  async function flush() {
    clearTimeout(timer);
    if (!ref || !dirty) return;
    dirty = false;
    lastWrite = Date.now();
    lastRev = Math.random().toString(36).slice(2);
    setStatus("saving");
    try {
      await setDoc(ref, { ...window.ShinyApp.snapshot(), rev: lastRev, updatedAt: serverTimestamp() });
      setStatus("saved");
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
        if (data.rev !== lastRev) window.ShinyApp.applyData(data, { quiet: true });
      }
      localStorage.setItem(OWNER, user.uid);
      first = false;
      setStatus("saved");
    }, err => {
      console.error(err);
      setStatus("error");
    });
  });

  // ---------- Account UI ----------
  function renderAccount(user) {
    if (!user) { account.innerHTML = ""; return; }
    const name = user.displayName || user.email || "Trainer";
    account.innerHTML = `
      <div class="acc">
        ${user.photoURL ? `<img class="acc-avatar" src="${user.photoURL}" alt="" referrerpolicy="no-referrer">`
          : `<span class="acc-avatar">${name[0].toUpperCase()}</span>`}
        <span class="acc-text"><b>${escapeHtml(name)}</b><small id="syncStatus">Synced</small></span>
        <button class="acc-out" id="signOut" title="Sign out">Sign out</button>
      </div>`;
    $("#signOut").onclick = async () => {
      await flush();
      await signOut(auth);
      // Don't leave this account's progress behind for the next person on this browser.
      window.ShinyApp.applyData({}, { quiet: true });
      localStorage.removeItem(OWNER);
    };
  }

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
      google.accounts.id.renderButton(slot, {
        type: "standard", shape: "pill", size: "large", text: "continue_with", locale: "en",
        theme: matchMedia("(prefers-color-scheme: dark)").matches || document.documentElement.dataset.theme === "dark" ? "filled_black" : "outline",
        width: Math.min(360, slot.clientWidth || 360),
      });
      $("#gateGoogle").hidden = true;
      slot.hidden = false;
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
  setTimeout(() => $("#gateEmail") && $("#gateEmail").focus(), 50);
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
