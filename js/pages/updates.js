// What's new page (/updates): the update log.
import { renderSidebar } from "../components/sidebar.js";
import { $, esc } from "../core/util.js";
import { UPDATES, fmtDay, markSeen, rich, wnAction, wnShot, wnSteps } from "../features/whats-new.js";

export function renderUpdates() {
  $("#wnList").innerHTML = UPDATES.map((u, i) => `<li class="wn-item ${u.shot ? "has-shot" : ""}">
        <div class="wn-text">
          <p class="wn-date">${i === 0 ? `<span class="wn-new">New</span>` : ""}<time datetime="${u.date}">${fmtDay(u.date)}</time></p>
          <h3>${esc(u.title)}</h3>
          <p class="wn-desc">${rich(u.text)}</p>
          ${wnSteps(u)}
          ${wnAction(u, "wn-go")}
        </div>
        ${wnShot(u)}
      </li>`).join("");
  markSeen();
  renderSidebar();
}
