// ShinyCheck's owner: the social links (OWNER_SOCIALS in core/config.js) as a footer under every page and the
// landing page ([data-owner-foot]), and the Owner badge + links on the owner's profile (pages/profile.js).
import { OWNER_SOCIALS, OWNER_UID } from "../core/config.js";
import { esc } from "../core/util.js";

const ICONS = {
  instagram: `<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>`,
  x: `<path d="M4 4h4.6L20 20h-4.6z"/><path d="M19.6 4l-6.4 7.2M10.8 12.8L4.4 20"/>`,
  tiktok: `<path d="M14 3.5v11.2a3.7 3.7 0 11-3.7-3.7"/><path d="M14 3.5c.4 2.7 2.2 4.4 5 4.7"/>`,
};
const icon = net => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[net]}</svg>`;

export const isOwner = uid => !!uid && uid === OWNER_UID;

// One pill link per account: icon + @handle, opening the network in a new tab.
export const ownerLinks = () => `<ul class="owner-links">${OWNER_SOCIALS.map(s =>
  `<li><a class="owner-link" href="${esc(s.url)}" target="_blank" rel="noopener me" aria-label="${esc(`${s.label}: @${s.handle}`)}" title="${esc(s.label)}">${icon(s.net)}<span>@${esc(s.handle)}</span></a></li>`).join("")}</ul>`;

export const ownerBadge = () => `<span class="owner-badge"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#spark" fill="url(#holo)"/></svg>ShinyCheck owner</span>`;

// Wiring: runs once at startup, from main.js.
export function init() {
  if (!OWNER_SOCIALS.length) return;
  for (const n of document.querySelectorAll("[data-owner-foot]")) {
    n.innerHTML = `<p class="owner-foot-text">Made by Justin, the trainer behind ShinyCheck. Follow along:</p>${ownerLinks()}`;
  }
}
