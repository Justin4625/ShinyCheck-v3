// What you can do with a post card (components/post-card.js) on the feed and on profiles:
// like or unlike it (the heart, or double-tap the Pokémon), and open its share card.
import { burst } from "../components/burst.js";
import { postShiny } from "../components/post-card.js";
import { toast } from "../components/toast.js";
import { nf } from "../core/format.js";
import { openShare } from "./share-card.js";
import * as social from "../services/social.js";

// Every post on screen by id, and which of them the signed-in trainer liked.
const known = new Map(), liked = new Set();
export function remember(posts, likedIds) {
  for (const p of posts) known.set(p.id, p);
  for (const id of likedIds) liked.add(id);
}
export const isLiked = id => liked.has(id);

const busy = new Set();
async function toggleLike(postEl, on) {
  const p = known.get(postEl.dataset.post);
  if (!p || busy.has(p.id) || liked.has(p.id) === on) return;
  busy.add(p.id);
  // Optimistic: every card of this post (feed and profile) updates at once.
  const paint = () => document.querySelectorAll(`.post[data-post="${CSS.escape(p.id)}"] .post-like`).forEach(b => {
    b.classList.toggle("on", liked.has(p.id));
    b.setAttribute("aria-pressed", liked.has(p.id));
    b.querySelector("span").textContent = nf(Math.max(0, p.likes || 0));
  });
  on ? liked.add(p.id) : liked.delete(p.id);
  p.likes = (p.likes || 0) + (on ? 1 : -1);
  paint();
  try {
    await social.setLike(p, on);
  } catch (err) {
    console.warn("Like not saved:", err.code || err);
    on ? liked.delete(p.id) : liked.add(p.id);
    p.likes += on ? -1 : 1;
    paint();
    toast("Couldn't save that like. Check your connection.");
  }
  busy.delete(p.id);
}

let lastTap = { el: null, t: 0 };
// Wiring for one list of post cards (a page calls this once for its container).
export function wirePosts(root) {
  root.addEventListener("click", e => {
    const postEl = e.target.closest(".post");
    if (!postEl) return;
    const like = e.target.closest("[data-like]");
    if (like) {
      const on = !liked.has(postEl.dataset.post);
      if (on) burst(like);
      return toggleLike(postEl, on);
    }
    if (e.target.closest("[data-post-share]")) {
      const s = postShiny(known.get(postEl.dataset.post) || {});
      return s && openShare(s);
    }
    const stage = e.target.closest("[data-like-tap]");
    if (stage) {
      const now = Date.now();
      if (lastTap.el === stage && now - lastTap.t < 350) {
        lastTap = { el: null, t: 0 };
        burst(stage);
        stage.classList.remove("pop");
        void stage.offsetWidth;
        stage.classList.add("pop");
        toggleLike(postEl, true);
      } else lastTap = { el: stage, t: now };
    }
  });
}
