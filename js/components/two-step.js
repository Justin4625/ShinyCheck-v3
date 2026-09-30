// Two-tap buttons instead of confirm dialogs: the first tap arms, the second acts.
// Two-step buttons instead of confirm dialogs: first tap arms, second tap acts.
let armed = null, armTimer;
export function arm(btn, label) {
  if (armed === btn) return true;
  disarm();
  armed = btn;
  btn.dataset.label = btn.textContent;
  btn.textContent = label;
  btn.classList.add("armed");
  armTimer = setTimeout(disarm, 3000);
  return false;
}
export function disarm() {
  clearTimeout(armTimer);
  if (armed) { armed.textContent = armed.dataset.label; armed.classList.remove("armed"); }
  armed = null;
}
