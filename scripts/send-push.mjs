// Sends a notification to every device that turned them on in ShinyCheck (pushTokens/{token}).
// Run by .github/workflows/notify.yml; needs firebase-admin and FIREBASE_SERVICE_ACCOUNT
// (the service account JSON, kept as a GitHub secret — never commit it).
//   TITLE="Sun & Moon has been added" BODY="…" URL="/sm" node scripts/send-push.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const { FIREBASE_SERVICE_ACCOUNT, TITLE, BODY = "", URL: LINK = "/", DRY_RUN } = process.env;
if (!FIREBASE_SERVICE_ACCOUNT) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
if (!TITLE) throw new Error("TITLE is required");

initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const snap = await db.collection("pushTokens").get();
const tokens = snap.docs.map(d => d.id);
console.log(`${tokens.length} device(s) subscribed`);
if (!tokens.length || DRY_RUN === "true") process.exit(0);

// Data message: sw.js builds the notification itself, the same way on every browser.
const data = { title: TITLE, body: BODY, url: LINK };
let sent = 0, removed = 0, failed = 0;
for (let i = 0; i < tokens.length; i += 500) {
  const batch = tokens.slice(i, i + 500);
  const res = await getMessaging().sendEachForMulticast({ tokens: batch, data, webpush: { headers: { Urgency: "high", TTL: "604800" } } });
  sent += res.successCount;
  await Promise.all(res.responses.map(async (r, j) => {
    if (r.success) return;
    // Uninstalled app, revoked permission or an expired token: forget that device.
    if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"].includes(r.error.code)) {
      await db.collection("pushTokens").doc(batch[j]).delete();
      removed++;
    } else {
      failed++;
      console.warn(r.error.code, r.error.message);
    }
  }));
}
console.log(`Sent to ${sent} · removed ${removed} stale · ${failed} failed`);
if (failed && !sent) process.exit(1);
