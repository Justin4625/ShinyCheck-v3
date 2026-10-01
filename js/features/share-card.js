// Share card: a picture of a logged shiny to post or send (canvas).
import { fmtDate, fmtShort, nf } from "../core/format.js";
import { $, norm } from "../core/util.js";
import { isIOS } from "./app-install.js";
import { altSprite, formText } from "../model/forms.js";
import { GAME_INFO } from "../model/games.js";
import { markOf } from "../model/marks.js";

// s = a shiny log entry plus its game (g) and Pokémon (m). Drawn on a canvas at
// 1080×1350 (4:5, fits Instagram, WhatsApp and Discord without cropping).
export const loadImg = src => new Promise(res => {
  if (!src) return res(null);
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => res(null);
  i.src = src;
});
// Seeded random, so a shiny's card always gets the same sparkles.
export const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Canvas helpers shared by the share card and the Wrapped card: a 1080×1350 canvas
// with the dark background glowing in two colors, the holo frame and the logo.
export async function cardCanvas(glowA, glowB) {
  const W = 1080, H = 1350;
  const c = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const x = c.getContext("2d");
  const F = "'Bricolage Grotesque', system-ui, sans-serif", M = "'JetBrains Mono', ui-monospace, monospace";
  await Promise.all([`800 100px ${F}`, `500 44px ${F}`, `700 24px ${M}`].map(f => document.fonts.load(f).catch(() => {})));

  const HOLO = [["#ff7ad9", 0], ["#ffd36e", .3], ["#7afcff", .62], ["#9d7bff", 1]];
  const holo = (x0, y0, x1, y1) => {
    const gr = x.createLinearGradient(x0, y0, x1, y1);
    HOLO.forEach(([col, o]) => gr.addColorStop(o, col));
    return gr;
  };
  const glow = (cx, cy, r, col) => {
    const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, col);
    gr.addColorStop(1, "transparent");
    x.fillStyle = gr;
    x.fillRect(0, 0, W, H);
  };
  // The app's four-point spark (#spark in index.html), scaled to radius r.
  const spark = (cx, cy, r) => {
    const p = (a, b) => [cx + (a - 50) / 46 * r, cy + (b - 50) / 46 * r];
    x.beginPath();
    x.moveTo(...p(50, 4));
    x.bezierCurveTo(...p(54, 38), ...p(62, 46), ...p(96, 50));
    x.bezierCurveTo(...p(62, 54), ...p(54, 62), ...p(50, 96));
    x.bezierCurveTo(...p(46, 62), ...p(38, 54), ...p(4, 50));
    x.bezierCurveTo(...p(38, 46), ...p(46, 38), ...p(50, 4));
    x.fill();
  };
  const text = (str, px, py, font, fill, align = "left") => {
    x.font = font;
    x.fillStyle = fill;
    x.textAlign = align;
    x.fillText(str, px, py);
  };
  // Largest size (down to min) at which str fits in maxW.
  const fit = (str, weight, size, min, maxW, fam = F) => {
    for (; size > min; size -= 2) {
      x.font = `${weight} ${size}px ${fam}`;
      if (x.measureText(str).width <= maxW) break;
    }
    return `${weight} ${size}px ${fam}`;
  };
  const spaced = px => { if ("letterSpacing" in x) x.letterSpacing = px; };
  const panel = (px, py, w, h, r) => {
    x.fillStyle = "rgba(255,255,255,.07)";
    x.strokeStyle = "rgba(255,255,255,.14)";
    x.lineWidth = 2;
    x.beginPath();
    x.roundRect(px, py, w, h, r);
    x.fill();
    x.stroke();
  };

  x.fillStyle = "#07070d";
  x.fillRect(0, 0, W, H);
  glow(0, 0, 950, glowA);
  glow(W, H, 1000, glowB);
  x.lineWidth = 4;
  x.strokeStyle = holo(0, 0, W, H);
  x.beginPath();
  x.roundRect(28, 28, W - 56, H - 56, 52);
  x.stroke();
  // ShinyCheck logo, top left.
  x.fillStyle = holo(76, 84, 128, 136);
  spark(102, 110, 30);
  x.textBaseline = "middle";
  text("Shiny", 146, 112, `500 44px ${F}`, "#fff");
  const sw = x.measureText("Shiny").width;
  text("Check", 146 + sw, 112, `800 44px ${F}`, "#fff");
  x.textBaseline = "alphabetic";
  const blob = () => new Promise(res => c.toBlob(res, "image/png"));
  return { W, H, x, F, M, HOLO, holo, glow, spark, text, fit, spaced, panel, blob };
}

