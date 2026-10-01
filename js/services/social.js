// Social layer: public profiles, the feed, likes and follows in Firestore (rules in firestore.rules).
// Uses the connection that services/cloud.js opens (window.Cloud.fb) and only works signed in.
//
//   profiles/{uid}        name, @username, picture, public or not, number of shinies
//   usernames/{name}      which trainer has claimed a username (also searched: searchTrainers)
//   collections/{uid}     every logged shiny, for the profile page (features/social-sync.js)
//   posts/{uid_pid}       a catch in the feed, with its like count
//   likes/{liker_postId}  one like
//   follows/{from_to}     one trainer following another (counted for followers / following)
const fb = () => window.Cloud && window.Cloud.fb;
export const myUid = () => (fb() && fb().auth.currentUser && fb().auth.currentUser.uid) || null;
export const available = () => !!myUid();
// Local-only mode (no Firebase config): there are no accounts, so no community either.
export const localOnly = () => !!window.CloudLocal;

// Resolves once someone is signed in (never in local-only mode).
export const whenSignedIn = () => new Promise(res => {
  if (available()) return res();
  const on = () => { if (available()) { removeEventListener("cloud:user", on); res(); } };
  addEventListener("cloud:user", on);
});

const at = t => (t && t.toMillis ? t.toMillis() : Date.now());
const ref = path => fb().fs.doc(fb().db, path);
const col = name => fb().fs.collection(fb().db, name);

// ---------- Profiles ----------
const profiles = new Map(); // uid → Promise<profile | null>, per session
export function profile(uid, fresh = false) {
  if (fresh || !profiles.has(uid)) {
    profiles.set(uid, fb().fs.getDoc(ref(`profiles/${uid}`))
      .then(s => (s.exists() ? { uid, ...s.data(), joined: at(s.data().createdAt) } : null))
      .catch(err => { profiles.delete(uid); throw err; }));
  }
  return profiles.get(uid);
}
export const profilesOf = async uids => new Map(await Promise.all([...new Set(uids)].map(async u => [u, await profile(u).catch(() => null)])));

