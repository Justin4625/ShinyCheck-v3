// Stats page (/stats): Shiny Wrapped highlights, charts and the Wrapped share card.
import { chartTips, tipAttr } from "../components/chart-tip.js";
import { renderSidebar } from "../components/sidebar.js";
import { shiniesOf } from "../core/collection.js";
import { LOG_GAMES } from "../core/config.js";
import { fmtDate, fmtShort, nf } from "../core/format.js";
import { $, esc } from "../core/util.js";
import { openEntry } from "../features/dex-entry.js";
import { cardCanvas, loadImg, seeded, showShare } from "../features/share-card.js";
import { mons } from "../model/dex.js";
import { GAME_INFO } from "../model/games.js";

// Luck = encounters ÷ odds (the app's "× odds"); only for shinies with both, so GO,
// HOME and manual adds without encounters count as shinies but not toward luck.
let statsYear = "all";
const yearOf = s => s.ts ? new Date(s.ts).getFullYear() : null;
const luckOf = s => s.count && s.odds && !GAME_INFO[s.g].noOdds ? s.count / s.odds : null;
const fmtLuck = r => `${r < .01 ? "<0.01" : r < 10 ? r.toFixed(2) : r.toFixed(1)}×`;
// "Wild · Shiny Charm · Phase 2" → "Wild"; GO / HOME have no method, so their name.
const baseMethod = s => (s.method || "").split(" · ")[0] || (GAME_INFO[s.g].logOnly ? GAME_INFO[s.g].name : "Not tracked");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function statsFor(list) {
  const hunted = list.filter(s => luckOf(s) != null), lucks = hunted.map(luckOf);
  const most = (arr, f) => arr.length ? arr.reduce((a, b) => f(b) > f(a) ? b : a) : null;
  const withTime = list.filter(s => s.time);
  const games = LOG_GAMES.map(g => ({ g, list: list.filter(s => s.g === g) })).filter(x => x.list.length).sort((a, b) => b.list.length - a.list.length);
  return {
    list, n: list.length, games, hunted: lucks.length,
    enc: list.reduce((t, s) => t + (s.count || 0), 0),
    time: list.reduce((t, s) => t + (s.time || 0), 0),
    species: new Set(list.map(s => s.m.dex)).size,
    under: lucks.length ? lucks.filter(r => r < 1).length / lucks.length : null,
    luckiest: most(hunted, s => -luckOf(s)),
    grind: most(list.filter(s => s.count), s => s.count),
    quickest: most(withTime.filter(s => s.count), s => -s.time),
    longest: most(withTime, s => s.time),
    latest: most(list.filter(s => s.ts), s => s.ts),
  };
}

const plural = (n, one, many = one + "s") => `${nf(n)} ${n === 1 ? one : many}`;

