// Game tiles to choose where a shiny was caught.
import { esc } from "../core/util.js";
import { GAME_INFO } from "../model/games.js";

// Game picker for manual adds: tiles grouped into the main series (games this form is in)
// and places that also count (GO, HOME), newest first. A filter appears once the list
// grows, so adding games later only means adding them to GAME_INFO.
export function gamePicker(ids, selected) {
  const tile = gid => {
    const g = GAME_INFO[gid];
    return `<label class="gp-tile" style="--accent:${g.accent};--accent2:${g.accent2}" data-name="${esc(g.name.toLowerCase())}">
        <input type="radio" name="game" value="${gid}" ${gid === selected ? "checked" : ""}>
        <span class="gp-bar"></span><b>${esc(g.name)}</b><small>${(g.released || "").slice(0, 4)}</small>
      </label>`;
  };
  const byNewest = list => list.sort((x, y) => (GAME_INFO[y].released || "").localeCompare(GAME_INFO[x].released || ""));
  const groups = [
    ["Main series", byNewest(ids.filter(g => !GAME_INFO[g].logOnly))],
    ["Also counts", byNewest(ids.filter(g => GAME_INFO[g].logOnly))],
  ].filter(([, list]) => list.length);
  return `<div class="game-pick" role="radiogroup" aria-label="Game">
      <div class="gp-head"><span>Game</span>${ids.length > 6 ? `<input type="search" class="gp-filter" placeholder="Filter games…" aria-label="Filter games">` : ""}</div>
      ${groups.map(([title, list]) => `<div class="gp-group"><p class="gp-title">${title}</p><div class="gp-grid">${list.map(tile).join("")}</div></div>`).join("")}
      <p class="gp-empty" hidden>No game matches.</p>
    </div>`;
}