// The signed-in trainer's profile, created on first use: the account's name (never the email),
// Google photo and a free username made from the name, public by default.
let making = null; // one creation at a time (the sync, a like and a follow can all ask at once)
export function myProfile() {
  const uid = myUid();
  return (making && making.uid === uid ? making : (making = Object.assign(getOrMake().finally(() => { making = null; }), { uid })));
}
async function getOrMake() {
  const user = fb().auth.currentUser, uid = user.uid;
  const p = await profile(uid);
  if (p) return p;
  const { writeBatch, serverTimestamp } = fb().fs;
  const photo = /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//.test(user.photoURL || "") ? user.photoURL.slice(0, 500) : "";
  const name = (user.displayName || "").trim().slice(0, 30) || `Trainer ${uid.slice(0, 4).toUpperCase()}`;
  const base = cleanUsername(name).slice(0, 15).replace(/^[._]+|[._]+$/g, "") || "trainer";
  for (let i = 0; ; i++) {
    const username = `${base.length < 3 ? "trainer" : base}${String(Math.floor(1000 + Math.random() * 9000))}`;
    const b = writeBatch(fb().db);
    b.set(ref(`usernames/${username}`), { uid });
    b.set(ref(`profiles/${uid}`), { name, username, photo, avatar: "", public: true, shinies: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    try { await b.commit(); break; } catch (err) { if (i >= 3) throw err; } // taken: try other digits
  }
  const made = await profile(uid, true);
  dispatchEvent(new CustomEvent("social:profile", { detail: made }));
  return made;
}

// ---------- Usernames ----------
export const USERNAME = /^[a-z0-9_.]{3,20}$/;
export const cleanUsername = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-z0-9_.]/g, "");
const byName = new Map(); // username → uid, per session
export async function uidOfUsername(name) {
  if (!byName.has(name)) {
    const s = await fb().fs.getDoc(ref(`usernames/${name}`));
    byName.set(name, s.exists() ? s.data().uid : null);
  }
  return byName.get(name);
}
// Free, or already yours.
export async function usernameFree(name) {
  const s = await fb().fs.getDoc(ref(`usernames/${name}`));
  return !s.exists() || s.data().uid === myUid();
}
// Claims the new username and lets go of the old one, in one batch (the rules check both).
export async function setUsername(name) {
  const { writeBatch, serverTimestamp } = fb().fs;
  const me = await myProfile();
  if (name === me.username) return me;
  const b = writeBatch(fb().db);
  b.set(ref(`usernames/${name}`), { uid: me.uid });
  b.update(ref(`profiles/${me.uid}`), { username: name, updatedAt: serverTimestamp() });
  if (me.username) b.delete(ref(`usernames/${me.username}`));
  try { await b.commit(); }
  catch (err) { throw err.code === "permission-denied" ? Object.assign(new Error("taken"), { code: "taken" }) : err; }
  byName.set(name, me.uid);
  if (me.username) byName.delete(me.username);
  return profile(me.uid, true);
}
// Trainers whose @username or name starts with the text, at most `max`. Usernames are lowercase; names are
// matched as typed, in lowercase and with a capital first letter (Firestore can't compare without case).
export async function searchTrainers(text, max = 20) {
  const { query, where, orderBy, startAt, endAt, limit, getDocs, documentId } = fb().fs;
  const raw = text.trim().replace(/^@/, ""), user = cleanUsername(raw), END = "\uf8ff";
  const names = [...new Set([raw, raw.toLowerCase(), raw.charAt(0).toUpperCase() + raw.slice(1)])].filter(Boolean);
  const [byUser, ...byNames] = await Promise.all([
    user ? getDocs(query(col("usernames"), orderBy(documentId()), startAt(user), endAt(user + END), limit(max))) : null,
    ...names.map(n => getDocs(query(col("profiles"), orderBy("name"), startAt(n), endAt(n + END), limit(max)))),
  ]);
  const found = new Map();
  for (const snap of byNames) for (const d of snap.docs) found.set(d.id, { uid: d.id, ...d.data(), joined: at(d.data().createdAt) });
  const rest = byUser ? byUser.docs.map(d => d.data().uid).filter(u => !found.has(u)) : [];
  for (const [u, p] of await profilesOf(rest)) if (p) found.set(u, p);
  // Usernames that start with the text first, then by name.
  const starts = p => (p.username || "").startsWith(user) ? 0 : 1;
  return [...found.values()].sort((a, b) => starts(a) - starts(b) || a.name.localeCompare(b.name)).slice(0, max);
}
export async function saveProfile(patch) {
  const { updateDoc, serverTimestamp } = fb().fs;
  await updateDoc(ref(`profiles/${myUid()}`), { ...patch, updatedAt: serverTimestamp() });
  const p = await profile(myUid(), true);
  dispatchEvent(new CustomEvent("social:profile", { detail: p }));
  return p;
}

// ---------- Posts and collections ----------
const toPost = d => ({ id: d.id, ...d.data(), at: at(d.data().createdAt) });
export const PAGE = 20;
// Newest catches of everyone, or of the given trainers (at most 30: Firestore's "in" limit).
export async function feed({ uids = null, after = null } = {}) {
  const { query, where, orderBy, startAfter, limit, getDocs } = fb().fs;
  const parts = [col("posts")];
  if (uids) parts.push(where("uid", "in", uids.slice(0, 30)));
  parts.push(orderBy("createdAt", "desc"));
  if (after) parts.push(startAfter(after));
  parts.push(limit(PAGE));
  const snap = await getDocs(query(...parts));
  return { posts: snap.docs.map(toPost), last: snap.docs.at(-1) || null, more: snap.size === PAGE };
}
// All catches of one trainer, newest first (sorted here, so no extra index is needed).
export async function postsOf(uid) {
  const { query, where, getDocs } = fb().fs;
  const snap = await getDocs(query(col("posts"), where("uid", "==", uid)));
  return snap.docs.map(toPost).sort((a, b) => b.at - a.at);
}
export async function collectionOf(uid) {
  const s = await fb().fs.getDoc(ref(`collections/${uid}`));
  return s.exists() ? s.data().list || [] : [];
}

// ---------- Likes ----------
// Which of these posts the signed-in trainer liked.
export async function likedOf(posts) {
  const me = myUid();
  const got = await Promise.all(posts.map(p => fb().fs.getDoc(ref(`likes/${me}_${p.id}`)).then(s => s.exists() && p.id).catch(() => false)));
  return new Set(got.filter(Boolean));
}
// Like or unlike: the like document and the post's count change together (the rules check that).
export async function setLike(post, on) {
  await myProfile(); // so the owner can see who liked it
  const { writeBatch, increment, serverTimestamp } = fb().fs;
  const me = myUid(), b = writeBatch(fb().db), like = ref(`likes/${me}_${post.id}`);
  if (on) b.set(like, { uid: me, post: post.id, owner: post.uid, createdAt: serverTimestamp() });
  else b.delete(like);
  b.update(ref(`posts/${post.id}`), { likes: increment(on ? 1 : -1) });
  await b.commit();
}

