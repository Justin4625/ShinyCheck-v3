// Sparkle burst animation.
// Drawn in a fixed layer on top of the page so the card's paint containment doesn't clip it.
export function burst(cardEl) {
  const r = cardEl.getBoundingClientRect();
  const b = document.createElement("span");
  b.className = "burst";
  b.style.left = r.left + r.width / 2 + "px";
  b.style.top = r.top + r.height * .42 + "px";
  const fills = ["#ff7ad9", "#ffd36e", "#7afcff", "#9d7bff"];
  b.innerHTML = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + Math.random() * .4, d = 55 + Math.random() * 35;
    return `<svg viewBox="0 0 100 100" style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px"><use href="#spark" fill="${fills[i % 4]}"/></svg>`;
  }).join("");
  document.body.append(b);
  setTimeout(() => b.remove(), 800);
}
