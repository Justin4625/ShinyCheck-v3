// Toast message at the bottom, optionally with an action (e.g. Undo).
import { el } from "../core/state.js";

let toastTimer;
// Optional action (e.g. Undo) shows as a button and keeps the toast up a little longer.
export function toast(msg, action, ms) {
  el.toast.textContent = msg;
  if (action) {
    const b = Object.assign(document.createElement("button"), { className: "toast-action", textContent: action.label });
    b.onclick = () => { el.toast.classList.remove("show"); action.run(); };
    el.toast.append(b);
  }
  el.toast.classList.toggle("has-action", !!action);
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), ms || (action ? 6000 : 2400));
}
