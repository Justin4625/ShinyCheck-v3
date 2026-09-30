// Shiny-locked / event-only chip and note.
import { shinyStatus } from "../model/availability.js";

const ICONS = {
  locked: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  event: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="12" rx="2"/><path d="M12 9v12M4 13h16M12 9C10 5 6 5 7 8s5 1 5 1zm0 0c2-4 6-4 5-1s-5 1-5 1z"/></svg>',
};
export const statusChip = (m, gid) => {
  const s = shinyStatus(m, gid);
  return s ? `<span class="status-chip ${s.kind}" title="${s.label} — ${s.note}">${ICONS[s.kind]}</span>` : "";
};
export const statusNote = (m, gid) => {
  const s = shinyStatus(m, gid);
  return s ? `<div class="status-note ${s.kind}">${ICONS[s.kind]}<span><b>${s.label}</b> ${s.note}</span></div>` : "";
};