// What a card says about a catch (also used by the feed's cards, components/post-card.js):
// three stats (encounters, hunt time, odds — or the date for GO / HOME) and a footer line.
export function cardFacts(s) {
  const odds = s.odds && !GAME_INFO[s.g].noOdds;
  const stats = [["ENCOUNTERS", s.count ? nf(s.count) : "—"], ["HUNT TIME", s.time ? fmtShort(s.time) : "—"],
    odds ? ["ODDS", `1/${nf(s.odds)}`] : ["CAUGHT", fmtDate(s.ts)]];
  const ratio = odds && s.count ? s.count / s.odds : 0;
  const luck = ratio ? `${ratio < .01 ? "<0.01" : ratio.toFixed(2)}× odds` : "";
  const foot = [s.method, s.phases ? `after ${s.phases} ${s.phases === 1 ? "phase" : "phases"}` : "", luck, odds ? fmtDate(s.ts) : ""].filter(Boolean);
  return { stats, foot };
}

async function drawShareCard(s) {
  const g = GAME_INFO[s.g], m = s.m;
  const { W, H, x, F, M, HOLO, holo, glow, spark, text, fit, spaced, panel, blob } = await cardCanvas(g.accent + "8c", g.accent2 + "80");
  const mark = markOf(s.mark);
  const [sprite, logo, markImg] = await Promise.all([loadImg(altSprite(m, s.alt)), loadImg(g.logo), mark && loadImg(mark.icon)]);
  const rnd = seeded(m.id * 7919 + (s.ts || 1) % 104729 + 1);
  // Only around the sprite, so they never cover the name or the stats.
  for (let i = 0, n = 0; n < 18 && i < 200; i++) {
    const sx = 70 + rnd() * (W - 140), sy = 180 + rnd() * 660, r = 5 + rnd() * 14, a = .15 + rnd() * .45;
    if (Math.hypot(sx - W / 2, sy - 530) < 320) continue;
    x.globalAlpha = a;
    x.fillStyle = HOLO[n++ % 4][0];
    spark(sx, sy, r);
  }
  x.globalAlpha = 1;

  // Game logo (or name pill), top right.
  x.textBaseline = "middle";
  if (logo) {
    const k = Math.min(300 / logo.width, 100 / logo.height);
    x.drawImage(logo, W - 84 - logo.width * k, 112 - logo.height * k / 2, logo.width * k, logo.height * k);
  } else {
    x.font = `700 26px ${M}`;
    const label = g.abbr || g.name, pw = x.measureText(label).width + 48;
    x.fillStyle = (() => { const gr = x.createLinearGradient(W - 84 - pw, 0, W - 84, 0); gr.addColorStop(0, g.accent); gr.addColorStop(1, g.accent2); return gr; })();
    x.beginPath();
    x.roundRect(W - 84 - pw, 84, pw, 56, 28);
    x.fill();
    text(label, W - 84 - pw / 2, 113, `700 26px ${M}`, "#fff", "center");
  }

  x.textBaseline = "alphabetic";

  // Sprite on a glowing disc with a holo ring.
  const cx = W / 2, cy = 530;
  glow(cx, cy, 330, "rgba(255,255,255,.16)");
  x.lineWidth = 6;
  x.strokeStyle = x.createConicGradient
    ? (() => { const gr = x.createConicGradient(-Math.PI / 2, cx, cy); [...HOLO.map(([col], i) => [col, i / 4]), ["#ff7ad9", 1]].forEach(([col, o]) => gr.addColorStop(o, col)); return gr; })()
    : holo(cx - 300, cy - 300, cx + 300, cy + 300);
  x.beginPath();
  x.arc(cx, cy, 290, 0, Math.PI * 2);
  x.stroke();
  if (sprite) {
    x.imageSmoothingQuality = "high";
    x.shadowColor = g.accent + "aa";
    x.shadowBlur = 70;
    x.drawImage(sprite, cx - 250, cy - 250, 500, 500);
    x.shadowBlur = 0;
    x.shadowColor = "transparent";
  }
  x.fillStyle = holo(cx + 170, cy - 290, cx + 250, cy - 210);
  spark(cx + 215, cy - 245, 38);
  spark(cx - 250, cy + 190, 22);
  // Mark: a badge on the ring, bottom right. The nickname never goes on the card (it's private).
  if (markImg) {
    const bx = cx + 205, by = cy + 205;
    x.fillStyle = "rgba(14,12,28,.82)";
    x.beginPath();
    x.arc(bx, by, 58, 0, Math.PI * 2);
    x.fill();
    x.lineWidth = 4;
    x.strokeStyle = holo(bx - 58, by - 58, bx + 58, by + 58);
    x.stroke();
    x.drawImage(markImg, bx - 40, by - 40, 80, 80);
  }

  // Name, with form and game below.
  x.textBaseline = "alphabetic";
  spaced("6px");
  text("SHINY FOUND", cx, 905, `700 26px ${M}`, holo(cx - 120, 0, cx + 120, 0), "center");
  spaced("0px");
  text(m.name, cx, 1010, fit(m.name, 800, 112, 56, W - 180), "#fff", "center");
  const sub = [formText(m, s.alt), g.name].filter(Boolean).join(" · ").toUpperCase();
  spaced("3px");
  text(sub, cx, 1062, fit(sub, 700, 26, 16, W - 200, M), "rgba(255,255,255,.7)", "center");
  spaced("0px");

  // Stats: encounters, hunt time, odds (or the date for GO / HOME).
  const { stats, foot } = cardFacts(s);
  panel(80, 1100, W - 160, 136, 30);
  const colW = (W - 160) / 3;
  stats.forEach(([label, v], i) => {
    const mx = 80 + colW * (i + .5);
    text(v, mx, 1170, fit(v, 800, 54, 26, colW - 48), "#fff", "center");
    spaced("3px");
    text(label, mx, 1210, `700 18px ${M}`, "rgba(255,255,255,.55)", "center");
    spaced("0px");
  });

  // Footer: how it was found and when; the site on the right.
  spaced("1px");
  text("shinycheck.nl", W - 84, 1290, `700 24px ${M}`, holo(W - 300, 0, W - 84, 0), "right");
  const parts = [...foot];
  x.font = `700 22px ${M}`;
  // Drop the least important parts until the line fits next to the site name.
  while (parts.length > 1 && x.measureText(parts.join(" · ")).width > W - 520) parts.shift();
  text(parts.join(" · "), 84, 1290, `700 22px ${M}`, "rgba(255,255,255,.6)");
  spaced("0px");
  return blob();
}