export function renderStats() {
  const all = mons.flatMap(shiniesOf);
  const years = [...new Set(all.map(yearOf).filter(Boolean))].sort((a, b) => b - a);
  if (statsYear !== "all" && !years.includes(statsYear)) statsYear = "all";
  const list = statsYear === "all" ? all : all.filter(s => yearOf(s) === statsYear);
  const st = statsFor(list), period = statsYear === "all" ? "All time" : String(statsYear);

  $("#stTitle").textContent = statsYear === "all" ? "Your shiny story" : `Your ${statsYear} in shinies`;
  $("#stYears").innerHTML = ["all", ...years].map(y => `<button class="seg ${statsYear === y ? "active" : ""}" role="tab" aria-selected="${statsYear === y}" data-year="${y}">${y === "all" ? "All time" : y}</button>`).join("");
  $("#stYears").hidden = !years.length;
  $("#stShare").hidden = !st.n;
  $("#stSub").innerHTML = st.n
    ? `<b>${plural(st.n, "shiny", "shinies")}</b> of <b>${plural(st.species, "species", "species")}</b> across <b>${plural(st.games.length, "game")}</b>${statsYear === "all" ? "" : ` in ${statsYear}`}.`
      + (st.under != null ? ` <b>${Math.round(st.under * 100)}%</b> came before hitting the odds.` : "")
    : "No shinies logged yet. Hit Gotcha! in a hunt or add one from the Shiny Dex, and your stats show up here.";
  $("#stStats").innerHTML = [
    [nf(st.n), "Shinies"], [st.enc ? nf(st.enc) : "—", "Encounters"], [st.time ? fmtShort(st.time) : "—", "Hunt time"],
  ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
  if (!st.n) { $("#stBody").innerHTML = ""; return renderSidebar(); }

  // Highlights: a card per record, each opens the Pokémon's Dex Entry.
  const hl = (label, s, value, detail) => {
    if (!s) return "";
    const g = GAME_INFO[s.g];
    return `<button class="st-hl" data-entry="${s.m.id}" style="--accent:${g.accent};--accent2:${g.accent2}">
        <span class="st-hl-label">${label}</span>
        <span class="st-hl-img">${s.m.sprite ? `<img src="${s.m.sprite}" alt="" loading="lazy">` : ""}</span>
        <b class="st-hl-value">${value}</b>
        <span class="st-hl-name">${esc(s.m.name)}${s.m.form && s.m.form !== "Original" ? ` <em>${esc(s.m.form)}</em>` : ""}</span>
        <small>${detail}</small>
      </button>`;
  };
  const gName = s => esc(GAME_INFO[s.g].short || GAME_INFO[s.g].name);
  const highlights = [
    hl("Luckiest", st.luckiest, `${fmtLuck(luckOf(st.luckiest || {}) || 0)} odds`, st.luckiest && `${nf(st.luckiest.count)} enc. at 1/${nf(st.luckiest.odds)} · ${gName(st.luckiest)}`),
    hl("Longest grind", st.grind, `${nf(st.grind ? st.grind.count : 0)} enc.`, st.grind && `${st.grind.time ? fmtShort(st.grind.time) + " · " : ""}${gName(st.grind)}`),
    hl("Quickest", st.quickest, st.quickest ? fmtShort(st.quickest.time) : "", st.quickest && `${nf(st.quickest.count)} enc. · ${gName(st.quickest)}`),
    st.longest !== st.grind ? hl("Longest hunt", st.longest, st.longest ? fmtShort(st.longest.time) : "", st.longest && `${st.longest.count ? nf(st.longest.count) + " enc. · " : ""}${gName(st.longest)}`) : "",
    hl("Latest", st.latest, st.latest ? fmtDate(st.latest.ts) : "", st.latest && gName(st.latest)),
  ].join("");

  // Timeline: per year for all time (when there's more than one), else per month.
  const dated = list.filter(s => s.ts);
  const byYear = statsYear === "all" && years.length > 1;
  const buckets = byYear
    ? [...years].reverse().map(y => ({ label: String(y), full: String(y), list: dated.filter(s => yearOf(s) === y) }))
    : MONTHS.map((mo, i) => {
        const y = statsYear === "all" ? years[0] : statsYear;
        return { label: mo[0], full: `${mo} ${y}`, list: dated.filter(s => yearOf(s) === y && new Date(s.ts).getMonth() === i) };
      });
  const maxB = Math.max(1, ...buckets.map(b => b.list.length));
  const peak = buckets.reduce((a, b) => b.list.length > a.list.length ? b : a);
  const timeline = `<div class="st-cols ${byYear ? "years" : ""}">${buckets.map(b => `
      <div class="st-col" ${tipAttr(`<b>${b.full}</b> · ${plural(b.list.length, "shiny", "shinies")}${b.list.length ? ` · ${nf(b.list.reduce((t, s) => t + (s.count || 0), 0))} enc.` : ""}`)}>
        <span class="st-col-bar" style="height:${b.list.length / maxB * 100}%">${b === peak && b.list.length ? `<i>${b.list.length}</i>` : ""}</span>
        <span class="st-col-label">${b.label}</span>
      </div>`).join("")}</div>
      ${dated.length < list.length ? `<p class="st-note">${plural(list.length - dated.length, "shiny", "shinies")} without a date ${list.length - dated.length === 1 ? "isn't" : "aren't"} shown here.</p>` : ""}`;

  // By game: bars in each game's own colors, named on the row.
  const maxG = st.games[0].list.length;
  const games = st.games.map(({ g, list: l }) => {
    const gi = GAME_INFO[g], enc = l.reduce((t, s) => t + (s.count || 0), 0);
    return `<div class="st-row" ${tipAttr(`<b>${esc(gi.name)}</b> · ${plural(l.length, "shiny", "shinies")}${enc ? ` · ${nf(enc)} enc.` : ""}`)} style="--accent:${gi.accent};--accent2:${gi.accent2}">
        <span class="st-row-name">${esc(gi.short || gi.name)}</span>
        <span class="st-row-track"><i class="game" style="width:${l.length / maxG * 100}%"></i></span>
        <b>${nf(l.length)}</b>
      </div>`;
  }).join("");

  // Methods: the top five, the rest folded into Other.
  const mCount = {};
  for (const s of list) mCount[baseMethod(s)] = (mCount[baseMethod(s)] || 0) + 1;
  let methods = Object.entries(mCount).sort((a, b) => b[1] - a[1]);
  if (methods.length > 6) methods = [...methods.slice(0, 5), ["Other", methods.slice(5).reduce((t, [, n]) => t + n, 0)]];
  const maxM = methods[0][1];
  const charm = list.filter(s => /Shiny Charm/.test(s.method || "")).length;
  const methodRows = methods.map(([name, n]) => `<div class="st-row" ${tipAttr(`<b>${esc(name)}</b> · ${plural(n, "shiny", "shinies")} · ${Math.round(n / st.n * 100)}%`)}>
        <span class="st-row-name">${esc(name)}</span>
        <span class="st-row-track"><i style="width:${n / maxM * 100}%"></i></span>
        <b>${nf(n)}</b>
      </div>`).join("")
    + (charm ? `<p class="st-note">${Math.round(charm / st.n * 100)}% with the Shiny Charm.</p>` : "");

  // Luck: how many shinies came at which multiple of the odds.
  const LUCK = [["<¼×", 0, .25], ["¼–½×", .25, .5], ["½–1×", .5, 1], ["1–2×", 1, 2], ["2–3×", 2, 3], ["3×+", 3, Infinity]];
  const lucks = list.map(luckOf).filter(r => r != null);
  const lb = LUCK.map(([label, lo, hi]) => ({ label, n: lucks.filter(r => r >= lo && r < hi).length }));
  const maxL = Math.max(1, ...lb.map(b => b.n));
  const luck = lucks.length ? `<div class="st-cols luck">${lb.map((b, i) => `
      <div class="st-col ${i === 3 ? "past-odds" : ""}" ${tipAttr(`<b>${b.label} odds</b> · ${plural(b.n, "shiny", "shinies")}`)}>
        <span class="st-col-bar" style="height:${b.n / maxL * 100}%">${b.n ? `<i>${b.n}</i>` : ""}</span>
        <span class="st-col-label">${b.label}</span>
      </div>`).join("")}</div>
      <p class="st-note">Left of the line: found before the odds. From ${plural(lucks.length, "shiny", "shinies")} with encounters and odds.</p>` : "";

  const box = (title, sub, body, cls = "") => `<section class="st-card ${cls}"><div class="st-card-head"><h3>${title}</h3>${sub ? `<span>${sub}</span>` : ""}</div>${body}</section>`;
  $("#stBody").innerHTML = `
      <div class="st-highlights">${highlights}</div>
      <div class="st-grid">
        ${box(byYear ? "Shinies per year" : "Shinies per month", byYear ? "" : String(statsYear === "all" ? years[0] || "" : statsYear), timeline, "wide")}
        ${box("By game", plural(st.games.length, "game"), `<div class="st-rows">${games}</div>`)}
        ${box("By method", "", `<div class="st-rows">${methodRows}</div>`)}
        ${luck ? box("Luck", "", luck, "wide") : ""}
      </div>`;
  $("#stBody").dataset.period = period;
  renderSidebar();
}
async function drawWrappedCard(st, label) {
  const { W, x, F, M, HOLO, holo, spark, text, fit, spaced, panel, blob } = await cardCanvas("#ff7ad966", "#9d7bff80");
  const recent = [...st.list].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 6);
  const star = st.luckiest || st.latest || recent[0];
  const [starImg, ...imgs] = await Promise.all([star, ...recent].map(s => loadImg(s.m.sprite)));
  const rnd = seeded(st.n * 131 + st.enc % 9973 + 7);
  // Sparkles on the sides of the title.
  for (let i = 0; i < 16; i++) {
    const side = i % 2, sx = side ? 820 + rnd() * 190 : 70 + rnd() * 190, sy = 180 + rnd() * 380;
    x.globalAlpha = .2 + rnd() * .45;
    x.fillStyle = HOLO[i % 4][0];
    spark(sx, sy, 5 + rnd() * 14);
  }
  x.globalAlpha = 1;
  x.fillStyle = holo(820, 200, 900, 280);
  spark(860, 300, 34);

  x.textBaseline = "middle";
  spaced("4px");
  text(label.toUpperCase(), W - 84, 112, `700 26px ${M}`, holo(W - 300, 0, W - 84, 0), "right");
  x.textBaseline = "alphabetic";
  spaced("6px");
  text("SHINY WRAPPED", W / 2, 260, `700 28px ${M}`, holo(W / 2 - 170, 0, W / 2 + 170, 0), "center");
  spaced("0px");
  text(nf(st.n), W / 2, 470, fit(nf(st.n), 800, 240, 120, 760), "#fff", "center");
  text(st.n === 1 ? "shiny found" : "shinies found", W / 2, 540, `500 46px ${F}`, "rgba(255,255,255,.75)", "center");

  // The latest shinies in a row.
  const size = 128, gap = 18, total = imgs.length * size + (imgs.length - 1) * gap;
  imgs.forEach((img, i) => {
    const cx = (W - total) / 2 + i * (size + gap) + size / 2, cy = 660;
    x.fillStyle = "rgba(255,255,255,.08)";
    x.beginPath();
    x.arc(cx, cy, size / 2 + 6, 0, Math.PI * 2);
    x.fill();
    if (img) { x.imageSmoothingQuality = "high"; x.drawImage(img, cx - size / 2, cy - size / 2, size, size); }
  });

  // Totals
  const stats = [["ENCOUNTERS", st.enc ? nf(st.enc) : "—"], ["HUNT TIME", st.time ? fmtShort(st.time) : "—"], ["SPECIES", nf(st.species)]];
  panel(80, 770, W - 160, 136, 30);
  const colW = (W - 160) / 3;
  stats.forEach(([l, v], i) => {
    const mx = 80 + colW * (i + .5);
    text(v, mx, 840, fit(v, 800, 54, 26, colW - 48), "#fff", "center");
    spaced("3px");
    text(l, mx, 880, `700 18px ${M}`, "rgba(255,255,255,.55)", "center");
    spaced("0px");
  });

  // Star of the period: the luckiest shiny (or the latest one).
  panel(80, 936, W - 160, 250, 30);
  if (starImg) {
    x.shadowColor = GAME_INFO[star.g].accent + "aa";
    x.shadowBlur = 50;
    x.drawImage(starImg, 110, 951, 220, 220);
    x.shadowBlur = 0;
    x.shadowColor = "transparent";
  }
  const r = luckOf(star), sg = GAME_INFO[star.g];
  spaced("3px");
  text(st.luckiest ? "LUCKIEST SHINY" : "LATEST SHINY", 360, 1010, `700 20px ${M}`, holo(360, 0, 620, 0));
  spaced("0px");
  text(star.m.name, 360, 1082, fit(star.m.name, 800, 70, 36, W - 160 - 310), "#fff");
  const detail = st.luckiest ? `${fmtLuck(r)} odds · ${nf(star.count)} encounters` : fmtDate(star.ts);
  text(detail, 360, 1128, fit(detail, 700, 26, 16, W - 160 - 310, M), "rgba(255,255,255,.8)");
  const where = (star.m.form && star.m.form !== "Original" ? star.m.form + " · " : "") + sg.name;
  text(where, 360, 1164, fit(where, 700, 22, 14, W - 160 - 310, M), "rgba(255,255,255,.55)");

  // Footer: the game with the most shinies; the site on the right.
  spaced("1px");
  text("shinycheck.nl", W - 84, 1290, `700 24px ${M}`, holo(W - 300, 0, W - 84, 0), "right");
  const top = st.games[0], tg = GAME_INFO[top.g];
  const foot = `Most in ${tg.short || tg.name} · ${plural(top.list.length, "shiny", "shinies")}`;
  text(foot, 84, 1290, fit(foot, 700, 22, 14, W - 520, M), "rgba(255,255,255,.6)");
  spaced("0px");
  return blob();
}

// Wiring: runs once at startup, from main.js.
export function init() {

  $("#stYears").addEventListener("click", e => {
    const b = e.target.closest("[data-year]");
    if (!b) return;
    statsYear = b.dataset.year === "all" ? "all" : +b.dataset.year;
    renderStats();
  });
  $("#stBody").addEventListener("click", e => {
    const b = e.target.closest("[data-entry]");
    if (b) openEntry(+b.dataset.entry);
  });
  chartTips($("#stBody"));

  $("#stShare").addEventListener("click", () => {
    const all = mons.flatMap(shiniesOf);
    const st = statsFor(statsYear === "all" ? all : all.filter(s => yearOf(s) === statsYear));
    const label = statsYear === "all" ? "All time" : String(statsYear);
    showShare({
      title: `Shiny Wrapped · ${label} ✦`, draw: () => drawWrappedCard(st, label),
      file: `shiny-wrapped-${statsYear}.png`,
      text: `My Shiny Wrapped${statsYear === "all" ? "" : " " + statsYear}: ${plural(st.n, "shiny", "shinies")}${st.enc ? `, ${nf(st.enc)} encounters` : ""} ✦ shinycheck.nl`,
    });
  });
}
