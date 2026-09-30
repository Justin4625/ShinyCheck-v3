// Opening and closing the centred dialogs (the .roulette overlay style): closes on the
// backdrop, on [data-dlgclose] and on Escape.
const open = new Set();
export function openDlg(dlg) {
  dlg.hidden = false;
  open.add(dlg);
  document.body.classList.add("drawer-open");
  const focus = dlg.querySelector("[autofocus]");
  if (focus && matchMedia("(pointer: fine)").matches) setTimeout(() => focus.focus(), 50);
}
export function closeDlg(dlg) {
  dlg.hidden = true;
  open.delete(dlg);
  if (!open.size && !document.querySelector(".drawer.open")) document.body.classList.remove("drawer-open");
}
export function wireDlg(dlg) {
  dlg.addEventListener("click", e => {
    if (e.target === dlg || e.target.closest("[data-dlgclose]")) closeDlg(dlg);
  });
  addEventListener("keydown", e => {
    if (e.key === "Escape" && !dlg.hidden) { e.stopImmediatePropagation(); closeDlg(dlg); }
  }, true);
}
