(() => {
  // Where the app lives: "/" on shinycheck.nl, "/ShinyCheck-v3/" on github.io.
  const BASE = new URL(".", document.currentScript.src).pathname;
  const STORE = "livingdex-za-v1";
  const THEME = "livingdex-theme";
  const GAMES = ["sm", "usum", "lgpe", "swsh", "bdsp", "pla", "sv", "lza"];
  // Places a shiny can be logged. GO and HOME have no regional dex or hunt page, only
  // logs, and no odds (HOME shinies are gifts; GO odds aren't tracked).
  const LOG_GAMES = [...GAMES, "pogo", "home"];

  // Sections are keyed by the letter prefix of the regional dex number in the sheet ("" = no prefix).
  const GAME_INFO = {
    sm:   { nativeForms: ["Alolan"], name: "Sun & Moon", abbr: "SM", released: "2016-11-18", accent: "#f5a300", accent2: "#6f4fd8",
            logo: "logos/smLogo.png", sections: [["", "Alola"], ["O", "Outside the dex"]] },
    usum: { nativeForms: ["Alolan"], name: "Ultra Sun & Ultra Moon", abbr: "USUM", released: "2017-11-17", accent: "#f08a1c", accent2: "#3b78d8",
            logo: "logos/usumLogo.png", sections: [["", "Alola"], ["O", "Outside the dex"]] },
    lgpe: { name: "Let's Go Pikachu & Eevee", abbr: "LGPE", released: "2018-11-16", accent: "#f2b705", accent2: "#a8672f", logo: "logos/lgpeLogo.png",
            sections: [["", "Kanto"]] },
    swsh: { nativeForms: ["Galarian"], name: "Sword & Shield", abbr: "SwSh", released: "2019-11-15", accent: "#00a1e9", accent2: "#e5006e", logo: "logos/swshLogo.png",
            sections: [["", "Galar"], ["A", "Isle of Armor"], ["C", "Crown Tundra"], ["O", "Outside the dex"]] },
    bdsp: { name: "Brilliant Diamond & Shining Pearl", abbr: "BDSP", released: "2021-11-19", short: "BD & SP", accent: "#3d7bd9", accent2: "#e77fa6", logo: "logos/bdspLogo.png",
            sections: [["", "Sinnoh"]] },
    pla:  { nativeForms: ["Hisuian", "White Stripe"], name: "Legends: Arceus", abbr: "PLA", released: "2022-01-28", accent: "#d97706", accent2: "#5b3a8c", logo: "logos/plaLogo.png",
            sections: [["", "Hisui"]] },
    sv:   { nativeForms: ["Paldean", "Paldean Combat Breed"], name: "Scarlet & Violet", abbr: "SV", released: "2022-11-18", accent: "#ff4d00", accent2: "#8c00ff", logo: "logos/svLogo.png",
            sections: [["P", "Paldea"], ["K", "Kitakami"], ["B", "Blueberry"], ["O", "Outside the dex"]] },
    lza:  { name: "Legends: Z-A", abbr: "Z-A", released: "2025-10-16", accent: "#06b6d4", accent2: "#2bd67b", logo: "logos/plzaLogo.png",
            sections: [["", "Lumiose"], ["M", "Mega Dimension"]] },
    pogo: { name: "Pokémon GO", abbr: "GO", released: "2016-07-06", short: "GO", accent: "#10b981", accent2: "#3b82f6", logOnly: true, noOdds: true, sections: [] },
    home: { name: "Pokémon HOME", abbr: "HOME", released: "2020-02-12", short: "HOME", accent: "#14b8a6", accent2: "#6366f1", logOnly: true, noOdds: true, sections: [] },
  };
  const gamePrefix = v => v.replace(/[0-9]/g, "");
  const gameNum = v => +v.replace(/\D/g, "");
  // A Pokémon can sit in more than one dex of the same game (Lumiose + Mega Dimension),
  // so the extra code lives in m.extra[gid] next to the sheet's m.games[gid].
  const codes = (m, gid) => [m.games[gid], m.extra && m.extra[gid]].filter(Boolean);
  const codeIn = (m, gid, p) => codes(m, gid).find(c => gamePrefix(c) === p);
  const gameGrad = g => `linear-gradient(90deg, ${g.accent}, ${g.accent2})`;

  // Split data into Pokémon entries and generation names.
  const genNames = { 1: "Gen 1 (Kanto)" };
  const mons = [];
  for (const e of window.DEX) {
    if (e.header) genNames[e.gen] = e.header;
    else mons.push(e);
  }
  // Legends: Z-A Mega Dimension DLC (Hyperspace) dex, shown as M001… — species and order
  // checked against Serebii's Hyperspace Pokédex.
  const LZA_MD = [56,57,979,52,53,863,83,865,104,105,137,233,474,951,952,957,958,959,967,969,970,479,971,972,769,770,352,973,615,977,978,996,997,998,999,1000,211,904,252,253,254,255,256,257,258,259,260,349,350,433,358,876,509,510,517,518,538,539,562,563,867,767,768,827,828,852,853,778,900,877,622,623,821,822,823,174,39,40,926,927,396,397,398,325,326,931,739,740,932,933,934,316,317,41,42,169,935,936,937,942,943,848,849,944,945,335,336,439,122,866,590,591,485,721,638,639,640,647,648,649,720,802,808,809,491,380,381,382,383,384,801,807];
  const MD_FORMS = { 52: ["Alolan", "Galarian"], 53: ["Alolan"], 83: ["Galarian"], 105: ["Alolan"], 122: ["Galarian"], 211: ["Hisuian"], 562: ["Galarian"] };
  for (const m of mons) {
    const i = LZA_MD.indexOf(+m.dex);
    if (i < 0 || !(["", "Original", "Basic"].includes(m.form) || (MD_FORMS[+m.dex] || []).includes(m.form))) continue;
    const code = "M" + String(i + 1).padStart(3, "0");
    if (m.games.lza) m.extra = { lza: code }; else m.games.lza = code;
  }
  // Shiny availability (checked Sept 2026 against Serebii's unavailable-Shiny table and
  // shiny event archive, and NationalDex). Keyed by national dex number.
  const SHINY_LOCKED = new Set([494, 720, 789, 790, 801, 802, 891, 892, 893, 896, 897, 898,
    1009, 1010, 1014, 1015, 1016, 1017, 1020, 1021, 1022, 1023, 1024, 1025]);
  const EVENT_ONLY = {
    490: "Only via a Pokémon HOME gift (Brilliant Diamond & Shining Pearl Pokédex, 2025).",
    647: "Only via a Pokémon HOME gift (Sword & Shield Pokédexes, 2025).",
    648: "Only via a Pokémon HOME gift (Scarlet & Violet Pokédexes, 2024).",
    719: "Only via event distributions (2015) and a ticketed Pokémon GO research (2025).",
    721: "Only via a Pokémon HOME gift (Legends: Z-A Pokédex, 2026).",
    807: "Only via an event distribution (2020).",
    890: "Only via an event distribution (2022).",
    1001: "Only via Tera Raid event distributions (2025).",
    1002: "Only via Tera Raid event distributions (2025).",
    1003: "Only via Tera Raid event distributions (2025).",
    1004: "Only via Tera Raid event distributions (2025).",
    1007: "Only via an event distribution (2025).",
    1008: "Only via an event distribution (2025).",
  };
  // Shiny locks within one game (Serebii's shiny-lock table, Sept 2026), kept only when every way
  // to get the Pokémon in that game is locked — checked against Serebii's locations. A locked
  // gift doesn't count if it's also wild or breedable there (e.g. the Z-A starters in Wild
  // Zone 20, the PLA starters in outbreaks). "dex:Form" locks only that form; evolutions of a
  // locked-only line are locked too.
  const GAME_LOCKS = {
    sm: [718, 785, 786, 787, 788, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800],
    usum: [718, 785, 786, 787, 788, 791, 792, 800],
    swsh: [772, 773, 803, 804, 888, 889, "144:Galarian", "145:Galarian", "146:Galarian"],
    bdsp: [151, 385],
    pla: [480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 641, 642, 645, 905],
    sv: [999, 1000, 144, 145, 146, 243, 244, 245, 249, 250, 380, 381, 382, 383, 384,
      638, 639, 640, 643, 644, 646, 791, 792, 800],
    lza: [150, 716, 717, 718, 382, 383, 384, 485, 491, 647, 648, 649, 720, 721, 801, 802, 807, 808, 809],
  };
  const lockedIn = (m, gid) => !!gid && (SHINY_LOCKED.has(+m.dex)
    || (GAME_LOCKS[gid] || []).some(k => k === +m.dex || k === `${+m.dex}:${m.form}`));
  const shinyStatus = (m, gid) => SHINY_LOCKED.has(+m.dex)
    ? { kind: "locked", label: "Shiny locked", note: "No shiny has ever been released through legitimate means." }
    : lockedIn(m, gid) ? { kind: "locked", label: "Shiny locked", note: `Can't be shiny in ${GAME_INFO[gid].name}. Doesn't count toward this game's total.` }
    : EVENT_ONLY[+m.dex] ? { kind: "event", label: "Event only", note: `Shiny can't be hunted. ${EVENT_ONLY[+m.dex]}` } : null;
  const ICONS = {
    locked: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
    event: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="12" rx="2"/><path d="M12 9v12M4 13h16M12 9C10 5 6 5 7 8s5 1 5 1zm0 0c2-4 6-4 5-1s-5 1-5 1z"/></svg>',
  };
  const statusChip = (m, gid) => {
    const s = shinyStatus(m, gid);
    return s ? `<span class="status-chip ${s.kind}" title="${s.label} — ${s.note}">${ICONS[s.kind]}</span>` : "";
  };
  const statusNote = (m, gid) => {
    const s = shinyStatus(m, gid);
    return s ? `<div class="status-note ${s.kind}">${ICONS[s.kind]}<span><b>${s.label}</b> ${s.note}</span></div>` : "";
  };

  const region = g => (genNames[g].match(/\((.*)\)/) || [, genNames[g]])[1];

  const safe = fn => { try { return fn(); } catch { return null; } };
  let caught = new Set(safe(() => JSON.parse(localStorage.getItem(STORE))) || []);
  // Every change is kept in localStorage (instant, offline) and handed to the cloud
  // module, which batches it into Firestore. "hunt" changes are throttled harder.
  const sync = kind => window.Cloud && window.Cloud.changed(kind);
  const save = () => { safe(() => localStorage.setItem(STORE, JSON.stringify([...caught]))); sync("data"); };

  // Hunts: { "<game>:<id>": { count, time, since, inc, odds, updated } }. `time` holds finished
  // seconds; while running, `since` is the start timestamp so the clock survives reloads.
  // Shinies: { "<game>:<id>": [{ count, time, odds, ts }] }.
  const HUNTS = "shinycheck-v3-hunts", SHINIES = "shinycheck-v3-shinies";
  let hunts = safe(() => JSON.parse(localStorage.getItem(HUNTS))) || {};
  let shinies = safe(() => JSON.parse(localStorage.getItem(SHINIES))) || {};
  const saveHunts = () => { safe(() => localStorage.setItem(HUNTS, JSON.stringify(hunts))); sync("hunt"); };
  const saveShinies = () => { safe(() => localStorage.setItem(SHINIES, JSON.stringify(shinies))); sync("data"); };
  // Odds and step per game (see the Hunt Deck).
  const PREFS = "shinycheck-v3-prefs";
  const prefs = safe(() => JSON.parse(localStorage.getItem(PREFS))) || {};
  const savePrefs = () => { safe(() => localStorage.setItem(PREFS, JSON.stringify(prefs))); sync("data"); };
  const hk = (gid, id) => `${gid}:${id}`;
  const elapsed = h => Math.floor((h.time || 0) + (h.since ? (Date.now() - h.since) / 1000 : 0));
  const isActive = h => h && (h.count > 0 || elapsed(h) > 0 || h.since);
  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date unknown";
  const fmtTime = s => `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;
  const fmtShort = s => s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  const nf = n => n.toLocaleString("en-US");

  const $ = s => document.querySelector(s);
  const el = {
    home: $("#homeView"), game: $("#gameView"), cards: $("#cards"), gameCards: $("#gameCards"),
    huntsView: $("#huntsView"), huntCards: $("#huntCards"),
    regions: $("#regions"), dexTabs: $("#dexTabs"), sideGames: $("#sideGames"), upNext: $("#upNext"),
    q: $("#q"), gq: $("#gq"), toast: $("#toast"),
  };
  // page: "" = Living Dex, otherwise a game id. tab = regional dex on a game page.
  // huntsView: the Active hunts page (/hunts); page stays "" there.
  const state = { huntsView: false, page: "", gen: 0, tab: "", missing: false, forms: true, gMissing: false, gOutside: false };

  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const matchText = (m, input) => {
    const q = norm(input.value.trim());
    return !q || norm(m.name).includes(q) || m.key.includes(q) || m.dex.includes(q) ||
      norm(m.form).includes(q) || String(+m.dex) === q;
  };
  // Living Dex status is global; on a game page "caught" means a shiny logged in that game.
  // Living Dex: an entry counts once a shiny of it is logged in any game (including GO).
  const loggedIn = m => LOG_GAMES.filter(g => (shinies[hk(g, m.id)] || []).length);
  const has = m => loggedIn(m).length > 0;
  // "Share across games" (Shiny Dex toolbar, off by default): a shiny logged anywhere also
  // counts in every other game the form appears in, like moving it there through HOME.
  const sharing = () => !!prefs.shareAcrossGames;
  const ownIn = (gid, m) => (shinies[hk(gid, m.id)] || []).length > 0;
  const gHas = gid => m => ownIn(gid, m) || (sharing() && has(m));
  const viaLabel = m => loggedIn(m).map(g => GAME_INFO[g].name).join(", ");
  const done = (list, f = has) => list.filter(f).length;
  const pct = (list, f = has) => list.length ? (done(list, f) / list.length) * 100 : 0;
  const fmtPct = p => (p === 100 || p === 0 ? p.toFixed(0) : p.toFixed(1)) + "%";

  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const typeImgs = m => m.types.map(t => `<img src="types/${t}.png" alt="${cap(t)}" title="${cap(t)}">`).join("");
  const sparkSvg = (cls = "", fill = "url(#holo)") => `<svg class="${cls}" viewBox="0 0 100 100"><use href="#spark" fill="${fill}"/></svg>`;

  // All logged shinies of one entry (form) across every game.
  const shiniesOf = m => LOG_GAMES.flatMap(g => (shinies[hk(g, m.id)] || []).map((s, i) => ({ ...s, g, i, m })));

  function card(m, gid) {
    const h = gid && hunts[hk(gid, m.id)];
    const found = gid ? (shinies[hk(gid, m.id)] || []).length : shiniesOf(m).length;
    const on = gid ? gHas(gid)(m) : has(m);
    const via = gid && on && !found;
    return `<article class="pcard ${on ? "on" : ""}" data-id="${m.id}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${esc(m.name)}${m.form ? " " + esc(m.form) : ""}">
      <div class="card-top">
        <span class="no">#${m.dex}</span>${statusChip(m, gid)}
        ${found ? `<span class="shiny-count" title="${found} shiny found">${sparkSvg("", "#fff")}${found}</span>` : ""}
        ${via ? `<span class="via-chip" title="Counted via ${esc(viaLabel(m))} (Share across games)">via ${esc(loggedIn(m).map(g => GAME_INFO[g].abbr).join("·"))}</span>` : ""}
        <a class="wiki" href="${m.url}" target="_blank" rel="noopener" title="Open on Bulbapedia">↗</a>
        ${sparkSvg("seal")}
      </div>
      <div class="sprite">${m.sprite ? `<img src="${m.sprite}" alt="" loading="lazy" decoding="async">` : `<span class="nosprite">?</span>`}</div>
      <h4 class="pname">${esc(m.name)}</h4>
      ${gid && outsideOnly(m, gid)
        ? `<span class="where-tag" title="${esc(whereIn(m, gid))}">${esc(whereIn(m, gid) || "Outside the dex")}</span>`
        : `<span class="form-tag ${m.form ? "" : "blank"}" title="${esc(m.form)}">${esc(m.form) || "&nbsp;"}</span>`}
      <div class="types">${typeImgs(m)}</div>
      ${isActive(h) ? `<div class="hunt-strip ${h.since ? "live" : ""}"><span>⚡ ${nf(h.count)}</span><span data-live="${m.id}">${fmtTime(elapsed(h))}</span></div>` : ""}
    </article>`;
  }

  const sectionHtml = (num, title, key, all, items, grad, gid, f = gid ? gHas(gid) : has) => `
    <section class="dex-section">
      <div class="section-head">
        <span class="section-num">${num}</span>
        <h3 class="section-title">${esc(title)}</h3>
        <div class="section-meta" data-sec="${key}" ${grad ? `style="--g:${grad}"` : ""}>
          <span class="sec-count">${done(all, f)} / ${all.length}</span>
          <span class="sec-bar"><i style="width:${pct(all, f)}%"></i></span>
        </div>
      </div>
      <div class="card-grid">${items.map(m => card(m, gid)).join("")}</div>
    </section>`;

  const empty = input => `<div class="empty-state">${sparkSvg()}No Pokémon found${input.value ? ` for “${esc(input.value)}”` : ""}</div>`;

  // Recommended: missing shinies you can actually hunt — not shiny locked or event only,
  // and in at least one tracked game. A random order is drawn once per page load (and on
  // shuffle) so the picks stay put while you click around.
  let recOrder = [];
  const shuffleRecs = () => {
    recOrder = mons.map(m => m.id);
    for (let i = recOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [recOrder[i], recOrder[j]] = [recOrder[j], recOrder[i]];
    }
  };
  shuffleRecs();
  const huntable = m => !shinyStatus(m) && GAMES.some(g => m.games[g]) && m.sprite;
  function recommended(scope) {
    const ok = new Set(scope.filter(m => !has(m) && huntable(m)).map(m => m.id));
    return recOrder.filter(id => ok.has(id)).slice(0, 6).map(id => mons.find(m => m.id === id));
  }

  // ---------- Living Dex ----------
  const homeScope = m => !state.gen || m.gen === state.gen;
  // The Forms toggle decides whether alternate forms count towards totals and percentages:
  // Shiny Dex uses its own toggle, game pages share theirs.
  const homePool = () => mons.filter(m => state.forms || !m.variant);
  // "Extra" on game pages: each regional dex number counts once. When several entries share a
  // number (Raichu and Alolan Raichu on Galar #195), one is the dex entry — the game's own
  // regional form (nativeForms), else the regular form — and the rest are extra. An entry is
  // extra for a game if it's extra in every dex of that game it appears in.
  const EXTRA = {};
  for (const gid of GAMES) {
    const seen = new Map(), extraIn = new Map(), native = GAME_INFO[gid].nativeForms || [];
    const rank = m => native.includes(m.form) ? 0 : !m.variant && ["", "Original", "Basic"].includes(m.form) ? 1 : 2;
    for (const [p] of GAME_INFO[gid].sections) {
      const groups = new Map();
      for (const m of mons) {
        const c = codeIn(m, gid, p);
        if (!c) continue;
        groups.set(c, [...(groups.get(c) || []), m]);
        seen.set(m.id, (seen.get(m.id) || 0) + 1);
      }
      for (const list of groups.values()) {
        if (list.length < 2) continue;
        const base = [...list].sort((x, y) => rank(x) - rank(y) || x.id - y.id)[0];
        for (const m of list) if (m !== base) extraIn.set(m.id, (extraIn.get(m.id) || 0) + 1);
      }
    }
    EXTRA[gid] = new Set([...extraIn].filter(([id, n]) => n === seen.get(id)).map(([id]) => id));
  }
  // "Outside the dex" entries (code O…, e.g. Island Scan or Dynamax Adventures) are catchable
  // in the game but not part of its regional dex, so they also fall under Extra.
  const outsideOnly = (m, gid) => codes(m, gid).every(c => gamePrefix(c) === "O");
  const isExtraForm = (m, gid) => EXTRA[gid].has(m.id) || outsideOnly(m, gid);
  const whereIn = (m, gid) => (m.where && m.where[gid]) || "";
  const codeLabel = (m, gid) => isExtraForm(m, gid) ? "outside the dex" : codes(m, gid).join(" / ");
  // Every game with such entries gets an "Outside the dex" tab: Pokémon you can have in the
  // game beyond its regional dex (other forms of a dex number, Dynamax Adventure legends…).
  for (const gid of GAMES) {
    const s = GAME_INFO[gid].sections;
    if (!s.some(([p]) => p === "O") && mons.some(m => m.games[gid] && isExtraForm(m, gid))) s.push(["O", "Outside the dex"]);
  }
  // They only count towards totals when "Count outside the dex" is on.
  // Shiny-locked Pokémon never count.
  const inGamePool = (m, gid) => (state.gOutside || !isExtraForm(m, gid)) && !lockedIn(m, gid);
  const homeMatch = m => homeScope(m) && matchText(m, el.q) && !(state.missing && has(m)) && (state.forms || !m.variant);

  function renderHome() {
    const list = mons.filter(homeMatch);
    $("#count").textContent = `${list.length} shown`;
    let html = "";
    for (const g of Object.keys(genNames).map(Number)) {
      const items = list.filter(m => m.gen === g);
      if (items.length) html += sectionHtml(String(g).padStart(2, "0"), region(g), g, homePool().filter(m => m.gen === g), items);
    }
    el.cards.innerHTML = html || empty(el.q);
    renderHomeStats();
  }

  function renderHomeStats() {
    const pool = homePool();
    const got = done(pool), p = pct(pool);
    const regionsDone = Object.keys(genNames).filter(g => {
      const l = pool.filter(m => m.gen === +g);
      return done(l) === l.length;
    }).length;
    $("#statCaught").textContent = got;
    $("#statLeft").textContent = pool.length - got;
    $("#statRegions").textContent = `${regionsDone}/${Object.keys(genNames).length}`;
    $("#heroPct").textContent = fmtPct(p);
    setRing($("#heroRing"), p);
    const left = pool.length - got;
    $("#heroSub").innerHTML = left
      ? `<b>${left}</b> Pokémon and forms still missing from your shiny collection. ${got ? "Keep going!" : "Open a Pokémon to log your first shiny."}`
      : `<b>Shiny Dex complete!</b> Every form, shiny and in one place. ✦`;

    el.regions.innerHTML = [[0, "All regions", pool], ...Object.keys(genNames).map(g => [+g, region(g), pool.filter(m => m.gen === +g)])]
      .map(([g, n, l]) => `<button class="region ${state.gen === g ? "active" : ""} ${done(l) === l.length ? "done" : ""}" data-gen="${g}">
        <span class="r-name">${esc(n)}</span><span class="r-num">${done(l)} / ${l.length}</span>
        <span class="r-bar" style="width:${pct(l)}%"></span>
      </button>`).join("");

    const next = recommended(pool.filter(homeScope));
    el.upNext.innerHTML = next.length
      ? next.map(m => `<button data-jump="${m.id}" title="#${m.dex} ${esc(m.name)}${m.form ? " (" + esc(m.form) + ")" : ""} — hunt in ${esc(GAMES.filter(g => m.games[g]).map(g => GAME_INFO[g].abbr).reverse().join(", "))}"><img src="${m.sprite}" alt="${esc(m.name)}"></button>`).join("")
      : `<p class="up-next-empty">Nothing left to hunt here ✦</p>`;

    for (const g of Object.keys(genNames)) updateSection(el.cards, g, pool.filter(m => m.gen === +g));
    renderSidebar();
  }

  // ---------- Game page ----------
  const inTab = (gid, p) => m => p === "O" ? !!m.games[gid] && isExtraForm(m, gid) : !!codeIn(m, gid, p) && !isExtraForm(m, gid);

  function renderGame() {
    const gid = state.page, g = GAME_INFO[gid];
    $("#gForms").hidden = !g.sections.some(([p]) => p === "O");
    if (state.tab !== "hunts" && !g.sections.some(([p]) => p === state.tab)) state.tab = g.sections[0][0];
    // Tabs always show everything; only the totals follow "Count outside the dex".
    const all = mons.filter(m => m.games[gid]);
    for (const [k, v] of [["--accent", g.accent], ["--accent2", g.accent2], ["--g", gameGrad(g)]]) el.game.style.setProperty(k, v);
    $("#bannerLogo").innerHTML = g.logo ? `<img src="${g.logo}" alt="${esc(g.name)}">` : `<span class="wordmark">${esc(g.short || g.name)}</span>`;
    $("#gameTitle").textContent = g.name;

    const huntList = all.filter(m => isActive(hunts[hk(gid, m.id)]))
      .sort((x, y) => (hunts[hk(gid, y.id)].updated || 0) - (hunts[hk(gid, x.id)].updated || 0));
    el.dexTabs.innerHTML = g.sections.map(([p, t]) => {
      const l = all.filter(inTab(gid, p));
      return `<button class="seg ${state.tab === p ? "active" : ""}" data-tab="${p}">${esc(t)}<small data-tabcount="${p}">${done(l, gHas(gid))}/${l.length}</small></button>`;
    }).join("") + `<button class="seg seg-hunts ${state.tab === "hunts" ? "active" : ""}" data-tab="hunts">
      <span class="live-dot ${huntList.some(m => hunts[hk(gid, m.id)].since) ? "on" : ""}"></span>Hunts<small>${huntList.length}</small></button>`;

    if (state.tab === "hunts") {
      const items = huntList.filter(m => matchText(m, el.gq));
      $("#gCount").textContent = `${items.length} active`;
      el.gameCards.className = "game-mode";
      el.gameCards.innerHTML = items.length
        ? `<section class="dex-section"><div class="section-head"><span class="section-num">⚡</span><h3 class="section-title">Active hunts</h3></div>
           <div class="card-grid">${items.map(m => card(m, gid)).join("")}</div></section>`
        : `<div class="empty-state">${sparkSvg()}No active hunts yet<small>Open any Pokémon and start counting — it shows up here.</small></div>`;
      return renderGameStats();
    }

    const section = g.sections.find(([p]) => p === state.tab);
    const tabAll = all.filter(inTab(gid, state.tab));
    const items = tabAll
      .filter(m => matchText(m, el.gq) && !(state.gMissing && gHas(gid)(m)))
      .sort(state.tab === "O" ? (x, y) => +x.dex - +y.dex || x.id - y.id
        : (x, y) => gameNum(codeIn(x, gid, state.tab)) - gameNum(codeIn(y, gid, state.tab)) || x.id - y.id);
    $("#gCount").textContent = `${items.length} shown`;
    el.gameCards.className = "game-mode";
    el.gameCards.innerHTML = items.length
      ? sectionHtml(String(g.sections.indexOf(section) + 1).padStart(2, "0"), (section[0] === "O" ? section[1] : section[1] + " Dex"), "tab", tabAll.filter(m => !lockedIn(m, gid)), items, gameGrad(g), gid)
      : empty(el.gq);
    renderGameStats();
  }

  function renderGameStats() {
    const gid = state.page, g = GAME_INFO[gid];
    const full = mons.filter(m => m.games[gid]), all = full.filter(m => inGamePool(m, gid)), f = gHas(gid);
    const p = pct(all, f), left = all.length - done(all, f);
    $("#gamePct").textContent = fmtPct(p);
    $("#gameCount").textContent = `${done(all, f)} / ${all.length}`;
    setRing($("#gameRing"), p);
    $("#gameSub").innerHTML = left
      ? `<b>${left}</b> shinies still to log across ${(() => { const dx = g.sections.filter(([p]) => p !== "O"); return (dx.length > 1 ? dx.length + " regional dexes" : "the " + dx[0][1] + " Dex") + (state.gOutside && dx.length < g.sections.length ? " and beyond" : ""); })()}.`
      : `<b>Complete!</b> Every shiny from ${esc(g.name)} is logged. ✦`;
    for (const [p2] of g.sections) {
      const l = full.filter(m => inTab(gid, p2)(m) && !lockedIn(m, gid));
      const n = el.dexTabs.querySelector(`[data-tabcount="${p2}"]`);
      if (n) n.textContent = `${done(l, f)}/${l.length}`;
    }
    updateSection(el.gameCards, "tab", full.filter(m => inTab(gid, state.tab)(m) && !lockedIn(m, gid)), f);
    const live = full.filter(m => isActive(hunts[hk(gid, m.id)]));
    const seg = el.dexTabs.querySelector(".seg-hunts");
    if (seg) {
      seg.querySelector("small").textContent = live.length;
      seg.querySelector(".live-dot").classList.toggle("on", live.some(m => hunts[hk(gid, m.id)].since));
    }
    renderSidebar();
  }

  // ---------- Shared ----------
  function setRing(ring, p) {
    ring.querySelector(".fill").style.strokeDashoffset = 326.73 * (1 - p / 100);
  }

  function updateSection(root, key, all, f = has) {
    const s = root.querySelector(`.section-meta[data-sec="${key}"]`);
    if (!s) return;
    s.querySelector(".sec-count").textContent = `${done(all, f)} / ${all.length}`;
    s.querySelector(".sec-bar i").style.width = pct(all, f) + "%";
  }

  function renderSidebar() {
    const pool = homePool();
    $("#sideDexPct").textContent = fmtPct(pct(pool));
    $("#sideDexBar").style.width = pct(pool) + "%";
    // Newest release first (GAMES itself runs oldest → newest).
    el.sideGames.innerHTML = [...GAMES].reverse().map(id => {
      const g = GAME_INFO[id], l = mons.filter(m => m.games[id] && inGamePool(m, id));
      return `<a class="side-item ${state.page === id ? "active" : ""}" href="${BASE}${id}" style="--c:${g.accent};--g:${gameGrad(g)}">
        <span class="side-icon"></span>
        <span class="side-name">${esc(g.name)}</span>
        <span class="side-pct">${fmtPct(pct(l, gHas(id)))}</span>
        <span class="side-bar"><i style="width:${pct(l, gHas(id))}%"></i></span>
      </a>`;
    }).join("");
    document.querySelector('.side-item[data-page=""]').classList.toggle("active", !state.page && !state.huntsView);
    const live = activeHunts();
    $("#sideHuntCount").textContent = live.length;
    $("#sideHuntDot").classList.toggle("on", live.some(x => x.h.since));
    document.querySelector('.side-item[data-page="hunts"]').classList.toggle("active", state.huntsView);
  }

  function render() {
    typeof renderV2Banner === "function" && renderV2Banner();
    $("#fShare").setAttribute("aria-pressed", sharing());
    el.home.classList.toggle("hidden", !!state.page || state.huntsView);
    el.game.classList.toggle("hidden", !state.page);
    el.huntsView.classList.toggle("hidden", !state.huntsView);
    state.huntsView ? renderHunts() : state.page ? renderGame() : renderHome();
  }

  // ---------- Active hunts (all games) ----------
  const activeHunts = () => GAMES.flatMap(gid => mons
    .filter(m => isActive(hunts[hk(gid, m.id)]))
    .map(m => ({ gid, m, h: hunts[hk(gid, m.id)] })));

  function renderHunts() {
    const list = activeHunts(), running = list.filter(x => x.h.since).length;
    const enc = list.reduce((s, x) => s + x.h.count, 0);
    $("#huntsSub").innerHTML = list.length
      ? `<b>${list.length}</b> ${list.length === 1 ? "hunt" : "hunts"} going across ${new Set(list.map(x => x.gid)).size} ${new Set(list.map(x => x.gid)).size === 1 ? "game" : "games"}. ${running ? `${running} running right now.` : "All paused."}`
      : "No hunts yet. Open a game, pick a Pokémon and press + to start one.";
    $("#huntsStats").innerHTML = [
      [list.length, "Active"], [running, "Running"], [nf(enc), "Encounters"],
      [fmtShort(list.reduce((s, x) => s + elapsed(x.h), 0)), "Hunt time", "huntsTime"],
    ].map(([v, l, id]) => `<div class="stat"><b ${id ? `id="${id}"` : ""}>${v}</b><span>${l}</span></div>`).join("");

    // Newest game first; inside a game the most recently touched hunt first.
    el.huntCards.innerHTML = [...GAMES].reverse().map(gid => {
      const g = GAME_INFO[gid];
      const items = list.filter(x => x.gid === gid).sort((x, y) => (y.h.updated || 0) - (x.h.updated || 0));
      if (!items.length) return "";
      const genc = items.reduce((s, x) => s + x.h.count, 0);
      return `<section class="dex-section game-mode" data-game="${gid}" style="--accent:${g.accent};--accent2:${g.accent2};--g:${gameGrad(g)}">
        <div class="section-head">
          <span class="section-dot"></span>
          <h3 class="section-title">${esc(g.name)}</h3>
          <div class="section-meta"><span class="sec-count">${items.length} ${items.length === 1 ? "hunt" : "hunts"} · ${nf(genc)} encounters</span></div>
        </div>
        <div class="card-grid">${items.map(x => card(x.m, gid)).join("")}</div>
      </section>`;
    }).join("") || `<div class="empty-state">${sparkSvg()}No active hunts yet<small>Start one from any game page — they all gather here.</small></div>`;
    renderSidebar();
  }

  // Drawn in a fixed layer on top of the page so the card's paint containment doesn't clip it.
  function burst(cardEl) {
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

  let toastTimer;
  // Optional action (e.g. Undo) shows as a button and keeps the toast up a little longer.
  function toast(msg, action, ms) {
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


  // ---------- Hunt Deck (drawer) ----------
  const dr = {
    root: $("#drawer"), panel: $(".drawer-panel"), img: $("#drImg"), count: $("#drCount"), time: $("#drTime"),
    play: $("#drPlay"), luckBar: $("#drLuckBar"), luckText: $("#drLuckText"),
    log: $("#drLog"), gotcha: $("#drGotcha"), float: $("#drFloat"), stage: $("#drStage"), celebrate: $("#drCelebrate"),
  };
  // cur/curGame: the Pokémon being hunted. It outlives the drawer while the pop-out is open.
  let cur = null, curGame = "", lastFocus = null, pip = null;
  const curKey = () => hk(curGame, cur.id);
  // Odds and step are remembered per game, so they stick before the first encounter
  // and carry over to the next hunt in that game.
  // Hunt setup per game, built from parts instead of a list of combinations:
  // a method (Wild, Masuda, Outbreak…) plus the bonuses that apply to it. Odds come from
  // shiny rolls, P = 1 − (4095/4096)^rolls (roll counts checked against RotomLabs and
  // PokéTools); some methods have a fixed rate instead. A new game only needs its parts.
  const CHARM = { id: "charm", label: "Shiny Charm", type: "toggle" };
  const HUNT_SETUP = {
    // Allowed bonuses may override their rolls per method ("charm:1"). Checked against
    // RotomLabs: in SwSh the charm adds 2 rolls in the wild and in Masuda, 1 for regular
    // eggs; in BD & SP it does nothing in the wild, Grand Underground or Poké Radar.
    // Ultra Sun & Ultra Moon: SOS chains add rolls at 11, 21 and 31 calls (+4/+8/+12), the
    // Shiny Charm +2; best 1/273 (checked against RotomLabs / PokéStats / RankedBoost).
    usum: { methods: [["wild", "Wild / SOS", 1, ["charm", "sos"]], ["masuda", "Masuda", 6, ["charm"]]],
      bonus: [{ ...CHARM, rolls: 2 }, { id: "sos", label: "SOS chain", type: "level", levels: [["–", 0], ["11+", 4], ["21+", 8], ["31+", 12]] }] },
    // Sun & Moon share Gen 7's SOS, Masuda and Shiny Charm rules with USUM.
    get sm() { return this.usum; },
    // Let's Go: rolls from a Lure (+1), the Shiny Charm (+2) and the species' Catch Combo
    // (11+ → +3, 21+ → +7, 31+ → +11); all three together give 1/273.
    lgpe: { methods: [["wild", "Wild", 1, ["charm", "lure", "combo"]]],
      bonus: [{ ...CHARM, rolls: 2 }, { id: "lure", label: "Lure", type: "toggle", rolls: 1 },
        { id: "combo", label: "Catch Combo", type: "level", levels: [["0–10", 0], ["11+", 3], ["21+", 7], ["31+", 11]] }] },
    swsh: { methods: [["wild", "Wild", 1, ["charm"]], ["breed", "Breeding", 1, ["charm:1"]], ["masuda", "Masuda", 6, ["charm"]],
      ["dyna", "Dynamax Adventure", { odds: 300, charm: 100 }, ["charm"]]],
      bonus: [{ ...CHARM, rolls: 2 }] },
    bdsp: { methods: [["wild", "Wild", 1, []], ["gu", "Grand Underground", 1, ["diglett"]], ["breed", "Breeding", 1, ["charm:1"]],
      ["masuda", "Masuda", 6, ["charm"]], ["radar", "Poké Radar chain 40+", { odds: 99 }, []]],
      bonus: [{ ...CHARM, rolls: 2 }, { id: "diglett", label: "Diglett bonus", type: "toggle", rolls: 1 }] },
    pla: { methods: [["wild", "Wild", 1, ["charm", "research"]], ["mo", "Mass outbreak", 26, ["charm", "research"]], ["mmo", "Massive mass outbreak", 13, ["charm", "research"]]],
      bonus: [{ ...CHARM, rolls: 3 }, { id: "research", label: "Research", type: "level", levels: [["–", 0], ["Lv 10", 1], ["Perfect", 3]] }] },
    sv: { methods: [["wild", "Wild", 1, ["charm", "outbreak", "sparkling"]], ["masuda", "Masuda", 6, ["charm"]]],
      bonus: [{ ...CHARM, rolls: 2 }, { id: "outbreak", label: "Outbreak cleared", type: "level", levels: [["–", 0], ["30+", 1], ["60+", 2]] },
        { id: "sparkling", label: "Sparkling Power", type: "level", levels: [["–", 0], ["1", 1], ["2", 2], ["3", 3]] }] },
    lza: { methods: [["wild", "Wild", 1, ["charm", "sparkling"]]],
      bonus: [{ ...CHARM, rolls: 3 }, { id: "sparkling", label: "Sparkling Power", type: "level", levels: [["–", 0], ["1", 1], ["2", 2], ["3", 3]] }] },
  };
  const rollsToOdds = r => Math.round(1 / (1 - Math.pow(4095 / 4096, r)));
  // setup = { m: method id, charm: bool, <level id>: index }
  function evalSetup(gid, setup) {
    const conf = HUNT_SETUP[gid];
    if (!conf) return { odds: 4096, label: "" };
    const [, mLabel, base, allowedRaw] = conf.methods.find(([id]) => id === setup.m) || conf.methods[0];
    const allowed = allowedRaw.map(x => x.split(":")[0]);
    const override = Object.fromEntries(allowedRaw.filter(x => x.includes(":")).map(x => [x.split(":")[0], +x.split(":")[1]]));
    const active = conf.bonus.filter(b => allowed.includes(b.id)).map(b => b.id in override ? { ...b, rolls: override[b.id] } : b);
    const parts = [mLabel];
    if (typeof base === "object") {
      const charm = allowed.includes("charm") && setup.charm && base.charm;
      if (charm) parts.push("Shiny Charm");
      return { odds: charm ? base.charm : base.odds, label: parts.join(" · ") };
    }
    let rolls = base;
    for (const b of active) {
      if (b.type === "toggle" && setup[b.id]) { rolls += b.rolls; parts.push(b.label); }
      if (b.type === "level" && setup[b.id]) { const [lv, r] = b.levels[setup[b.id]] || b.levels[0]; rolls += r; if (r) parts.push(`${b.label} ${lv}`); }
    }
    return { odds: rollsToOdds(rolls), label: parts.join(" · ") };
  }
  const defaultSetup = gid => ({ m: HUNT_SETUP[gid] ? HUNT_SETUP[gid].methods[0][0] : "wild" });

  // Method chips + bonus rows for a game's setup; shared by the Hunt Deck and "Add a shiny".
  function setupHtml(gid, setup) {
    const conf = HUNT_SETUP[gid];
    const chip = (attr, on, text) => `<button class="hs-chip ${on ? "on" : ""}" ${attr}>${text}</button>`;
    // A single method needs no picker (Legends: Z-A).
    const methods = conf && conf.methods.length > 1 ? conf.methods.map(([id, label]) => chip(`data-hm="${id}"`, setup.m === id, esc(label))).join("") : "";
    let rows = "";
    if (conf) {
      const allowed = (conf.methods.find(([id]) => id === setup.m) || conf.methods[0])[3].map(x => x.split(":")[0]);
      rows = conf.bonus.filter(b => allowed.includes(b.id)).map(b => b.type === "toggle"
        ? `<div class="hs-row"><span>${esc(b.label)}</span><button class="hs-switch" role="switch" aria-checked="${!!setup[b.id]}" data-hb="${b.id}"><i></i></button></div>`
        : `<div class="hs-row"><span>${esc(b.label)}</span><div class="hs-seg">${b.levels.map(([lv], i) => chip(`data-hl="${b.id}:${i}"`, (setup[b.id] || 0) === i, esc(lv))).join("")}</div></div>`).join("");
    }
    return `<div class="hs-methods">${methods}</div>${rows}`;
  }
  function paintSetup(h) {
    $("#drSetup").innerHTML = setupHtml(curGame, h.setup || defaultSetup(curGame));
    $("#drOddsShow").textContent = `1/${nf(h.odds)}`;
  }
  function patchSetup(gid, setup, patch) {
    const next = { ...setup, ...patch };
    // Legends: Arceus gives the Shiny Charm only once every species is at research level 10.
    if (gid === "pla") {
      if (patch.charm && !next.research) next.research = 1;
      if ("research" in patch && !patch.research && next.charm) next.research = 1;
    }
    return next;
  }
  // Turn a click on a setup chip/switch into a patch (or null).
  function setupPatch(t, setup) {
    if (t.dataset.hm) return { m: t.dataset.hm };
    if (t.dataset.hb) return { [t.dataset.hb]: !setup[t.dataset.hb] };
    if (t.dataset.hl) { const [id, i] = t.dataset.hl.split(":"); return { [id]: +i }; }
    return null;
  }
  function changeSetup(patch) {
    const setup = patchSetup(curGame, hunt().setup || defaultSetup(curGame), patch);
    const { odds } = evalSetup(curGame, setup);
    setHunt({ setup, odds });
  }

  const gamePrefs = () => ({ inc: 1, odds: 4096, setup: defaultSetup(curGame), ...prefs[curGame] });
  const hunt = () => {
    const h = hunts[curKey()] || { count: 0, time: 0, since: null, ...gamePrefs() };
    // Hunts and prefs from before hunt setups existed get the default setup.
    return h.setup ? h : { ...h, setup: defaultSetup(curGame), odds: evalSetup(curGame, defaultSetup(curGame)).odds };
  };
  function setHunt(patch) {
    const h = { ...hunt(), ...patch, updated: Date.now() };
    if ("odds" in patch || "inc" in patch || "setup" in patch) {
      prefs[curGame] = { inc: h.inc, odds: h.odds, setup: h.setup || null };
      savePrefs();
    }
    if (!isActive(h)) delete hunts[curKey()]; else hunts[curKey()] = h;
    saveHunts();
    paintHunt();
    refreshCard();
  }

  function openDrawer(id, gid = state.page) {
    cur = mons.find(m => m.id === id);
    curGame = gid;
    const g = GAME_INFO[curGame];
    $("#drPhasePick").hidden = true;
    $("#drPhaseQ").value = "";
    for (const [k, v] of [["--accent", g.accent], ["--accent2", g.accent2]]) dr.root.style.setProperty(k, v);
    $("#drGame").textContent = g.name;
    $("#drMeta").textContent = `#${cur.dex} · ${g.short || g.name} ${codeLabel(cur, curGame)}${whereIn(cur, curGame) ? " · " + whereIn(cur, curGame) : ""}`;
    $("#drName").textContent = cur.name;
    $("#drSub").innerHTML = (cur.form ? `<span class="form-tag">${esc(cur.form)}</span>` : "") + statusNote(cur, curGame);
    dr.celebrate.classList.remove("show");
    dr.img.src = cur.sprite || "";
    paintHunt();
    paintLog();
    disarm();
    if (!dr.root.classList.contains("open")) {
      lastFocus = document.activeElement;
      dr.root.classList.add("open");
      dr.root.setAttribute("aria-hidden", "false");
      document.body.classList.add("drawer-open");
      setTimeout(() => dr.panel.focus(), 50);
    }
    dr.panel.querySelector(".dr-scroll").scrollTop = 0;
  }

  // Phones: −1 / +1 move to a thumb dock at the bottom of the Hunt Deck (above Gotcha!).
  const phoneDeck = matchMedia("(max-width: 560px)");
  const placeCountActions = () => {
    const acts = $(".dr-count-actions");
    if (phoneDeck.matches) $(".dr-foot").prepend(acts);
    else $("#drCount").after(acts);
  };
  phoneDeck.addEventListener("change", placeCountActions);
  placeCountActions();

  function closeDrawer() {
    if (!dr.root.classList.contains("open")) return;
    dr.root.classList.remove("open");
    dr.root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
    if (lastFocus) lastFocus.focus({ preventScroll: true });
    if (!pip) cur = null;
    syncWakeLock();
  }

  // Keep the screen on while a hunt's timer runs in the open Hunt Deck (or pop-out),
  // so the phone doesn't lock mid-hunt. The browser drops the lock when the tab is hidden.
  let wakeLock = null;
  async function syncWakeLock() {
    const want = !!(cur && hunt().since && (pip || dr.root.classList.contains("open"))) && document.visibilityState === "visible";
    if (want && !wakeLock && "wakeLock" in navigator) {
      wakeLock = "pending";
      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      } catch { wakeLock = null; }
    } else if (!want && wakeLock && wakeLock !== "pending") {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
  }
  document.addEventListener("visibilitychange", syncWakeLock);

  function paintHunt() {
    if (!cur) return;
    syncWakeLock();
    const h = hunt(), s = elapsed(h);
    dr.count.textContent = nf(h.count);
    dr.time.textContent = fmtTime(s);
    const idleLabel = s ? "▶ Resume" : "▶ Start";
    $("#drPlusLabel").textContent = h.since ? `+${h.inc}` : idleLabel;
    $("#drPlus").classList.toggle("idle", !h.since);
    $("#drMinus").textContent = `−${h.inc}`;
    dr.play.textContent = h.since ? "❚❚ Pause" : s ? "▶ Resume" : "▶ Start";
    dr.play.classList.toggle("running", !!h.since);
    dr.root.classList.toggle("running", !!h.since);
    $("#drCancel").hidden = !isActive(hunts[curKey()]);
    $("#drTimeHint").textContent = h.since ? "Running — keeps going when you close this" : s ? "Paused — press + to resume" : "Press + to start the hunt";
    paintSetup(h);
    paintPhases(h);
    const inputs = { drInc: h.inc, drSetCount: h.count, drH: Math.floor(s / 3600), drM: Math.floor(s / 60) % 60, drS: s % 60 };
    for (const [id, v] of Object.entries(inputs)) if (document.activeElement !== $("#" + id)) $("#" + id).value = v;
    // Chance that a hunter would have hit the shiny by now: 1 - (1 - 1/odds)^n.
    const p = 1 - Math.pow(1 - 1 / h.odds, h.count);
    dr.luckBar.style.width = Math.min(100, p * 100) + "%";
    const ratio = h.count / h.odds;
    dr.luckText.innerHTML = !h.count
      ? "The meter fills as you encounter. The mark is where most hunters (63%) have found theirs."
      : ratio >= 1
        ? `<b>${(ratio).toFixed(2)}× odds.</b> ${(p * 100).toFixed(1)}% of hunters would have it by now — it's out there ✦`
        : `<b>${(p * 100).toFixed(1)}%</b> of hunters would have found it by now · ${(ratio * 100).toFixed(0)}% of odds`;
    paintPip();
  }

  const SHARE_ICO = `<svg class="share-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1"/></svg>`;
  function paintLog() {
    const list = shinies[curKey()] || [];
    dr.log.innerHTML = list.length
      ? list.map((s, i) => `<li>
          <span class="log-n">${sparkSvg()}${i + 1}</span>
          <span class="log-main"><b>${nf(s.count)}</b> encounters · ${fmtShort(s.time)}<small>${fmtDate(s.ts)}${s.method ? ` · ${esc(s.method)}` : ""}${s.odds ? ` · 1/${s.odds}` : ""}${s.phases ? ` · after ${s.phases} ${s.phases === 1 ? "phase" : "phases"}` : ""}</small></span>
          <button class="log-share" data-share="${i}" title="Share card" aria-label="Share card">${SHARE_ICO}</button>
          <button class="log-del" data-del="${i}" title="Delete entry">✕</button>
        </li>`).join("")
      : `<li class="log-empty">No shinies logged yet. Hit <b>Gotcha!</b> when it sparkles.</li>`;
  }

  function refreshCard() {
    if (!cur) return;
    if (state.huntsView) return renderHunts();
    if (state.page !== curGame) return renderSidebar();
    const c = el.gameCards.querySelector(`.pcard[data-id="${cur.id}"]`);
    if (c) c.outerHTML = card(cur, curGame);
    renderGameStats();
  }

  // Encounters only count while the timer runs; pressing + while it's stopped starts it instead.
  function addEncounter(sign = 1) {
    const h = hunt();
    if (sign > 0 && !h.since) return togglePlay();
    setHunt({ count: Math.max(0, h.count + sign * h.inc) });
    if (sign > 0) {
      // A short buzz confirms the tap on phones that support it (Android; iOS ignores it).
      if (navigator.vibrate) navigator.vibrate(12);
      const f = document.createElement("span");
      f.textContent = `+${h.inc}`;
      f.style.left = 40 + Math.random() * 20 + "%";
      dr.float.append(f);
      setTimeout(() => f.remove(), 900);
      for (const c of [dr.count, pip && pip.document.querySelector(".pip-count")].filter(Boolean)) {
        c.classList.remove("bump");
        void c.offsetWidth;
        c.classList.add("bump");
      }
    }
  }

  function togglePlay() {
    const h = hunt();
    setHunt(h.since ? { time: elapsed(h), since: null } : { since: Date.now() - 0 });
  }

  // Two-step buttons instead of confirm dialogs: first tap arms, second tap acts.
  let armed = null, armTimer;
  function arm(btn, label) {
    if (armed === btn) return true;
    disarm();
    armed = btn;
    btn.dataset.label = btn.textContent;
    btn.textContent = label;
    btn.classList.add("armed");
    armTimer = setTimeout(disarm, 3000);
    return false;
  }
  function disarm() {
    clearTimeout(armTimer);
    if (armed) { armed.textContent = armed.dataset.label; armed.classList.remove("armed"); }
    armed = null;
  }

  function gotcha() {
    if (!arm(dr.gotcha, "Tap again to log it ✦")) return;
    disarm();
    const h = hunt();
    const k = curKey();
    const method = h.setup ? evalSetup(curGame, h.setup).label : "";
    const phases = (h.phases || []).length;
    (shinies[k] = shinies[k] || []).push({ count: h.count, time: elapsed(h), odds: h.odds, ...(method ? { method } : {}), ...(phases ? { phases } : {}), ts: Date.now() });
    saveShinies();
    delete hunts[k];
    saveHunts();
    paintHunt();
    paintLog();
    refreshCard();
    celebrate();
    const s = { ...shinies[k].at(-1), g: curGame, m: cur };
    toast(`Shiny ${cur.name} logged ✦`, { label: "Share card", run: () => openShare(s) }, 8000);
  }

  // ---------- Phases: a shiny that isn't the target, logged while the hunt goes on ----------
  function paintPhases(h) {
    const list = h.phases || [];
    $("#drPhaseCount").textContent = list.length ? `Phase ${list.length + 1}` : "";
    $("#drPhases").innerHTML = list.map((p, i) => {
      const m = mons.find(x => x.id === p.id);
      return `<li>${m && m.sprite ? `<img src="${m.sprite}" alt="">` : ""}<span><b>Phase ${i + 1}</b> ${esc(m ? m.name : "?")}${m && m.form && m.form !== "Original" ? ` (${esc(m.form)})` : ""}</span><small>${nf(p.count)} enc.</small></li>`;
    }).join("");
    $("#drPhase").hidden = !isActive(hunts[curKey()]);
  }
  // The picker follows the hunt's game: its regional dexes in order (e.g. Paldea, then
  // Kitakami, then Blueberry), with their numbers, and the page's Extra setting.
  function gameDexOrder(gid) {
    const list = [];
    GAME_INFO[gid].sections.forEach(([p], si) => {
      for (const m of mons) {
        const c = codeIn(m, gid, p);
        if (c) list.push({ m, code: p === "O" || isExtraForm(m, gid) ? "Outside dex" : c, key: (isExtraForm(m, gid) ? 90000 : si * 10000) + gameNum(c) });
      }
    });
    const seen = new Set();
    return list.sort((x, y) => x.key - y.key || x.m.id - y.m.id).filter(x => !seen.has(x.m.id) && seen.add(x.m.id));
  }
  function renderPhaseList() {
    const q = norm($("#drPhaseQ").value.trim());
    const pool = gameDexOrder(curGame).filter(({ m, code }) => m.id !== cur.id
      && (!q || norm(m.name).includes(q) || norm(m.form).includes(q) || norm(code).includes(q) || m.dex.includes(q)));
    $("#drPhaseList").innerHTML = pool.slice(0, 60).map(({ m, code }) => `<button data-phase="${m.id}">${m.sprite ? `<img src="${m.sprite}" alt="">` : ""}<span><small>${esc(code)}</small>${esc(m.name)}${m.form && m.form !== "Original" ? ` <em>${esc(m.form)}</em>` : ""}</span></button>`).join("")
      || `<p class="dr-phase-none">No Pokémon in ${esc(GAME_INFO[curGame].name)} match</p>`;
  }
  function logPhase(id) {
    const h = hunt(), m = mons.find(x => x.id === id);
    const phases = h.phases || [], last = phases.at(-1) || { at: 0, time: 0 };
    const count = Math.max(0, h.count - last.at), time = Math.max(0, elapsed(h) - last.time);
    const method = h.setup ? evalSetup(curGame, h.setup).label : "";
    const k = hk(curGame, m.id);
    (shinies[k] = shinies[k] || []).push({ count, time, odds: h.odds, method: `${method ? method + " · " : ""}Phase ${phases.length + 1}`, ts: Date.now() });
    saveShinies();
    setHunt({ phases: [...phases, { id: m.id, at: h.count, time: elapsed(h), count }] });
    $("#drPhasePick").hidden = true;
    $("#drPhaseQ").value = "";
    renderGameStats();
    toast(`Phase ${phases.length + 1}: shiny ${m.name} logged ✦ — keep going!`);
  }
  $("#drPhase").addEventListener("click", () => {
    const pick = $("#drPhasePick");
    pick.hidden = !pick.hidden;
    if (!pick.hidden) { renderPhaseList(); $("#drPhaseQ").focus(); }
  });
  $("#drPhaseQ").addEventListener("input", renderPhaseList);
  $("#drPhaseList").addEventListener("click", e => {
    const b = e.target.closest("[data-phase]");
    if (b) logPhase(+b.dataset.phase);
  });

  function celebrate() {
    dr.celebrate.innerHTML = `<b>✦ Shiny ${esc(cur.name)}!</b><span>${nf((shinies[curKey()].at(-1)).count)} encounters · logged</span>`;
    dr.celebrate.classList.remove("show");
    void dr.celebrate.offsetWidth;
    dr.celebrate.classList.add("show");
    const r = dr.stage.getBoundingClientRect();
    for (let i = 0; i < 3; i++) setTimeout(() => {
      const fake = { getBoundingClientRect: () => ({ left: r.left + r.width * (.25 + .25 * i), top: r.top + r.height * (.35 + .1 * (i % 2)), width: 0, height: 0 }) };
      burst(fake);
    }, i * 140);
    setTimeout(() => dr.celebrate.classList.remove("show"), 2600);
  }

  // Drawer events
  dr.root.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeDrawer(); });
  $("#drPlus").addEventListener("click", () => addEncounter(1));
  $("#drSprite").addEventListener("click", () => addEncounter(1));
  $("#drMinus").addEventListener("click", () => addEncounter(-1));
  dr.play.addEventListener("click", togglePlay);
  dr.gotcha.addEventListener("click", gotcha);
  $("#drSetup").addEventListener("click", e => {
    const t = e.target.closest("button");
    const patch = t && setupPatch(t, hunt().setup || defaultSetup(curGame));
    if (patch) changeSetup(patch);
  });
  $("#drInc").addEventListener("change", e => setHunt({ inc: Math.max(1, +e.target.value || 1) }));
  $("#drSetCount").addEventListener("change", e => setHunt({ count: Math.max(0, +e.target.value || 0) }));
  for (const id of ["drH", "drM", "drS"]) $("#" + id).addEventListener("change", () => {
    const t = Math.max(0, (+$("#drH").value || 0) * 3600 + (+$("#drM").value || 0) * 60 + (+$("#drS").value || 0));
    setHunt({ time: t, since: hunt().since ? Date.now() : null });
  });
  // Delete the running hunt (two taps), with a short Undo window.
  $("#drCancel").addEventListener("click", e => {
    if (!arm(e.currentTarget, "Tap again to delete")) return;
    disarm();
    const k = curKey(), prev = hunts[k], mon = cur, gid = curGame;
    delete hunts[k];
    saveHunts();
    paintHunt();
    refreshCard();
    toast(`Hunt for ${mon.name} deleted`, { label: "Undo", run: () => {
      hunts[k] = prev;
      saveHunts();
      render();
      if (cur && cur.id === mon.id && curGame === gid) paintHunt();
      toast("Hunt restored ✦");
    } });
  });
  $("#drReset").addEventListener("click", e => {
    if (!arm(e.currentTarget, "Tap again to reset")) return;
    disarm();
    delete hunts[curKey()];
    saveHunts();
    paintHunt();
    refreshCard();
    toast("Hunt reset");
  });
  dr.log.addEventListener("click", e => {
    const sh = e.target.closest("[data-share]");
    if (sh) return openShare({ ...shinies[curKey()][+sh.dataset.share], g: curGame, m: cur });
    const b = e.target.closest("[data-del]");
    if (!b || !arm(b, "Delete?")) return;
    disarm();
    const list = shinies[curKey()];
    list.splice(+b.dataset.del, 1);
    if (!list.length) delete shinies[curKey()];
    saveShinies();
    paintLog();
    refreshCard();
  });
  // On the Active hunts page the same Pokémon can appear for several games.
  const gameOf = c => (c.closest("[data-game]") || {}).dataset?.game || state.page;
  const step = dir => {
    const cards = [...(state.huntsView ? el.huntCards : el.gameCards).querySelectorAll(".pcard")];
    const i = cards.findIndex(c => +c.dataset.id === cur.id && gameOf(c) === curGame);
    if (i < 0) return;
    const next = cards[(i + dir + cards.length) % cards.length];
    openDrawer(+next.dataset.id, gameOf(next));
    next.scrollIntoView({ block: "nearest" });
  };
  $("#drPrev").addEventListener("click", () => step(-1));
  $("#drNext").addEventListener("click", () => step(1));
  document.addEventListener("keydown", e => {
    if (!cur || !dr.root.classList.contains("open")) return;
    const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if (e.key === "Escape") { e.stopImmediatePropagation(); return closeDrawer(); }
    if (typing) return;
    const act = { " ": () => addEncounter(1), "+": () => addEncounter(1), "=": () => addEncounter(1), "-": () => addEncounter(-1),
      p: togglePlay, P: togglePlay, ArrowLeft: () => step(-1), ArrowRight: () => step(1) }[e.key];
    if (act && !(e.key === " " && document.activeElement.tagName === "BUTTON" && document.activeElement !== dr.panel)) {
      e.preventDefault(); e.stopImmediatePropagation(); act();
    } else if (e.key === "/") e.stopImmediatePropagation();
  }, true);



  // ---------- Dex Entry (Living Dex): all shinies of a species across games ----------
  const en = { root: $("#entry"), panel: $("#entry .drawer-panel"), log: $("#enLog") };
  let entryMon = null, entryFocus = null, editing = null, pendingHunt = null, adding = false;
  // Setup for "Add a shiny": starts from the game's remembered hunt setup.
  let addSetup = null;
  const addSetupFor = g => ({ ...defaultSetup(g), ...((prefs[g] || {}).setup || {}) });
  function paintAddSetup(g) {
    const box = $("#enSetup");
    if (!box) return;
    box.hidden = !!GAME_INFO[g].noOdds || !HUNT_SETUP[g];
    if (box.hidden) return;
    box.innerHTML = `<div class="en-setup-head"><span>Hunt method</span><b>1/${nf(evalSetup(g, addSetup).odds)}</b></div>${setupHtml(g, addSetup)}`;
  }
  const speciesOf = m => mons.filter(x => x.dex === m.dex);

  // Next evolution entries for a form. PokeAPI chains are per species, so regional
  // lines are resolved here: a regional form only continues into the same form or
  // into its region-exclusive evolution; other forms skip those.
  const REGIONAL = ["Alolan", "Galarian", "Hisuian", "Paldean", "White Stripe"];
  const EXCLUSIVE = { 862: "Galarian", 863: "Galarian", 864: "Galarian", 865: "Galarian", 866: "Galarian", 867: "Galarian",
    902: "White Stripe", 903: "Hisuian", 904: "Hisuian", 980: "Paldean" };
  function evolutionsOf(m) {
    const next = (window.EVO[+m.dex] || []).flatMap(d => mons.filter(x => +x.dex === d));
    const R = REGIONAL.includes(m.form) ? m.form : "";
    if (R) return next.filter(x => x.form === R || EXCLUSIVE[+x.dex] === R);
    const ownForms = new Set(speciesOf(m).map(x => x.form));
    return next.filter(x => !EXCLUSIVE[+x.dex] && !(REGIONAL.includes(x.form) && ownForms.has(x.form)));
  }



  // Game picker for manual adds: tiles grouped into the main series (games this form is in)
  // and places that also count (GO, HOME), newest first. A filter appears once the list
  // grows, so adding games later only means adding them to GAME_INFO.
  function gamePicker(ids, selected) {
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

  function openEntry(id) {
    entryMon = mons.find(m => m.id === id);
    editing = null;
    adding = false;
    paintEntry();
    if (!en.root.classList.contains("open")) {
      entryFocus = document.activeElement;
      en.root.classList.add("open");
      en.root.setAttribute("aria-hidden", "false");
      document.body.classList.add("drawer-open");
      setTimeout(() => en.panel.focus(), 50);
    }
    en.panel.querySelector(".dr-scroll").scrollTop = 0;
  }

  function closeEntry() {
    if (!en.root.classList.contains("open")) return;
    en.root.classList.remove("open");
    en.root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
    if (entryFocus) entryFocus.focus({ preventScroll: true });
    entryMon = null;
  }

  function paintEntry() {
    const m = entryMon, forms = speciesOf(m);
    const logs = forms.flatMap(shiniesOf).sort((a, b) => b.ts - a.ts);
    $("#enChip").textContent = `National Dex #${m.dex}`;
    $("#enImg").src = m.sprite || "";
    $("#enMeta").textContent = `${region(m.gen)} · Gen ${m.gen}`;
    $("#enStatus").innerHTML = statusNote(m);
    $("#enName").innerHTML = `${esc(m.name)}${logs.length ? ` <span class="en-x">✦${logs.length}</span>` : ""}`;
    $("#enForms").innerHTML = forms.length > 1
      ? forms.map(f => `<button class="en-form ${f.id === m.id ? "active" : ""}" data-form="${f.id}" title="${esc(f.form || f.name)}">
          ${f.sprite ? `<img src="${f.sprite}" alt="">` : ""}<span>${esc(f.form || "Original")}</span></button>`).join("")
      : m.form ? `<span class="form-tag">${esc(m.form)}</span>` : "";

    const enc = logs.reduce((s, l) => s + l.count, 0), time = logs.reduce((s, l) => s + l.time, 0);
    $("#enStats").innerHTML = [
      [logs.length, "Shinies"], [nf(enc), "Encounters"], [logs.length ? fmtShort(time) : "—", "Hunt time"],
    ].map(([v, l]) => `<div class="en-stat"><b>${v}</b><span>${l}</span></div>`).join("");


    en.log.innerHTML = logs.length ? logs.map(l => {
      const g = GAME_INFO[l.g], key = `${l.g}:${l.m.id}:${l.i}`, open = editing === key;
      const d = new Date(l.ts), local = l.ts ? new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : "";
      return `<li class="en-item ${open ? "open" : ""}" style="--accent:${g.accent};--accent2:${g.accent2}">
        <button class="en-row" data-edit="${key}">
          <span class="en-thumb">${l.m.sprite ? `<img src="${l.m.sprite}" alt="">` : ""}</span>
          <span class="en-main">
            <b>${esc(l.m.name)}${l.m.form ? ` <em>${esc(l.m.form)}</em>` : ""}</b>
            <span class="en-game">${esc(g.name)}${l.caughtIn && GAME_INFO[l.caughtIn] ? ` <em class="en-from">· caught in ${esc(GAME_INFO[l.caughtIn].abbr || GAME_INFO[l.caughtIn].name)}</em>` : ""}</span>
            <small>${fmtDate(l.ts)}${l.method ? ` · ${esc(l.method)}` : ""}${l.odds && !GAME_INFO[l.g].noOdds ? ` · 1/${l.odds}` : ""}${l.phases ? ` · after ${l.phases} ${l.phases === 1 ? "phase" : "phases"}` : ""}</small>
          </span>
          <span class="en-nums"><b>${nf(l.count)}</b><small>${fmtShort(l.time)}</small></span>
        </button>
        ${open ? `<div class="en-edit" data-key="${key}">
          <label>Encounters<input type="number" min="0" name="count" value="${l.count}"></label>
          <label>Hours<input type="number" min="0" name="h" value="${Math.floor(l.time / 3600)}"></label>
          <label>Min<input type="number" min="0" max="59" name="m" value="${Math.floor(l.time / 60) % 60}"></label>
          <label>Sec<input type="number" min="0" max="59" name="s" value="${l.time % 60}"></label>
          <label class="wide">Caught on<input type="datetime-local" name="ts" value="${local}"></label>
          ${(() => {
            const prev = (l.evolvedFrom || []).length && mons.find(x => x.id === l.evolvedFrom.at(-1));
            return prev ? `<button class="en-devolve" data-devolve title="Move this shiny back to ${esc(prev.name)}">
              <svg class="undo-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></svg>Undo evolve${prev.sprite ? `<img src="${prev.sprite}" alt="">` : ""}<b>${esc(prev.name)}</b></button>` : "";
          })()}
          ${(() => {
            const evos = evolutionsOf(l.m);
            return evos.length ? `<div class="en-evolve"><span>Evolve into</span>${evos.map(x => `<button class="en-evo" data-evolve="${x.id}" title="Move this shiny to ${esc(x.name)}${x.form ? " (" + esc(x.form) + ")" : ""}">
              ${x.sprite ? `<img src="${x.sprite}" alt="">` : ""}<b>${esc(x.name)}</b>${x.form && x.form !== "Original" ? `<small>${esc(x.form)}</small>` : ""}</button>`).join("")}</div>`
              : `<div class="en-evolve final"><span>Final evolution ✦</span></div>`;
          })()}
          ${(() => {
            // Moved through HOME to another game: the shiny then counts there.
            const to = LOG_GAMES.filter(x => x !== l.g && (GAME_INFO[x].logOnly || l.m.games[x]))
              .sort((x, y) => !!GAME_INFO[x].logOnly - !!GAME_INFO[y].logOnly || (GAME_INFO[y].released || "").localeCompare(GAME_INFO[x].released || ""));
            return to.length ? `<div class="en-move"><span>Move to game</span>${to.map(x => `<button class="en-move-btn" data-move="${x}" style="--accent:${GAME_INFO[x].accent};--accent2:${GAME_INFO[x].accent2}">${esc(GAME_INFO[x].abbr || GAME_INFO[x].name)}</button>`).join("")}</div>` : "";
          })()}
          <div class="en-edit-actions">
            <button class="en-save" data-save>Save</button>
            <button class="en-share" data-share title="Share card">${SHARE_ICO}Share</button>
            <button class="dr-danger" data-delete>Delete</button>
          </div>
        </div>` : ""}
      </li>`;
    }).join("") : `<li class="log-empty">No shinies of ${esc(m.name)} yet. Start a hunt below or add one manually ✦</li>`;

    const addGames = LOG_GAMES.filter(g => GAME_INFO[g].logOnly || m.games[g]);
    // Shinies that only exist as Pokémon HOME gifts start with HOME selected.
    // Otherwise the newest main-series game this form is in.
    const newest = addGames.filter(g => !GAME_INFO[g].logOnly).sort((x, y) => GAME_INFO[y].released.localeCompare(GAME_INFO[x].released))[0];
    const preset = (EVENT_ONLY[+m.dex] || "").includes("Pokémon HOME gift") ? "home" : newest || addGames[0];
    if (adding && !addSetup) addSetup = addSetupFor(preset);
    const now = new Date(), nowLocal = new Date(now - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    $("#enAdd").innerHTML = adding ? `<div class="en-add-form">
        <div class="wide">${gamePicker(addGames, preset)}</div>
        <label>Encounters<input type="number" min="0" name="count" value="0"></label>
        <label>Hours<input type="number" min="0" name="h" value="0"></label>
        <label>Min<input type="number" min="0" max="59" name="m" value="0"></label>
        <label>Sec<input type="number" min="0" max="59" name="s" value="0"></label>
        <div class="wide en-setup" id="enSetup"></div>
        <label class="wide">Caught on<input type="datetime-local" name="ts" value="${nowLocal}"></label>
        <div class="en-edit-actions">
          <button class="en-save" data-add-save>Add ${esc(m.name)}${m.form && m.form !== "Original" ? ` (${esc(m.form)})` : ""} ✦</button>
          <button class="dr-danger en-cancel" data-add-cancel>Cancel</button>
        </div>
      </div>`
      : `<button class="en-add-btn" data-add-open><span>+</span> Add a shiny manually</button>`;
    if (adding) paintAddSetup(preset);

    const games = GAMES.filter(gid => m.games[gid]);
    $("#enGames").innerHTML = games.length
      ? games.map(gid => {
        const g = GAME_INFO[gid], h = hunts[hk(gid, m.id)];
        return `<button class="en-game-chip" data-hunt="${gid}" style="--accent:${g.accent};--accent2:${g.accent2}">
          <span>${esc(g.short || g.name)}</span><small>${isActive(h) ? `⚡ ${nf(h.count)}` : codeLabel(m, gid)}</small></button>`;
      }).join("")
      : `<p class="en-none">Not obtainable in the tracked games.</p>`;
  }

  // Picking a game loads its setup (GO and HOME have none); defaults to the setup last used there.
  en.root.addEventListener("change", e => {
    if (e.target.name !== "game" || !e.target.closest(".en-add-form")) return;
    addSetup = addSetupFor(e.target.value);
    paintAddSetup(e.target.value);
  });

  en.root.addEventListener("input", e => {
    if (!e.target.classList.contains("gp-filter")) return;
    const pick = e.target.closest(".game-pick"), q = e.target.value.trim().toLowerCase();
    pick.querySelectorAll(".gp-tile").forEach(t => { t.hidden = !!q && !t.dataset.name.includes(q); });
    pick.querySelectorAll(".gp-group").forEach(g => { g.hidden = !g.querySelector(".gp-tile:not([hidden])"); });
    pick.querySelector(".gp-empty").hidden = !!pick.querySelector(".gp-tile:not([hidden])");
  });

  en.root.addEventListener("click", e => {
    if (e.target.closest("[data-eclose]")) return closeEntry();
    if (e.target.closest("[data-add-open]")) { adding = true; addSetup = null; editing = null; return paintEntry(); }
    if (e.target.closest("[data-add-cancel]")) { adding = false; return paintEntry(); }
    const setupBtn = e.target.closest("#enSetup button");
    if (setupBtn) {
      const g = en.root.querySelector('.en-add-form [name="game"]:checked').value, patch = setupPatch(setupBtn, addSetup);
      if (patch) { addSetup = patchSetup(g, addSetup, patch); paintAddSetup(g); }
      return;
    }
    const addBtn = e.target.closest("[data-add-save]");
    if (addBtn) {
      const f = addBtn.closest(".en-add-form"), val = n => f.querySelector(`[name="${n}"]:not([type="radio"]), [name="${n}"]:checked`).value;
      const g = val("game"), ts = new Date(val("ts")).getTime(), num = n => Math.max(0, +val(n) || 0);
      const k = hk(g, entryMon.id);
      (shinies[k] = shinies[k] || []).push({ count: num("count"), time: num("h") * 3600 + num("m") * 60 + num("s"), ...(GAME_INFO[g].noOdds || !HUNT_SETUP[g] ? { odds: null } : { odds: evalSetup(g, addSetup).odds, method: evalSetup(g, addSetup).label }), ts: isNaN(ts) ? Date.now() : ts, manual: true });
      shinies[k].sort((x, y) => x.ts - y.ts);
      saveShinies();
      adding = false;
      const r = addBtn.getBoundingClientRect();
      paintEntry();
      refreshHomeCard(entryMon.id);
      renderHomeStats();
      burst({ getBoundingClientRect: () => r });
      return toast(`Shiny ${entryMon.name} logged in ${GAME_INFO[g].name} ✦`);
    }
    const form = e.target.closest("[data-form]");
    if (form) { entryMon = mons.find(m => m.id === +form.dataset.form); editing = null; return paintEntry(); }
    const row = e.target.closest("[data-edit]");
    if (row) { editing = editing === row.dataset.edit ? null : row.dataset.edit; return paintEntry(); }
    const hunt = e.target.closest("[data-hunt]");
    if (hunt) {
      pendingHunt = entryMon.id;
      closeEntry();
      navigate(hunt.dataset.hunt);
      return;
    }
    const box = e.target.closest(".en-edit");
    if (!box) return;
    const [gid, id, i] = box.dataset.key.split(":"), list = shinies[`${gid}:${id}`];
    // Move a log entry to another form of the chain and follow it with the panel.
    const moveEntry = (to, patch, msg, fromEl) => {
      const from = mons.find(m => m.id === +id);
      const [entry] = list.splice(+i, 1);
      if (!list.length) delete shinies[`${gid}:${id}`];
      const dest = shinies[hk(gid, to.id)] = shinies[hk(gid, to.id)] || [];
      dest.push({ ...entry, ...patch(entry, from) });
      dest.sort((x, y) => x.ts - y.ts);
      saveShinies();
      refreshHomeCard(from.id);
      refreshHomeCard(to.id);
      renderHomeStats();
      const r = fromEl.getBoundingClientRect();
      openEntry(to.id);
      editing = `${gid}:${to.id}:${dest.findIndex(x => x.ts === entry.ts)}`;
      paintEntry();
      burst({ getBoundingClientRect: () => r });
      toast(msg(from));
    };
    const mv = e.target.closest("[data-move]");
    if (mv) {
      const to = mv.dataset.move, mon = mons.find(m => m.id === +id);
      const [entry] = list.splice(+i, 1);
      if (!list.length) delete shinies[`${gid}:${id}`];
      const caughtIn = entry.caughtIn || gid;
      const moved = { ...entry, caughtIn };
      if (caughtIn === to) delete moved.caughtIn;
      const dest = shinies[hk(to, mon.id)] = shinies[hk(to, mon.id)] || [];
      dest.push(moved);
      dest.sort((x, y) => (x.ts || 0) - (y.ts || 0));
      saveShinies();
      editing = `${to}:${mon.id}:${dest.indexOf(moved)}`;
      paintEntry();
      refreshHomeCard(mon.id);
      renderHomeStats();
      return toast(`Shiny ${mon.name} moved to ${GAME_INFO[to].name}`, { label: "Undo", run: () => {
        const d = shinies[hk(to, mon.id)], j = d.indexOf(moved);
        if (j >= 0) d.splice(j, 1);
        if (!d.length) delete shinies[hk(to, mon.id)];
        (shinies[`${gid}:${id}`] = shinies[`${gid}:${id}`] || []).push(entry);
        shinies[`${gid}:${id}`].sort((x, y) => (x.ts || 0) - (y.ts || 0));
        saveShinies();
        editing = null;
        if (entryMon) paintEntry();
        refreshHomeCard(mon.id);
        renderHomeStats();
      } });
    }
    const back = e.target.closest("[data-devolve]");
    if (back) {
      const hist = list[+i].evolvedFrom, to = mons.find(m => m.id === hist.at(-1));
      return moveEntry(to, en => ({ evolvedFrom: en.evolvedFrom.slice(0, -1) }), from => `${from.name} is back to ${to.name}`, back);
    }
    const evo = e.target.closest("[data-evolve]");
    if (evo) {
      const to = mons.find(m => m.id === +evo.dataset.evolve);
      return moveEntry(to, (en, from) => ({ evolvedFrom: [...(en.evolvedFrom || []), from.id] }), from => `${from.name} evolved into ${to.name} ✦`, evo);
    }
    if (e.target.closest("[data-share]")) return openShare({ ...list[+i], g: gid, m: mons.find(m => m.id === +id) });
    if (e.target.closest("[data-save]")) {
      const v = n => Math.max(0, +box.querySelector(`[name="${n}"]`).value || 0);
      const ts = new Date(box.querySelector('[name="ts"]').value).getTime();
      Object.assign(list[+i], { count: v("count"), time: v("h") * 3600 + v("m") * 60 + v("s"), ts: isNaN(ts) ? list[+i].ts : ts });
      saveShinies();
      editing = null;
      paintEntry();
      toast("Entry saved");
    } else if (e.target.closest("[data-delete]")) {
      const b = e.target.closest("[data-delete]");
      if (!arm(b, "Tap again to delete")) return;
      disarm();
      list.splice(+i, 1);
      if (!list.length) delete shinies[`${gid}:${id}`];
      saveShinies();
      editing = null;
      paintEntry();
      refreshHomeCard(+id);
      renderHomeStats();
      toast("Entry deleted");
    }
  });


  function refreshHomeCard(id) {
    const c = el.cards.querySelector(`.pcard[data-id="${id}"]`);
    if (c) c.outerHTML = card(mons.find(m => m.id === id));
  }

  const entryStep = dir => {
    const ids = [...el.cards.querySelectorAll(".pcard")].map(c => +c.dataset.id);
    const i = ids.indexOf(entryMon.id);
    if (i < 0) return;
    const next = ids[(i + dir + ids.length) % ids.length];
    openEntry(next);
    el.cards.querySelector(`.pcard[data-id="${next}"]`).scrollIntoView({ block: "nearest" });
  };
  $("#enPrev").addEventListener("click", () => entryStep(-1));
  $("#enNext").addEventListener("click", () => entryStep(1));
  document.addEventListener("keydown", e => {
    if (!entryMon || !en.root.classList.contains("open")) return;
    if (e.key === "Escape") { e.stopImmediatePropagation(); return closeEntry(); }
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const act = { ArrowLeft: () => entryStep(-1), ArrowRight: () => entryStep(1) }[e.key];
    if (act) { e.preventDefault(); e.stopImmediatePropagation(); act(); }
    else if (e.key === "/") e.stopImmediatePropagation();
  }, true);

  // ---------- Random hunt (game pages) ----------
  // A slot-machine reel of candidates decelerates onto a random pick: a shiny still missing
  // in this game, huntable (not locked or event-only) and not already being hunted.
  const rl = { root: $("#roulette"), strip: $("#rlStrip"), pick: null, gid: "" };
  const ITEM = 104; // tile width + gap, keep in sync with .rl-tile
  function spin() {
    const gid = state.page, g = GAME_INFO[gid];
    const pool = mons.filter(m => m.games[gid] && inGamePool(m, gid) && !gHas(gid)(m) && huntable(m) && !isActive(hunts[hk(gid, m.id)]));
    if (!pool.length) return toast("Nothing left to hunt in this game ✦");
    const pickFrom = () => pool[Math.floor(Math.random() * pool.length)];
    rl.gid = gid;
    rl.pick = pickFrom();
    const reel = Array.from({ length: 42 }, pickFrom);
    const at = reel.length - 4;
    reel[at] = rl.pick;
    rl.root.style.setProperty("--accent", g.accent);
    rl.root.style.setProperty("--accent2", g.accent2);
    $("#rlGame").textContent = g.name;
    $("#rlName").textContent = "Spinning…";
    $("#rlMeta").textContent = "";
    rl.root.classList.remove("landed");
    rl.root.hidden = false;
    document.body.classList.add("drawer-open");
    rl.strip.style.transition = "none";
    rl.strip.style.transform = "translateX(0)";
    rl.strip.innerHTML = reel.map((m, i) => `<div class="rl-tile ${i === at ? "win" : ""}"><img src="${m.sprite}" alt=""></div>`).join("");
    const win = rl.strip.parentElement.clientWidth;
    const target = -(at * ITEM - (win / 2 - (ITEM - 8) / 2)) + (Math.random() * 40 - 20);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      rl.strip.style.transition = reduce ? "none" : "transform 3.2s cubic-bezier(.12, .75, .1, 1)";
      rl.strip.style.transform = `translateX(${target}px)`;
      if (reduce) land();
    }));
  }
  function land() {
    if (!rl.pick || rl.root.classList.contains("landed")) return;
    // Settle exactly on the winner after the slightly-off stop.
    const win = rl.strip.parentElement.clientWidth, at = [...rl.strip.children].findIndex(t => t.classList.contains("win"));
    rl.strip.style.transition = "transform .35s ease-out";
    rl.strip.style.transform = `translateX(${-(at * ITEM - (win / 2 - (ITEM - 8) / 2))}px)`;
    rl.root.classList.add("landed");
    const m = rl.pick;
    $("#rlName").textContent = m.name + (m.form && m.form !== "Original" ? ` (${m.form})` : "");
    $("#rlMeta").textContent = `#${m.dex} · ${GAME_INFO[rl.gid].name} ${codes(m, rl.gid).join(" / ")}`;
    setTimeout(() => burst(rl.strip.children[at]), 150);
  }
  function closeRoulette() {
    rl.root.hidden = true;
    rl.pick = null;
    if (!dr.root.classList.contains("open")) document.body.classList.remove("drawer-open");
  }
  rl.strip.addEventListener("transitionend", e => { if (e.propertyName === "transform" && !rl.root.classList.contains("landed")) land(); });
  $("#randomHunt").addEventListener("click", spin);
  $("#rlAgain").addEventListener("click", spin);
  $("#rlGo").addEventListener("click", () => {
    if (!rl.pick || !rl.root.classList.contains("landed")) return;
    const { pick, gid } = rl;
    closeRoulette();
    openDrawer(pick.id, gid);
  });
  rl.root.addEventListener("click", e => { if (e.target === rl.root || e.target.closest("[data-rlclose]")) closeRoulette(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !rl.root.hidden) { e.stopImmediatePropagation(); closeRoulette(); } }, true);

  // ---------- Pop-out: always-on-top mini window (Document Picture-in-Picture, Chrome/Edge) ----------
  const pipBtn = $("#drPop");
  if (!("documentPictureInPicture" in window)) pipBtn.remove();

  async function popOut() {
    if (pip) return pip.focus();
    try {
      pip = await documentPictureInPicture.requestWindow({ width: 360, height: 196 });
    } catch {
      return toast("Pop-out isn't available here");
    }
    const d = pip.document;
    for (const l of document.querySelectorAll('link[rel="stylesheet"]')) {
      d.head.append(Object.assign(d.createElement("link"), { rel: "stylesheet", href: l.href }));
    }
    if (document.documentElement.dataset.theme) d.documentElement.dataset.theme = document.documentElement.dataset.theme;
    d.body.className = "pip-body";
    d.body.innerHTML = `<div class="pip">
      <button class="pip-stage" title="+1 (Space)"><img class="pip-img" alt=""></button>
      <div class="pip-info">
        <span class="pip-game"></span>
        <span class="pip-name"></span>
        <span class="pip-time"><i></i><b></b></span>
      </div>
      <button class="pip-play" title="Start / pause (P)"></button>
      <div class="pip-row">
        <div class="pip-tally"><span class="pip-count"></span><span class="pip-odds"></span></div>
        <button class="pip-minus" title="−1 (−)"></button>
        <button class="pip-plus" title="+1 (Space)"></button>
      </div>
      <div class="pip-meter"><i></i></div>
    </div>`;
    d.querySelector(".pip-plus").onclick = () => addEncounter(1);
    d.querySelector(".pip-stage").onclick = () => addEncounter(1);
    d.querySelector(".pip-minus").onclick = () => addEncounter(-1);
    d.querySelector(".pip-play").onclick = togglePlay;
    pip.addEventListener("keydown", e => {
      const act = { " ": () => addEncounter(1), "+": () => addEncounter(1), "=": () => addEncounter(1), "-": () => addEncounter(-1), p: togglePlay, P: togglePlay }[e.key];
      if (act) { e.preventDefault(); act(); }
    });
    pip.addEventListener("pagehide", () => {
      pip = null;
      setTimeout(syncWakeLock);
      pipBtn.classList.remove("on");
      if (!dr.root.classList.contains("open")) cur = null;
    });
    pipBtn.classList.add("on");
    paintPip();
  }

  function paintPip() {
    if (!pip || !cur) return;
    const d = pip.document, g = GAME_INFO[curGame], h = hunt(), s = elapsed(h);
    d.title = `${nf(h.count)} · ${cur.name}`;
    d.body.style.setProperty("--accent", g.accent);
    d.body.style.setProperty("--accent2", g.accent2);
    d.body.classList.toggle("running", !!h.since);
    const img = d.querySelector(".pip-img");
    const src = new URL(cur.sprite || "", location.href).href;
    if (img.src !== src) img.src = src;
    d.querySelector(".pip-game").textContent = g.abbr;
    d.querySelector(".pip-name").textContent = cur.name + (cur.form ? ` · ${cur.form}` : "");
    d.querySelector(".pip-time b").textContent = fmtTime(s);
    d.querySelector(".pip-count").textContent = nf(h.count);
    // Same luck meter as the Hunt Deck: chance a hunter would have found it by now.
    const p = 1 - Math.pow(1 - 1 / h.odds, h.count);
    d.querySelector(".pip-odds").textContent = `1/${nf(h.odds)}${h.count ? ` · ${(h.count / h.odds).toFixed(2)}×` : ""}`;
    d.querySelector(".pip-meter i").style.width = Math.min(100, p * 100) + "%";
    d.querySelector(".pip-plus").textContent = h.since ? `+${h.inc}` : "▶";
    d.querySelector(".pip-minus").textContent = `−${h.inc}`;
    d.querySelector(".pip-play").textContent = h.since ? "❚❚" : "▶";
  }
  pipBtn.addEventListener("click", popOut);

  // One clock for everything that runs: the open drawer and live hunt strips on cards.
  setInterval(() => {
    if (cur && hunt().since) { dr.time.textContent = fmtTime(elapsed(hunt())); paintPip(); }
    for (const n of document.querySelectorAll("#gameCards [data-live], #huntCards [data-live]")) {
      const gid = gameOf(n);
      const h = gid && hunts[hk(gid, n.dataset.live)];
      if (h && h.since) n.textContent = fmtTime(elapsed(h));
    }
    if (state.huntsView && $("#huntsTime")) $("#huntsTime").textContent = fmtShort(activeHunts().reduce((s, x) => s + elapsed(x.h), 0));
  }, 1000);

  // ---------- Events ----------
  for (const root of [el.cards, el.gameCards, el.huntCards]) {
    const activate = c => root === el.cards ? openEntry(+c.dataset.id) : openDrawer(+c.dataset.id, gameOf(c));
    root.addEventListener("click", e => {
      if (e.target.closest(".wiki")) return;
      const c = e.target.closest(".pcard");
      if (c) activate(c);
    });
    root.addEventListener("keydown", e => {
      const c = e.target.closest(".pcard");
      if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); activate(c); }
    });
    // Holo tilt + sheen follow the pointer.
    root.addEventListener("pointermove", e => {
      const c = e.target.closest(".pcard");
      if (!c || e.pointerType !== "mouse") return;
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty("--mx", x * 100 + "%");
      c.style.setProperty("--my", y * 100 + "%");
      c.style.setProperty("--ry", (x - .5) * 14 + "deg");
      c.style.setProperty("--rx", (.5 - y) * 14 + "deg");
      c.classList.add("tilt");
    });
    root.addEventListener("pointerout", e => {
      const c = e.target.closest(".pcard");
      if (c && !c.contains(e.relatedTarget)) c.classList.remove("tilt");
    });
  }

  el.regions.addEventListener("click", e => {
    const r = e.target.closest(".region");
    if (r) { state.gen = +r.dataset.gen; render(); }
  });
  el.dexTabs.addEventListener("click", e => {
    const t = e.target.closest(".seg");
    if (t) { state.tab = t.dataset.tab; renderGame(); }
  });
  // A recommendation opens its Dex Entry, where "Hunt it in" starts the hunt.
  el.upNext.addEventListener("click", e => {
    const b = e.target.closest("[data-jump]");
    if (b) openEntry(+b.dataset.jump);
  });
  $("#recShuffle").addEventListener("click", () => { shuffleRecs(); renderHomeStats(); });

  $("#fShare").addEventListener("click", () => {
    prefs.shareAcrossGames = !sharing();
    savePrefs();
    render();
    toast(sharing() ? "Shinies now count in every game they appear in ✦" : "Each game counts only its own shinies again");
  });

  for (const [id, key] of [["#fMissing", "missing"], ["#fForms", "forms"], ["#gMissing", "gMissing"], ["#gForms", "gOutside"]]) {
    $(id).addEventListener("click", e => {
      state[key] = !state[key];
      e.currentTarget.setAttribute("aria-pressed", state[key]);
      render();
    });
  }
  let t;
  for (const input of [el.q, el.gq]) input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 120); });

  document.addEventListener("keydown", e => {
    const input = state.page ? el.gq : el.q;
    if (e.key === "/" && document.activeElement !== input && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    if (e.key === "Escape" && document.activeElement === input) { input.value = ""; render(); input.blur(); }
    if (e.key === "Escape") document.body.classList.remove("menu-open");
  });

  // Routing with clean paths: / is the Shiny Dex, /<game> a game page, /hunts the hunts.
  // GitHub Pages has no server routing, so 404.html sends unknown paths back to the app
  // as ?p=/<path>; old #/<path> links keep working too.
  function navigate(path, replace = false) {
    history[replace ? "replaceState" : "pushState"](null, "", BASE + path.replace(/^\//, ""));
    route();
  }
  function route() {
    const id = location.pathname.startsWith(BASE) ? decodeURIComponent(location.pathname.slice(BASE.length)).replace(/\/$/, "") : "";
    const page = GAME_INFO[id] && !GAME_INFO[id].logOnly ? id : "";
    const huntsView = id === "hunts";
    if (page !== state.page || huntsView !== state.huntsView) {
      closeDrawer(); closeEntry(); state.page = page; state.huntsView = huntsView; state.tab = ""; el.gq.value = ""; scrollTo(0, 0);
    }
    document.body.classList.remove("menu-open");
    render();
    if (pendingHunt && state.page) { openDrawer(pendingHunt); pendingHunt = null; }
  }
  addEventListener("popstate", route);
  addEventListener("hashchange", () => { if (location.hash.startsWith("#/")) navigate(location.hash.slice(2), true); });
  // Internal links navigate without reloading the page.
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith(BASE) || url.hash) return;
    e.preventDefault();
    navigate(url.pathname.slice(BASE.length));
  });
  {
    const redirected = new URLSearchParams(location.search).get("p");
    if (redirected !== null) history.replaceState(null, "", BASE + redirected.replace(/^\//, "") + location.hash);
    else if (location.hash.startsWith("#/")) history.replaceState(null, "", BASE + location.hash.slice(2));
  }

  // Mobile menu
  $("#menuBtn").addEventListener("click", () => document.body.classList.add("menu-open"));
  $("#scrim").addEventListener("click", () => document.body.classList.remove("menu-open"));
  // Dialogs opened from the menu (Backups, V2 import, Reset) shouldn't sit on top of it on phones.
  $("#sidebar").addEventListener("click", e => {
    if (e.target.closest("#backupsOpen, #v2Open, #reset, #export")) document.body.classList.remove("menu-open");
  });

  // Theme
  const applyTheme = th => th ? document.documentElement.dataset.theme = th : delete document.documentElement.dataset.theme;
  applyTheme(safe(() => localStorage.getItem(THEME)));
  const flipTheme = () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    applyTheme(next);
    safe(() => localStorage.setItem(THEME, next));
  };
  $("#themeBtn").addEventListener("click", flipTheme);
  $("#themeBtnTop").addEventListener("click", flipTheme);

  // ---------- Serialisation ----------
  // Locally everything is keyed by entry id; backups and the cloud use the sheet's stable
  // keyword ("raichu-1") so data survives a data update that renumbers entries.
  const keyById = new Map(mons.map(m => [m.id, m.key]));
  const idByKey = new Map(mons.map(m => [m.key, m.id]));
  const outEntry = s => s.evolvedFrom ? { ...s, evolvedFrom: s.evolvedFrom.map(id => keyById.get(id)) } : s;
  // Version-2 backups stored evolvedFrom as ids, newer data as keywords.
  const inEntry = s => s.evolvedFrom ? { ...s, evolvedFrom: s.evolvedFrom.map(k => typeof k === "number" ? k : idByKey.get(k)).filter(Boolean) } : s;
  const outMap = (obj, f = x => x) => Object.fromEntries(Object.entries(obj).map(([k, v]) => {
    const i = k.indexOf(":");
    return [`${k.slice(0, i)}:${keyById.get(+k.slice(i + 1))}`, f(v)];
  }));
  const inMap = (obj, f = x => x) => Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => {
    const i = k.indexOf(":"), id = idByKey.get(k.slice(i + 1));
    return id ? [`${k.slice(0, i)}:${id}`, f(v)] : null;
  }).filter(Boolean));

  function snapshot() {
    return {
      version: 3,
      caught: [...caught].map(id => keyById.get(id)).filter(Boolean),
      hunts: outMap(hunts),
      shinies: outMap(shinies, list => list.map(outEntry)),
      prefs: { ...prefs },
    };
  }

  // Replace all progress (backup import or cloud) and redraw whatever is open.
  function applyData(data, { quiet = false } = {}) {
    caught = new Set((data.caught || []).map(k => idByKey.get(k)).filter(Boolean));
    hunts = inMap(data.hunts);
    shinies = inMap(data.shinies, list => list.map(inEntry));
    for (const k of Object.keys(prefs)) delete prefs[k];
    Object.assign(prefs, data.prefs || {});
    safe(() => {
      localStorage.setItem(STORE, JSON.stringify([...caught]));
      localStorage.setItem(HUNTS, JSON.stringify(hunts));
      localStorage.setItem(SHINIES, JSON.stringify(shinies));
      localStorage.setItem(PREFS, JSON.stringify(prefs));
    });
    if (!quiet) sync("data");
    render();
    if (cur && dr.root.classList.contains("open")) { paintHunt(); paintLog(); }
    if (entryMon) paintEntry();
  }

  const hasLocalData = () => caught.size > 0 || Object.keys(hunts).length > 0 || Object.keys(shinies).length > 0;
  window.ShinyApp = { snapshot, applyData, hasLocalData, toast, render };


  // ---------- Import from ShinyCheck V2 ----------
  // V2 lives on the same origin (justin4625.github.io/ShinyCheck/), so its localStorage is
  // readable here. V2 keys: <game>_shinyData_<id>_<n> {pokemonName, counter, timer, timestamp},
  // <game>_shiny_<id> (count; GO may count shinies without data), <game>_hunt_<id> {counter, timer}.
  // Ids are national dex numbers, or PokeAPI form ids (10091…) for regional forms.
  // Nothing in V2 is changed; imported entries carry a "v2" marker so importing twice is harmless.
  const V2_GAMES = { plza: "lza", sv: "sv", pla: "pla", pogo: "pogo" };
  const V2_FORMS = {
    10091: "Alolan Rattata", 10092: "Alolan Raticate", 10100: "Alolan Raichu", 10101: "Alolan Sandshrew", 10102: "Alolan Sandslash",
    10103: "Alolan Vulpix", 10104: "Alolan Ninetales", 10105: "Alolan Diglett", 10106: "Alolan Dugtrio", 10107: "Alolan Meowth",
    10108: "Alolan Persian", 10109: "Alolan Geodude", 10110: "Alolan Graveler", 10111: "Alolan Golem", 10112: "Alolan Grimer",
    10113: "Alolan Muk", 10114: "Alolan Exeggutor", 10115: "Alolan Marowak",
    10161: "Galarian Meowth", 10162: "Galarian Ponyta", 10163: "Galarian Rapidash", 10164: "Galarian Slowpoke", 10165: "Galarian Slowbro",
    10166: "Galarian Farfetch'd", 10167: "Galarian Weezing", 10168: "Galarian Mr. Mime", 10169: "Galarian Articuno", 10170: "Galarian Zapdos",
    10171: "Galarian Moltres", 10172: "Galarian Slowking", 10173: "Galarian Corsola", 10174: "Galarian Zigzagoon", 10175: "Galarian Linoone",
    10176: "Galarian Darumaka", 10177: "Galarian Darmanitan", 10179: "Galarian Yamask", 10180: "Galarian Stunfisk",
    10229: "Hisuian Growlithe", 10230: "Hisuian Arcanine", 10231: "Hisuian Voltorb", 10232: "Hisuian Electrode", 10233: "Hisuian Typhlosion",
    10234: "Hisuian Qwilfish", 10235: "Hisuian Sneasel", 10236: "Hisuian Samurott", 10237: "Hisuian Lilligant", 10238: "Hisuian Zorua",
    10239: "Hisuian Zoroark", 10240: "Hisuian Braviary", 10241: "Hisuian Sliggoo", 10242: "Hisuian Goodra", 10243: "Hisuian Avalugg",
    10244: "Hisuian Decidueye", 10247: "Basculin|White Stripe", 10250: "Tauros|Paldean Combat Breed",
    10251: "!this form isn't in the Shiny Dex (only the Combat Breed is)", 10252: "!this form isn't in the Shiny Dex (only the Combat Breed is)",
    10253: "Paldean Wooper",
  };
  // → { m } or { reason }
  function v2Entry(id) {
    id = +id;
    if (id <= 1025) {
      const base = mons.filter(m => +m.dex === id && !m.variant);
      const m = base.find(x => ["", "Original", "Basic"].includes(x.form)) || base[0];
      return m ? { m } : { reason: `No Pokémon #${id} in the Shiny Dex` };
    }
    const f = V2_FORMS[id];
    if (!f) return { reason: `Unknown V2 form id ${id}` };
    if (f.startsWith("!")) return { reason: f.slice(1) };
    const [name, form] = f.includes("|") ? f.split("|") : [f.slice(f.indexOf(" ") + 1), f.slice(0, f.indexOf(" "))];
    const m = mons.find(x => x.name === name && x.form === form);
    return m ? { m } : { reason: `${f} isn't in the Shiny Dex` };
  }

  // V2 data source: this browser's localStorage (same origin as V2), or the key/value
  // map V2's bridge page sends back when V3 runs on its own domain.
  const localV2 = () => ({ keys: safe(() => Object.keys(localStorage)) || [], get: k => safe(() => localStorage.getItem(k)) });
  const remoteV2 = map => ({ keys: Object.keys(map), get: k => (k in map ? String(map[k]) : null) });

  function scanV2(src = localV2()) {
    const plan = { shinies: [], hunts: [], skipped: [], already: 0, perGame: {} };
    const imported = new Set(Object.values(shinies).flat().map(s => s.v2).filter(Boolean));
    const keys = src.keys;
    const read = k => safe(() => JSON.parse(src.get(k)));
    const bump = (gid, what) => { const p = plan.perGame[gid] = plan.perGame[gid] || { shinies: 0, hunts: 0 }; p[what]++; };
    // Shinies: every <game>_shiny_<id> count, with data entries where V2 has them.
    for (const k of keys) {
      const mt = k.match(/^(plza|sv|pla|pogo)_shiny_(\d+)$/);
      if (!mt) continue;
      const [, prefix, id] = mt, gid = V2_GAMES[prefix], count = +src.get(k) || 0;
      const target = v2Entry(id);
      for (let n = 1; n <= count; n++) {
        const d = read(`${prefix}_shinyData_${id}_${n}`);
        const label = (d && d.pokemonName) || (target.m ? target.m.name : `#${id}`);
        if (!target.m) { plan.skipped.push({ gid, label, reason: target.reason }); continue; }
        const marker = `${prefix}_${id}_${n}`;
        if (imported.has(marker)) { plan.already++; continue; }
        plan.shinies.push({ gid, m: target.m, entry: {
          count: Math.max(0, +(d && d.counter) || 0), time: Math.max(0, +(d && d.timer) || 0),
          odds: null, ts: (d && +d.timestamp) || null, v2: marker,
        } });
        bump(gid, "shinies");
      }
    }
    // Hunts in progress (V2's timer only ran while the modal was open, so they come in paused).
    for (const k of keys) {
      const mt = k.match(/^(plza|sv|pla)_hunt_(\d+)$/);
      if (!mt) continue;
      const d = read(k);
      if (!d || !(+d.counter > 0 || +d.timer > 0)) continue;
      const [, prefix, id] = mt, gid = V2_GAMES[prefix], target = v2Entry(id);
      if (!target.m) { plan.skipped.push({ gid, label: `Hunt #${id}`, reason: target.reason }); continue; }
      if (isActive(hunts[hk(gid, target.m.id)])) { plan.already++; continue; }
      plan.hunts.push({ gid, m: target.m, hunt: {
        count: Math.max(0, +d.counter || 0), time: Math.max(0, +d.timer || 0), since: null,
        inc: 1, odds: (prefs[gid] || {}).odds || 4096, updated: +d.lastUpdated || Date.now(),
      } });
      bump(gid, "hunts");
    }
    return plan;
  }

  const v2 = { root: $("#v2Import"), plan: null, waiting: null };
  // V2 still runs at justin4625.github.io/ShinyCheck/. On any other origin (shinycheck.nl)
  // its data is reached through a small bridge page opened in a popup — a popup, because
  // browsers partition the storage of cross-site iframes.
  const V2_ORIGIN = "https://justin4625.github.io";
  const V2_BRIDGE = V2_ORIGIN + "/ShinyCheck/v2-bridge.html";
  const onV2Origin = location.origin === V2_ORIGIN;

  function showV2Dialog() {
    v2.root.hidden = false;
    document.body.classList.add("drawer-open");
  }
  function openV2() {
    const local = scanV2();
    const found = local.shinies.length + local.hunts.length + local.already + local.skipped.length;
    if (found || onV2Origin) return previewV2(local);
    // Not on V2's origin and nothing local: offer to connect through the bridge.
    v2.plan = null;
    $("#v2Body").innerHTML = `<p class="v2-fine" style="font-size:14px">Your V2 shinies are stored in the browser on V2's own address. ShinyCheck can fetch them through a small window that opens for a second and closes by itself.</p>
      <p class="v2-fine">Use the same browser and device where you used V2.</p>
      <button class="v2-connect" id="v2Connect">Connect to ShinyCheck V2 ✦</button>
      <p class="v2-fine" id="v2Status"></p>`;
    $("#v2Go").hidden = true;
    $("#v2Connect").onclick = connectV2;
    showV2Dialog();
  }
  function connectV2() {
    const w = window.open(V2_BRIDGE, "shinycheck-v2", "popup,width=420,height=320");
    const status = $("#v2Status");
    if (!w) { status.textContent = "Your browser blocked the window. Allow pop-ups for this site and try again."; return; }
    status.textContent = "Waiting for V2…";
    clearTimeout(v2.waiting);
    v2.waiting = setTimeout(() => {
      if ($("#v2Status")) $("#v2Status").textContent = "No answer from V2. Close the small window if it's still open and try again.";
    }, 15000);
  }
  addEventListener("message", e => {
    if (e.origin !== V2_ORIGIN || !e.data || e.data.type !== "shinycheck-v2-data" || typeof e.data.data !== "object") return;
    clearTimeout(v2.waiting);
    // Only V2's own keys are used; values are parsed defensively by scanV2.
    const map = {};
    for (const [k, v] of Object.entries(e.data.data)) if (/^(plza|sv|pla|pogo)_(shiny|shinyData|hunt)_\d+(_\d+)?$/.test(k) && typeof v === "string") map[k] = v;
    previewV2(scanV2(remoteV2(map)));
  });

  function previewV2(plan) {
    v2.plan = plan;
    const total = plan.shinies.length + plan.hunts.length;
    const rows = Object.entries(plan.perGame)
      .sort(([a], [b]) => (GAME_INFO[b].released || "").localeCompare(GAME_INFO[a].released || ""))
      .map(([gid, c]) => `<tr style="--accent:${GAME_INFO[gid].accent}"><td><span class="v2-dot"></span>${esc(GAME_INFO[gid].name)}</td><td>${c.shinies}</td><td>${c.hunts}</td></tr>`).join("");
    $("#v2Body").innerHTML = total || plan.already || plan.skipped.length ? `
      ${total ? `<table class="v2-table"><thead><tr><th>Game</th><th>Shinies</th><th>Hunts</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
      ${plan.already ? `<p class="v2-note ok">${plan.already} already imported — they won't be added twice.</p>` : ""}
      ${plan.skipped.length ? `<div class="v2-note warn"><b>${plan.skipped.length} can't be imported:</b><ul>${plan.skipped.map(s => `<li>${esc(s.label)} (${esc(GAME_INFO[s.gid].name)}) — ${esc(s.reason)}</li>`).join("")}</ul></div>` : ""}
      <p class="v2-fine">Shinies keep their encounters, time and date. V2 didn't track odds, so those stay empty. Hunts come in paused. Your V2 data isn't changed.</p>`
      : `<p class="v2-empty">No ShinyCheck V2 data found in this browser. Open this page in the browser (and device) where you used V2.</p>`;
    $("#v2Go").hidden = !total;
    $("#v2Go").textContent = `Import ${plan.shinies.length} ${plan.shinies.length === 1 ? "shiny" : "shinies"}${plan.hunts.length ? ` & ${plan.hunts.length} ${plan.hunts.length === 1 ? "hunt" : "hunts"}` : ""} ✦`;
    showV2Dialog();
  }
  function closeV2() {
    v2.root.hidden = true;
    document.body.classList.remove("drawer-open");
  }
  function runV2() {
    const plan = v2.plan;
    if (!plan) return;
    for (const { gid, m, entry } of plan.shinies) {
      const k = hk(gid, m.id);
      (shinies[k] = shinies[k] || []).push(entry);
      shinies[k].sort((x, y) => (x.ts || 0) - (y.ts || 0));
    }
    for (const { gid, m, hunt } of plan.hunts) hunts[hk(gid, m.id)] = hunt;
    saveShinies();
    saveHunts();
    window.Cloud && window.Cloud.flush();
    closeV2();
    render();
    toast(`Imported ${plan.shinies.length} shinies and ${plan.hunts.length} hunts from V2 ✦`);
  }
  $("#v2Open").addEventListener("click", openV2);
  $("#v2Go").addEventListener("click", runV2);
  v2.root.addEventListener("click", e => { if (e.target === v2.root || e.target.closest("[data-v2close]")) closeV2(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !v2.root.hidden) { e.stopImmediatePropagation(); closeV2(); } }, true);

  // Offer the import on the Shiny Dex when this browser still has V2 shinies to bring over.
  function renderV2Banner() {
    const banner = $("#v2Banner");
    if (!banner) return;
    const plan = state.page || state.huntsView || safe(() => localStorage.getItem("shinycheck-v3-v2-dismissed")) ? null : scanV2();
    const n = plan ? plan.shinies.length + plan.hunts.length : 0;
    banner.hidden = !n;
    if (n) $("#v2BannerText").innerHTML = `Found <b>${plan.shinies.length}</b> ${plan.shinies.length === 1 ? "shiny" : "shinies"}${plan.hunts.length ? ` and <b>${plan.hunts.length}</b> ${plan.hunts.length === 1 ? "hunt" : "hunts"}` : ""} from ShinyCheck V2 in this browser.`;
  }
  $("#v2BannerOpen").addEventListener("click", openV2);
  $("#v2BannerClose").addEventListener("click", () => { safe(() => localStorage.setItem("shinycheck-v3-v2-dismissed", "1")); renderV2Banner(); });

  // ---------- Backups (cloud) ----------
  const bk = { root: $("#backups") };
  const BK_KIND = { auto: "Weekly", manual: "Manual", "before-restore": "Before restore" };
  async function paintBackups() {
    const list = $("#bkList"), api = window.Cloud && window.Cloud.backups;
    if (!api || !api.available()) {
      list.innerHTML = `<li class="bk-empty">Sign in to use backups — they're stored in your account. Without an account, use Export.</li>`;
      $("#bkNow").hidden = true;
      return;
    }
    $("#bkNow").hidden = false;
    list.innerHTML = `<li class="bk-empty">Loading…</li>`;
    try {
      const items = await api.list();
      list.innerHTML = items.length ? items.map(b => `<li>
          <span class="bk-main"><b>${new Date(b.date).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</b>
          <small>${esc(BK_KIND[b.kind] || b.kind)} · ${b.counts?.shinies ?? "?"} shinies · ${b.counts?.hunts ?? "?"} hunts</small></span>
          <button class="bk-restore" data-restore="${b.id}">Restore</button>
        </li>`).join("") : `<li class="bk-empty">No backups yet. The first one is made automatically, or press Back up now.</li>`;
    } catch (err) {
      list.innerHTML = `<li class="bk-empty">Backups aren't available yet (${esc(err.code || err.message || "error")}). The Firebase rules may need the backups section.</li>`;
    }
  }
  $("#backupsOpen").addEventListener("click", () => { bk.root.hidden = false; document.body.classList.add("drawer-open"); paintBackups(); });
  const closeBackups = () => { bk.root.hidden = true; document.body.classList.remove("drawer-open"); };
  bk.root.addEventListener("click", async e => {
    if (e.target === bk.root || e.target.closest("[data-bkclose]")) return closeBackups();
    const r = e.target.closest("[data-restore]");
    if (!r || !arm(r, "Tap again to restore")) return;
    disarm();
    r.disabled = true; r.textContent = "Restoring…";
    try { await window.Cloud.backups.restore(r.dataset.restore); toast("Backup restored ✦"); closeBackups(); }
    catch (err) { toast(`Restore failed (${err.code || err.message})`); paintBackups(); }
  });
  $("#bkNow").addEventListener("click", async e => {
    const b = e.currentTarget;
    b.disabled = true; b.textContent = "Backing up…";
    try { await window.Cloud.backups.create(); toast("Backup saved to your account ✦"); }
    catch (err) { toast(`Backup failed (${err.code || err.message})`); }
    b.disabled = false; b.textContent = "Back up now ✦";
    paintBackups();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !bk.root.hidden) { e.stopImmediatePropagation(); closeBackups(); } }, true);

  // Export / import / reset
  const countShinies = data => Object.values(data.shinies || {}).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
  const countHunts = data => Object.keys(data.hunts || {}).length;

  $("#export").addEventListener("click", () => {
    const data = { app: "ShinyCheck", ...snapshot(), exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob), download: `shinycheck-backup-${new Date().toISOString().slice(0, 10)}.json`,
    });
    document.body.append(a);
    a.click();
    a.remove();
    // Revoking right away can cancel the download in Safari/Firefox.
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    toast(`Backup saved · ${countShinies(data)} shinies, ${countHunts(data)} hunts`);
  });
  $("#import").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    e.target.value = "";
    let data;
    try { data = JSON.parse(await f.text()); } catch { return toast("That file couldn't be read"); }
    // Only accept ShinyCheck backups; anything else would silently wipe the collection.
    const isBackup = data && typeof data === "object" && !Array.isArray(data) && typeof data.version === "number"
      && ["shinies", "hunts", "caught"].some(k => k in data)
      && (!data.shinies || typeof data.shinies === "object") && (!data.hunts || typeof data.hunts === "object");
    if (!isBackup) return toast("That isn't a ShinyCheck backup — nothing was changed");
    const now = snapshot(), s = countShinies(data), h = countHunts(data);
    const when = data.exportedAt ? ` from ${fmtDate(data.exportedAt)}` : "";
    const warnEmpty = !s && !h ? "\n\nThis backup has no shinies or hunts." : "";
    if (!confirm(`Replace your current collection (${countShinies(now)} shinies, ${countHunts(now)} hunts) with this backup${when} (${s} shinies, ${h} hunts)?${warnEmpty}\n\nThis can't be undone — export first if you want to keep what you have now.`)) return;
    applyData(data);
    window.Cloud && window.Cloud.flush();
    toast(`Backup loaded · ${s} shinies, ${h} hunts`);
  });
  $("#reset").addEventListener("click", () => {
    if (!confirm("Reset your whole collection — every shiny log and hunt? Export a backup first if you want to keep it.")) return;
    applyData({});
    window.Cloud && window.Cloud.flush();
    toast("Collection reset");
  });

  // ---------- App: offline, updates, install ----------
  // The service worker (sw.js) makes ShinyCheck open offline. Not on localhost unless ?sw,
  // so development always gets fresh files.
  const swOk = "serviceWorker" in navigator && (location.hostname !== "localhost" || new URLSearchParams(location.search).has("sw"));
  if (swOk) {
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
    const launchedAt = Date.now();
    navigator.serviceWorker.register(BASE + "sw.js", { scope: BASE }).then(reg => {
      const offer = worker => {
        // Just opened the app? Take the update right away — nothing to lose yet.
        if (Date.now() - launchedAt < 4000) return worker.postMessage("skipWaiting");
        toast("A new version of ShinyCheck is ready", { label: "Update", run: () => worker.postMessage("skipWaiting") }, 15000);
      };
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        w.addEventListener("statechange", () => {
          if (w.state === "installed" && navigator.serviceWorker.controller) offer(w);
        });
      });
      // Check for a new version when the app comes back to the foreground, at most every 30 min.
      let lastCheck = Date.now();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && Date.now() - lastCheck > 18e5) { lastCheck = Date.now(); reg.update().catch(() => {}); }
      });
    }).catch(err => console.warn("Service worker not registered:", err));
  }

  addEventListener("offline", () => toast("You're offline — everything keeps working and syncs when you're back", null, 4000));
  addEventListener("online", () => toast("Back online ✦"));

  // Install: Chrome / Edge / Android fire beforeinstallprompt; iPhone and iPad (Safari) don't,
  // so there the button explains Share → Add to Home Screen.
  const INSTALL_DISMISSED = "shinycheck-v3-install-dismissed";
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let installEvent = null;
  function paintInstall() {
    const can = !standalone() && (!!installEvent || isIOS);
    $("#installSide").hidden = !can;
    $("#installBanner").hidden = !can || !!safe(() => localStorage.getItem(INSTALL_DISMISSED)) || !matchMedia("(max-width: 900px)").matches;
  }
  async function install() {
    if (installEvent) {
      installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      installEvent = null;
      if (outcome === "accepted") safe(() => localStorage.setItem(INSTALL_DISMISSED, "1"));
      paintInstall();
    } else if (isIOS) {
      document.body.classList.remove("menu-open");
      $("#installHelp").hidden = false;
      document.body.classList.add("drawer-open");
    }
  }
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvent = e; paintInstall(); });
  addEventListener("appinstalled", () => { installEvent = null; paintInstall(); toast("ShinyCheck is installed ✦ Open it from your home screen"); });
  $("#installSide").addEventListener("click", install);
  $("#installBannerGo").addEventListener("click", install);
  $("#installBannerClose").addEventListener("click", () => { safe(() => localStorage.setItem(INSTALL_DISMISSED, "1")); paintInstall(); });
  $("#installHelp").addEventListener("click", e => {
    if (e.target.closest("[data-installclose]") || e.target === e.currentTarget) {
      $("#installHelp").hidden = true;
      document.body.classList.remove("drawer-open");
    }
  });
  paintInstall();

  // ---------- Share card: a picture of a logged shiny to post or send ----------
  // s = a shiny log entry plus its game (g) and Pokémon (m). Drawn on a canvas at
  // 1080×1350 (4:5, fits Instagram, WhatsApp and Discord without cropping).
  const loadImg = src => new Promise(res => {
    if (!src) return res(null);
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
  // Seeded random, so a shiny's card always gets the same sparkles.
  const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  async function drawShareCard(s) {
    const W = 1080, H = 1350, g = GAME_INFO[s.g], m = s.m;
    const c = Object.assign(document.createElement("canvas"), { width: W, height: H });
    const x = c.getContext("2d");
    const F = "'Bricolage Grotesque', system-ui, sans-serif", M = "'JetBrains Mono', ui-monospace, monospace";
    await Promise.all([`800 100px ${F}`, `500 44px ${F}`, `700 24px ${M}`].map(f => document.fonts.load(f).catch(() => {})));
    const [sprite, logo] = await Promise.all([loadImg(m.sprite), loadImg(g.logo)]);

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

    // Background: the game's colors glowing out of the dark theme, and sparkles.
    x.fillStyle = "#07070d";
    x.fillRect(0, 0, W, H);
    glow(0, 0, 950, g.accent + "8c");
    glow(W, H, 1000, g.accent2 + "80");
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

    // Holo frame
    x.lineWidth = 4;
    x.strokeStyle = holo(0, 0, W, H);
    x.beginPath();
    x.roundRect(28, 28, W - 56, H - 56, 52);
    x.stroke();

    // Header: ShinyCheck logo left, game logo (or name pill) right.
    x.fillStyle = holo(76, 84, 128, 136);
    spark(102, 110, 30);
    x.textBaseline = "middle";
    text("Shiny", 146, 112, `500 44px ${F}`, "#fff");
    const sw = x.measureText("Shiny").width;
    text("Check", 146 + sw, 112, `800 44px ${F}`, "#fff");
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

    // Name, with form and game below.
    x.textBaseline = "alphabetic";
    spaced("6px");
    text("SHINY FOUND", cx, 905, `700 26px ${M}`, holo(cx - 120, 0, cx + 120, 0), "center");
    spaced("0px");
    text(m.name, cx, 1010, fit(m.name, 800, 112, 56, W - 180), "#fff", "center");
    const sub = [m.form && m.form !== "Original" ? m.form : "", g.name].filter(Boolean).join(" · ").toUpperCase();
    spaced("3px");
    text(sub, cx, 1062, fit(sub, 700, 26, 16, W - 200, M), "rgba(255,255,255,.7)", "center");
    spaced("0px");

    // Stats: encounters, hunt time, odds (or the date for GO / HOME).
    const odds = s.odds && !g.noOdds;
    const stats = [["ENCOUNTERS", s.count ? nf(s.count) : "—"], ["HUNT TIME", s.time ? fmtShort(s.time) : "—"],
      odds ? ["ODDS", `1/${nf(s.odds)}`] : ["CAUGHT", fmtDate(s.ts)]];
    x.fillStyle = "rgba(255,255,255,.07)";
    x.strokeStyle = "rgba(255,255,255,.14)";
    x.lineWidth = 2;
    x.beginPath();
    x.roundRect(80, 1100, W - 160, 136, 30);
    x.fill();
    x.stroke();
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
    const ratio = odds && s.count ? s.count / s.odds : 0;
    const luck = ratio ? `${ratio < .01 ? "<0.01" : ratio.toFixed(2)}× odds` : "";
    const parts = [s.method, s.phases ? `after ${s.phases} ${s.phases === 1 ? "phase" : "phases"}` : "", luck, odds ? fmtDate(s.ts) : ""].filter(Boolean);
    x.font = `700 22px ${M}`;
    // Drop the least important parts until the line fits next to the site name.
    while (parts.length > 1 && x.measureText(parts.join(" · ")).width > W - 520) parts.shift();
    text(parts.join(" · "), 84, 1290, `700 22px ${M}`, "rgba(255,255,255,.6)");
    spaced("0px");

    return new Promise(res => c.toBlob(res, "image/png"));
  }

  const shareDlg = $("#shareDlg");
  let shareFile = null, shareText = "";
  async function openShare(s) {
    shareFile = null;
    $("#shareTitle").textContent = `Shiny ${s.m.name} ✦`;
    $("#shareImg").removeAttribute("src");
    $("#shareGo").disabled = $("#shareSave").disabled = true;
    shareDlg.hidden = false;
    document.body.classList.add("drawer-open");
    const blob = await drawShareCard(s);
    if (!blob || shareDlg.hidden) return;
    const slug = norm(`${s.m.name} ${s.m.form && s.m.form !== "Original" ? s.m.form : ""}`).trim().replace(/[^a-z0-9]+/g, "-");
    shareFile = new File([blob], `shiny-${slug}.png`, { type: "image/png" });
    const g = GAME_INFO[s.g];
    shareText = `Shiny ${s.m.name} in ${g.name}${s.count ? ` after ${nf(s.count)} encounters` : ""} ✦ shinycheck.nl`;
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

  // ---------- Notifications (update news, see cloud.js) ----------
  const pushDlg = $("#pushDlg");
  const PUSH_ERR = { "push/denied": "Notifications weren't allowed", "push/unsupported": "This browser can't show notifications", "push/signed-out": "Sign in to turn on notifications" };
  function paintPush() {
    const api = window.Cloud && window.Cloud.push;
    const close = `<button class="rl-again" data-pushclose>Close</button>`;
    const [cls, msg, actions] =
      isIOS && !standalone() ? ["warn", "On iPhone and iPad, notifications only work in the installed app. Add ShinyCheck to your Home Screen, open it from there and turn them on here.", close + `<button class="rl-go" data-push="install">How to install</button>`]
      : !api || !swOk || api.permission() === "unsupported" ? ["warn", "This browser can't show notifications.", close]
      : !(window.Cloud.backups && window.Cloud.backups.available()) ? ["warn", "Sign in to turn on notifications.", close]
      : api.permission() === "denied" ? ["warn", "Notifications are blocked for ShinyCheck. Allow them in your browser or phone settings, then come back here.", close]
      : api.enabled() ? ["ok", "<b>On</b> for this device ✦", `<button class="rl-again" data-push="off">Turn off</button><button class="rl-go" data-pushclose>Done</button>`]
      : ["", "Off for this device.", close + `<button class="rl-go" data-push="on">Turn on ✦</button>`];
    $("#pushState").innerHTML = `<p class="v2-note ${cls}">${msg}</p>`;
    $("#pushActions").innerHTML = actions;
  }
  const closePush = () => { pushDlg.hidden = true; document.body.classList.remove("drawer-open"); };
  $("#pushOpen").addEventListener("click", () => {
    document.body.classList.remove("menu-open");
    pushDlg.hidden = false;
    document.body.classList.add("drawer-open");
    paintPush();
  });
  pushDlg.addEventListener("click", async e => {
    if (e.target === pushDlg || e.target.closest("[data-pushclose]")) return closePush();
    const b = e.target.closest("[data-push]");
    if (!b) return;
    const api = window.Cloud.push, act = b.dataset.push;
    if (act === "install") { closePush(); return install(); }
    b.disabled = true;
    try {
      if (act === "on") { b.textContent = "Turning on…"; await api.enable(); toast("Notifications on ✦ You'll hear about new updates"); }
      if (act === "off") { await api.disable(); toast("Notifications off"); }
    } catch (err) {
      console.error(err);
      toast(PUSH_ERR[err.code] || `Couldn't turn on notifications (${err.code || err.message})`);
    }
    paintPush();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !pushDlg.hidden) { e.stopImmediatePropagation(); closePush(); } }, true);

  route();
})();