const shareDlg = $("#shareDlg");
let shareFile = null, shareText = "";
// One shiny's card. showShare takes any card: a title, how to draw it, its file name
// and the text that goes along when shared.
export function openShare(s) {
  const g = GAME_INFO[s.g];
  const slug = norm(`${s.m.name} ${s.m.form && s.m.form !== "Original" ? s.m.form : ""}`).trim().replace(/[^a-z0-9]+/g, "-");
  showShare({
    title: `Shiny ${s.m.name} ✦`, draw: () => drawShareCard(s), file: `shiny-${slug}.png`,
    text: `Shiny ${s.m.name} in ${g.name}${s.count ? ` after ${nf(s.count)} encounters` : ""} ✦ shinycheck.nl`,
  });
}
export async function showShare({ title, draw, file, text }) {
  shareFile = null;
  $("#shareTitle").textContent = title;
  $("#shareImg").removeAttribute("src");
  $("#shareGo").disabled = $("#shareSave").disabled = true;
  shareDlg.hidden = false;
  document.body.classList.add("drawer-open");
  const blob = await draw();
  if (!blob || shareDlg.hidden) return;
  shareFile = new File([blob], file, { type: "image/png" });
  shareText = text;
  URL.revokeObjectURL($("#shareImg").dataset.url || "");
  const url = URL.createObjectURL(blob);
  $("#shareImg").dataset.url = url;
  $("#shareImg").src = url;
  $("#shareImg").alt = shareText;
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [shareFile] }));
  $("#shareGo").hidden = !canShare;
  $("#shareSave").className = canShare ? "rl-again" : "rl-go";
  // iPhone and iPad: a download lands in Files, while the share sheet has "Save Image"
  // for Photos, so Share is the only button there.
  const iosShare = isIOS && canShare;
  $("#shareSave").hidden = iosShare;
  $("#shareHint").hidden = !iosShare;
  $("#shareGo").disabled = $("#shareSave").disabled = false;
}
const closeShare = () => {
  shareDlg.hidden = true;
  if (!document.querySelector(".drawer.open")) document.body.classList.remove("drawer-open");
};
function saveShare() {
  const a = Object.assign(document.createElement("a"), { href: $("#shareImg").src, download: shareFile.name });
  document.body.append(a);
  a.click();
  a.remove();
}

// Wiring: runs once at startup, from main.js.
export function init() {
  shareDlg.addEventListener("click", async e => {
    if (e.target === shareDlg || e.target.closest("[data-shareclose]")) return closeShare();
    if (!shareFile) return;
    if (e.target.closest("#shareSave")) return saveShare();
    if (e.target.closest("#shareGo")) {
      try { await navigator.share({ files: [shareFile], text: shareText }); }
      catch (err) { if (err.name !== "AbortError") { console.error(err); saveShare(); } }
    }
  });
  // On window, so it runs before the Hunt Deck's and Dex Entry's own Escape handlers.
  addEventListener("keydown", e => { if (e.key === "Escape" && !shareDlg.hidden) { e.stopImmediatePropagation(); closeShare(); } }, true);
}
