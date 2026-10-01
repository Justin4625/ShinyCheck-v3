// A catch in the feed or on a profile: the same facts as the share card, with the trainer on top
// and a like button. Double-tapping the Pokémon likes it too (features/feed-actions.js).
import { avatar, monByKey, trainerHref } from "./avatar.js";
import { fmtAgo, nf } from "../core/format.js";
import { esc } from "../core/util.js";
import { cardFacts } from "../features/share-card.js";
import { altSprite, formText } from "../model/forms.js";
import { GAME_INFO } from "../model/games.js";
import { markOf } from "../model/marks.js";

// A post as a shiny log entry (what the share card and cardFacts take).
export function postShiny(p) {
  const m = monByKey(p.key);
  return m && GAME_INFO[p.g] ? { count: p.count, time: p.time, odds: p.odds, method: p.method, phases: p.phases, alt: p.alt, mark: p.mark, ts: p.ts, g: p.g, m } : null;
}

const SHARE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1"/></svg>`;

// The catch itself: sprite, name, form and game, and the share card's facts.
function catchBody(s, g, likeTap) {
  const { stats, foot } = cardFacts(s), sub = [formText(s.m, s.alt), g.name].filter(Boolean).join(" · ");
  return `<div class="post-stage" ${likeTap ? `data-like-tap title="Double-tap to like"` : ""}>
        <img src="${altSprite(s.m, s.alt)}" alt="Shiny ${esc(s.m.name)}" loading="lazy" decoding="async">
      </div>
      <p class="post-kicker">Shiny found</p>
      <h3 class="post-name">${esc(s.m.name)}</h3>
      <p class="post-sub">${esc(sub)}</p>
      ${markOf(s.mark) ? `<p class="post-mark"><img src="${markOf(s.mark).icon}" alt=""><span>${esc(markOf(s.mark).n)} <small>· ${esc(markOf(s.mark).title)}</small></span></p>` : ""}
      <dl class="post-stats">${stats.map(([k, v]) => `<div><dd>${esc(v)}</dd><dt>${k.toLowerCase()}</dt></div>`).join("")}</dl>
      ${foot.length ? `<p class="post-foot">${esc(foot.join(" · "))}</p>` : ""}`;
}

// `mine`: only your own catches get a share button; other trainers' shinies aren't yours to share.
export function postCard(p, author, liked, mine) {
  const s = postShiny(p);
  if (!s) return "";
  const g = GAME_INFO[p.g];
  const name = (author && author.name) || "Trainer";
  return `<article class="post" data-post="${esc(p.id)}" style="--accent:${g.accent};--accent2:${g.accent2}">
      <header class="post-head">
        <a class="post-who" href="${esc(trainerHref(p.uid, author))}">${avatar(author)}<span><b>${esc(name)}</b><small>${author && author.username ? `@${esc(author.username)} · ` : ""}${fmtAgo(p.at)}</small></span></a>
        ${g.logo ? `<img class="post-logo" src="${g.logo}" alt="${esc(g.name)}" title="${esc(g.name)}">` : `<span class="post-game">${esc(g.abbr || g.name)}</span>`}
      </header>
      ${catchBody(s, g, true)}
      <footer class="post-actions">
        <button class="post-like ${liked ? "on" : ""}" data-like aria-pressed="${!!liked}" aria-label="Like">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.6a4.3 4.3 0 017.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>
          <span>${nf(p.likes || 0)}</span>
        </button>
        ${mine ? `<button class="post-share" data-post-share aria-label="Share card">${SHARE_ICON}</button>` : ""}
      </footer>
    </article>`;
}

// A logged shiny in a trainer's Collection tab (collections/{uid}): the same card without trainer or likes,
// with its dex number and, on your own profile, a share button. `i` finds the shiny again (features/profile-collection.js).
export const collectionShiny = c => {
  const m = monByKey(c.k);
  return m && GAME_INFO[c.g] ? { count: c.c, time: c.t, odds: c.o, method: c.m, alt: c.a, mark: c.mk, ts: c.ts, g: c.g, m } : null;
};
export function collectionCard(c, i, mine) {
  const s = collectionShiny(c);
  if (!s) return "";
  const g = GAME_INFO[c.g];
  return `<article class="post pc-card" style="--accent:${g.accent};--accent2:${g.accent2}">
      <header class="post-head">
        ${g.logo ? `<img class="post-logo" src="${g.logo}" alt="${esc(g.name)}" title="${esc(g.name)}">` : `<span class="post-game">${esc(g.abbr || g.name)}</span>`}
        <span class="pc-dex">#${String(+s.m.dex).padStart(4, "0")}</span>
      </header>
      ${catchBody(s, g, false)}
      <footer class="post-actions">
        ${mine ? `<button class="post-share" data-pc-share="${i}" aria-label="Share card">${SHARE_ICON}</button>` : ""}
      </footer>
    </article>`;
}