// ---------- Follows ----------
let following = null; // uids the signed-in trainer follows, newest first (per session)
export async function myFollowing() {
  if (!following) following = (await followsOf(myUid(), "from")).map(f => f.to);
  return following;
}
export const isFollowing = async uid => (await myFollowing()).includes(uid);
export async function setFollow(uid, on) {
  await myProfile(); // so the followed trainer can see who you are
  const { setDoc, deleteDoc, serverTimestamp } = fb().fs;
  const me = myUid(), r = ref(`follows/${me}_${uid}`);
  if (on) await setDoc(r, { from: me, to: uid, createdAt: serverTimestamp() });
  else await deleteDoc(r);
  const list = await myFollowing();
  following = on ? [uid, ...list.filter(u => u !== uid)] : list.filter(u => u !== uid);
  dispatchEvent(new CustomEvent("social:follow", { detail: { uid, on } }));
}
// Follow documents where `field` ("from" or "to") is this trainer, newest first.
async function followsOf(uid, field) {
  const { query, where, getDocs } = fb().fs;
  const snap = await getDocs(query(col("follows"), where(field, "==", uid)));
  return snap.docs.map(d => ({ ...d.data(), at: at(d.data().createdAt) })).sort((a, b) => b.at - a.at);
}
export const followersOf = async uid => (await followsOf(uid, "to")).map(f => f.from);
export const followingOf = async uid => (await followsOf(uid, "from")).map(f => f.to);
export async function followCounts(uid) {
  const { query, where, getCountFromServer } = fb().fs;
  const count = field => getCountFromServer(query(col("follows"), where(field, "==", uid))).then(s => s.data().count);
  const [followers, followingN] = await Promise.all([count("to"), count("from")]);
  return { followers, following: followingN };
}
// Live list of who follows the signed-in trainer (for notifications). Returns the unsubscribe.
export function watchFollowers(cb) {
  const { query, where, onSnapshot } = fb().fs;
  return onSnapshot(query(col("follows"), where("to", "==", myUid())), snap => {
    cb(snap.docs.map(d => ({ uid: d.data().from, at: at(d.data().createdAt) })).sort((a, b) => b.at - a.at));
  }, err => console.warn("Followers not loaded:", err.code || err));
}

// Live list of likes on the signed-in trainer's posts by others (for notifications), newest first.
// One equality filter, sorted here, so no extra index is needed. Returns the unsubscribe.
export function watchLikes(cb) {
  const { query, where, onSnapshot } = fb().fs, me = myUid();
  return onSnapshot(query(col("likes"), where("owner", "==", me)), snap => {
    cb(snap.docs.map(d => ({ uid: d.data().uid, post: d.data().post, at: at(d.data().createdAt) }))
      .filter(l => l.uid !== me).sort((a, b) => b.at - a.at));
  }, err => console.warn("Likes not loaded:", err.code || err));
}

// ---------- Writing your own posts (used by features/social-sync.js) ----------
export async function myPostIds() {
  return new Map((await postsOf(myUid())).map(p => [p.id, p]));
}
export async function writePost(id, data, isNew) {
  const { setDoc, updateDoc, deleteField, Timestamp } = fb().fs;
  if (isNew) {
    const { postedAt, ...rest } = data;
    return setDoc(ref(`posts/${id}`), { ...rest, uid: myUid(), likes: 0, createdAt: Timestamp.fromMillis(Math.min(postedAt, Date.now())) });
  }
  const { postedAt, ...rest } = data;
  // Optional fields that were removed from the catch are removed from the post too.
  const gone = Object.fromEntries(["alt", "odds", "method", "phases"].filter(k => !(k in rest)).map(k => [k, deleteField()]));
  return updateDoc(ref(`posts/${id}`), { ...rest, ...gone });
}
export const deletePost = id => fb().fs.deleteDoc(ref(`posts/${id}`));
export async function writeCollection(list) {
  const { setDoc, serverTimestamp } = fb().fs;
  return setDoc(ref(`collections/${myUid()}`), { list, updatedAt: serverTimestamp() });
}
export const deleteCollection = () => fb().fs.deleteDoc(ref(`collections/${myUid()}`));
