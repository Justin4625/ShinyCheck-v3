// Type icons and the sparkle icon.
import { cap } from "../core/util.js";

export const typeImgs = m => m.types.map(t => `<img src="types/${t}.png" alt="${cap(t)}" title="${cap(t)}">`).join("");
export const sparkSvg = (cls = "", fill = "url(#holo)") => `<svg class="${cls}" viewBox="0 0 100 100"><use href="#spark" fill="${fill}"/></svg>`;
