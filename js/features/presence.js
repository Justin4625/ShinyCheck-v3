// Presence for the admin dashboard's "Online now": a signed-in device stamps presence/{uid} with the
// server time when the app opens and every few minutes while it's on screen. A hidden tab stops, so a
// trainer drops off "Online now" (services/admin.js, ONLINE_FOR) a few minutes after leaving.
// About 15 writes an hour per trainer with the app open, well within Firestore's free writes.
export const BEAT = 4 * 60 * 1000;

let last = 0, timer = null;
async function beat() {
  const fb = window.Cloud && window.Cloud.fb, user = fb && fb.auth.currentUser;
  if (!user || document.hidden || Date.now() - last < BEAT - 10000) return;
  last = Date.now();
  const { doc, setDoc, serverTimestamp } = fb.fs;
  try { await setDoc(doc(fb.db, "presence", user.uid), { seen: serverTimestamp() }); }
  catch (err) { console.warn("Presence not saved:", err.code || err); }
}

// Wiring: runs once at startup, from main.js.
export function init() {
  addEventListener("cloud:ready", () => {
    last = 0;
    beat();
    clearInterval(timer);
    timer = setInterval(beat, BEAT);
  });
  addEventListener("cloud:user", e => { if (!e.detail) { clearInterval(timer); last = 0; } });
  document.addEventListener("visibilitychange", beat);
}
