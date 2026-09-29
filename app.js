(() => {
  const STORE = "livingdex-za-v1";
  const THEME = "livingdex-theme";
  const GAMES = ["swsh", "bdsp", "pla", "sv", "lza"];
  // Games a shiny can be logged in. GO has no regional dex or hunt page, only logs.
  const LOG_GAMES = [...GAMES, "pogo"];

  // Sections are keyed by the letter prefix of the regional dex number in the sheet ("" = no prefix).
  const GAME_INFO = {
    swsh: { name: "Sword & Shield", accent: "#00a1e9", accent2: "#e5006e", logo: "logos/swshLogo.png",
            sections: [["", "Galar"], ["A", "Isle of Armor"], ["C", "Crown Tundra"]] },
    bdsp: { name: "Brilliant Diamond & Shining Pearl", short: "BD & SP", accent: "#3d7bd9", accent2: "#e77fa6", logo: "logos/bdspLogo.png",
            sections: [["", "Sinnoh"]] },
    pla:  { name: "Legends: Arceus", accent: "#d97706", accent2: "#5b3a8c", logo: "logos/plaLogo.png",
            sections: [["", "Hisui"]] },
    sv:   { name: "Scarlet & Violet", accent: "#ff4d00", accent2: "#8c00ff", logo: "logos/svLogo.png",
            sections: [["P", "Paldea"], ["K", "Kitakami"], ["B", "Blueberry"]] },
    lza:  { name: "Legends: Z-A", accent: "#06b6d4", accent2: "#2bd67b", logo: "logos/plzaLogo.png",
            sections: [["", "Lumiose"], ["M", "Mega Dimension"]] },
    pogo: { name: "Pokémon GO", short: "GO", accent: "#10b981", accent2: "#3b82f6", logOnly: true, sections: [] },
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
  // Legends: Z-A Mega Dimension DLC dex, shown as M001…
  const LZA_MD = [56,57,979,52,53,863,83,865,104,105,137,233,474,951,952,957,958,959,967,969,970,479,971,972,769,770,352,973,615,977,978,996,997,998,999,1000,211,904,252,253,254,255,256,257,258,259,260,349,350,433,358,876,509,510,517,518,538,539,562,563,867,767,768,827,828,852,853,778,900,877,622,623,821,822,823,174,39,40,926,927,396,397,398,325,326,931,739,740,932,933,934,316,317,41,42,169,935,936,937,942,943,848,849,944,945,335,336,439,122,866,590,591,485,721,638,641,642,647,648,649,720,802,808,809,491,380,381,382,383,384,801,807];
  const MD_FORMS = { 52: ["Alolan", "Galarian"], 53: ["Alolan"], 83: ["Galarian"], 105: ["Alolan"], 122: ["Galarian"], 211: ["Hisuian"], 562: ["Galarian"] };
  for (const m of mons) {
    const i = LZA_MD.indexOf(+m.dex);
    if (i < 0 || !(["", "Original", "Basic"].includes(m.form) || (MD_FORMS[+m.dex] || []).includes(m.form))) continue;
    const code = "M" + String(i + 1).padStart(3, "0");
    if (m.games.lza) m.extra = { lza: code }; else m.games.lza = code;
  }
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
  const fmtTime = s => `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;
  const fmtShort = s => s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  const nf = n => n.toLocaleString("en-US");

  const $ = s => document.querySelector(s);
  const el = {
    home: $("#homeView"), game: $("#gameView"), cards: $("#cards"), gameCards: $("#gameCards"),
    regions: $("#regions"), dexTabs: $("#dexTabs"), sideGames: $("#sideGames"), upNext: $("#upNext"),
    q: $("#q"), gq: $("#gq"), toast: $("#toast"),
  };
  // page: "" = Living Dex, otherwise a game id. tab = regional dex on a game page.
  const state = { page: "", gen: 0, tab: "", missing: false, forms: true, gMissing: false, gForms: true };

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
  const gHas = gid => m => !!(shinies[hk(gid, m.id)] || []).length;
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
    const on = gid ? found > 0 : has(m);
    return `<article class="pcard ${on ? "on" : ""}" data-id="${m.id}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${esc(m.name)}${m.form ? " " + esc(m.form) : ""}">
      <div class="card-top">
        <span class="no">#${m.dex}</span>
        ${found ? `<span class="shiny-count" title="${found} shiny found">${sparkSvg("", "#fff")}${found}</span>` : ""}
        <a class="wiki" href="${m.url}" target="_blank" rel="noopener" title="Open on Bulbapedia">↗</a>
        ${sparkSvg("seal")}
      </div>
      <div class="sprite">${m.sprite ? `<img src="${m.sprite}" alt="" loading="lazy" decoding="async">` : `<span class="nosprite">?</span>`}</div>
      <h4 class="pname">${esc(m.name)}</h4>
      <span class="form-tag ${m.form ? "" : "blank"}" title="${esc(m.form)}">${esc(m.form) || "&nbsp;"}</span>
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

  // ---------- Living Dex ----------
  const homeScope = m => !state.gen || m.gen === state.gen;
  const homeMatch = m => homeScope(m) && matchText(m, el.q) && !(state.missing && has(m)) && (state.forms || !m.variant);

  function renderHome() {
    const list = mons.filter(homeMatch);
    $("#count").textContent = `${list.length} shown`;
    let html = "";
    for (const g of Object.keys(genNames).map(Number)) {
      const items = list.filter(m => m.gen === g);
      if (items.length) html += sectionHtml(String(g).padStart(2, "0"), region(g), g, mons.filter(m => m.gen === g), items);
    }
    el.cards.innerHTML = html || empty(el.q);
    renderHomeStats();
  }

  function renderHomeStats() {
    const got = done(mons), p = pct(mons);
    const regionsDone = Object.keys(genNames).filter(g => {
      const l = mons.filter(m => m.gen === +g);
      return done(l) === l.length;
    }).length;
    $("#statCaught").textContent = got;
    $("#statLeft").textContent = mons.length - got;
    $("#statRegions").textContent = `${regionsDone}/${Object.keys(genNames).length}`;
    $("#heroPct").textContent = fmtPct(p);
    setRing($("#heroRing"), p);
    const left = mons.length - got;
    $("#heroSub").innerHTML = left
      ? `<b>${left}</b> Pokémon and forms left to register in your HOME boxes. ${got ? "Keep going!" : "Open a Pokémon to log a shiny."}`
      : `<b>Living Dex complete!</b> Every form, one home. ✦`;

    el.regions.innerHTML = [[0, "All regions", mons], ...Object.keys(genNames).map(g => [+g, region(g), mons.filter(m => m.gen === +g)])]
      .map(([g, n, l]) => `<button class="region ${state.gen === g ? "active" : ""} ${done(l) === l.length ? "done" : ""}" data-gen="${g}">
        <span class="r-name">${esc(n)}</span><span class="r-num">${done(l)} / ${l.length}</span>
        <span class="r-bar" style="width:${pct(l)}%"></span>
      </button>`).join("");

    const next = mons.filter(m => homeScope(m) && !has(m) && m.sprite).slice(0, 6);
    el.upNext.innerHTML = next.length
      ? next.map(m => `<button data-jump="${m.id}" title="#${m.dex} ${esc(m.name)}${m.form ? " (" + esc(m.form) + ")" : ""}"><img src="${m.sprite}" alt="${esc(m.name)}"></button>`).join("")
      : `<p class="up-next-empty">Nothing left here ✦</p>`;

    for (const g of Object.keys(genNames)) updateSection(el.cards, g, mons.filter(m => m.gen === +g));
    renderSidebar();
  }

  // ---------- Game page ----------
  const inTab = (gid, p) => m => !!codeIn(m, gid, p);

  function renderGame() {
    const gid = state.page, g = GAME_INFO[gid];
    if (state.tab !== "hunts" && !g.sections.some(([p]) => p === state.tab)) state.tab = g.sections[0][0];
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
      .filter(m => matchText(m, el.gq) && !(state.gMissing && gHas(gid)(m)) && (state.gForms || !m.variant))
      .sort((x, y) => gameNum(codeIn(x, gid, state.tab)) - gameNum(codeIn(y, gid, state.tab)) || x.id - y.id);
    $("#gCount").textContent = `${items.length} shown`;
    el.gameCards.className = "game-mode";
    el.gameCards.innerHTML = items.length
      ? sectionHtml(String(g.sections.indexOf(section) + 1).padStart(2, "0"), section[1] + " Dex", "tab", tabAll, items, gameGrad(g), gid)
      : empty(el.gq);
    renderGameStats();
  }

  function renderGameStats() {
    const gid = state.page, g = GAME_INFO[gid];
    const all = mons.filter(m => m.games[gid]), f = gHas(gid);
    const p = pct(all, f), left = all.length - done(all, f);
    $("#gamePct").textContent = fmtPct(p);
    $("#gameCount").textContent = `${done(all, f)} / ${all.length}`;
    setRing($("#gameRing"), p);
    $("#gameSub").innerHTML = left
      ? `<b>${left}</b> to go across ${g.sections.length > 1 ? g.sections.length + " regional dexes" : "the " + g.sections[0][1] + " Dex"}.`
      : `<b>Complete!</b> Every shiny from ${esc(g.name)} is logged. ✦`;
    for (const [p2] of g.sections) {
      const l = all.filter(inTab(gid, p2));
      const n = el.dexTabs.querySelector(`[data-tabcount="${p2}"]`);
      if (n) n.textContent = `${done(l, f)}/${l.length}`;
    }
    updateSection(el.gameCards, "tab", all.filter(inTab(gid, state.tab)), f);
    const live = all.filter(m => isActive(hunts[hk(gid, m.id)]));
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
    $("#sideDexPct").textContent = fmtPct(pct(mons));
    $("#sideDexBar").style.width = pct(mons) + "%";
    el.sideGames.innerHTML = GAMES.map(id => {
      const g = GAME_INFO[id], l = mons.filter(m => m.games[id]);
      return `<a class="side-item ${state.page === id ? "active" : ""}" href="#/${id}" style="--c:${g.accent};--g:${gameGrad(g)}">
        <span class="side-icon"></span>
        <span class="side-name">${esc(g.name)}</span>
        <span class="side-pct">${fmtPct(pct(l, gHas(id)))}</span>
        <span class="side-bar"><i style="width:${pct(l, gHas(id))}%"></i></span>
      </a>`;
    }).join("");
    document.querySelector('.side-item[data-page=""]').classList.toggle("active", !state.page);
  }

  function render() {
    el.home.classList.toggle("hidden", !!state.page);
    el.game.classList.toggle("hidden", !state.page);
    state.page ? renderGame() : renderHome();
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
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2400);
  }


  // ---------- Hunt Deck (drawer) ----------
  const dr = {
    root: $("#drawer"), panel: $(".drawer-panel"), img: $("#drImg"), count: $("#drCount"), time: $("#drTime"),
    play: $("#drPlay"), odds: $("#drOdds"), luckBar: $("#drLuckBar"), luckText: $("#drLuckText"),
    log: $("#drLog"), gotcha: $("#drGotcha"), float: $("#drFloat"), stage: $("#drStage"), celebrate: $("#drCelebrate"),
  };
  // cur/curGame: the Pokémon being hunted. It outlives the drawer while the pop-out is open.
  let cur = null, curGame = "", lastFocus = null, pip = null;
  const curKey = () => hk(curGame, cur.id);
  // Odds and step are remembered per game, so they stick before the first encounter
  // and carry over to the next hunt in that game.
  const gamePrefs = () => ({ inc: 1, odds: 4096, ...prefs[curGame] });
  const hunt = () => hunts[curKey()] || { count: 0, time: 0, since: null, ...gamePrefs() };
  function setHunt(patch) {
    const h = { ...hunt(), ...patch, updated: Date.now() };
    if ("odds" in patch || "inc" in patch) {
      prefs[curGame] = { inc: h.inc, odds: h.odds };
      savePrefs();
    }
    if (!isActive(h)) delete hunts[curKey()]; else hunts[curKey()] = h;
    saveHunts();
    paintHunt();
    refreshCard();
  }

  function openDrawer(id) {
    cur = mons.find(m => m.id === id);
    curGame = state.page;
    const g = GAME_INFO[curGame];
    for (const [k, v] of [["--accent", g.accent], ["--accent2", g.accent2]]) dr.root.style.setProperty(k, v);
    $("#drGame").textContent = g.name;
    $("#drMeta").textContent = `#${cur.dex} · ${g.short || g.name} ${codes(cur, curGame).join(" / ")}`;
    $("#drName").textContent = cur.name;
    $("#drSub").innerHTML = cur.form ? `<span class="form-tag">${esc(cur.form)}</span>` : "";
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

  function closeDrawer() {
    if (!dr.root.classList.contains("open")) return;
    dr.root.classList.remove("open");
    dr.root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
    if (lastFocus) lastFocus.focus({ preventScroll: true });
    if (!pip) cur = null;
  }

  function paintHunt() {
    if (!cur) return;
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
    $("#drTimeHint").textContent = h.since ? "Running — keeps going when you close this" : s ? "Paused — press + to resume" : "Press + to start the hunt";
    dr.odds.value = h.odds;
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

  function paintLog() {
    const list = shinies[curKey()] || [];
    dr.log.innerHTML = list.length
      ? list.map((s, i) => `<li>
          <span class="log-n">${sparkSvg()}${i + 1}</span>
          <span class="log-main"><b>${nf(s.count)}</b> encounters · ${fmtShort(s.time)}<small>${new Date(s.ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · 1/${s.odds}</small></span>
          <button class="log-del" data-del="${i}" title="Delete entry">✕</button>
        </li>`).join("")
      : `<li class="log-empty">No shinies logged yet. Hit <b>Gotcha!</b> when it sparkles.</li>`;
  }

  function refreshCard() {
    if (!cur || state.page !== curGame) return;
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
      const f = document.createElement("span");
      f.textContent = `+${h.inc}`;
      f.style.left = 40 + Math.random() * 20 + "%";
      dr.float.append(f);
      setTimeout(() => f.remove(), 900);
      dr.count.classList.remove("bump");
      void dr.count.offsetWidth;
      dr.count.classList.add("bump");
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
    (shinies[k] = shinies[k] || []).push({ count: h.count, time: elapsed(h), odds: h.odds, ts: Date.now() });
    saveShinies();
    delete hunts[k];
    saveHunts();
    paintHunt();
    paintLog();
    refreshCard();
    celebrate();
  }

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
  dr.odds.addEventListener("change", () => setHunt({ odds: +dr.odds.value }));
  $("#drInc").addEventListener("change", e => setHunt({ inc: Math.max(1, +e.target.value || 1) }));
  $("#drSetCount").addEventListener("change", e => setHunt({ count: Math.max(0, +e.target.value || 0) }));
  for (const id of ["drH", "drM", "drS"]) $("#" + id).addEventListener("change", () => {
    const t = Math.max(0, (+$("#drH").value || 0) * 3600 + (+$("#drM").value || 0) * 60 + (+$("#drS").value || 0));
    setHunt({ time: t, since: hunt().since ? Date.now() : null });
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
  const step = dir => {
    const ids = [...el.gameCards.querySelectorAll(".pcard")].map(c => +c.dataset.id);
    const i = ids.indexOf(cur.id);
    if (i < 0 || !ids.length) return;
    const next = ids[(i + dir + ids.length) % ids.length];
    openDrawer(next);
    el.gameCards.querySelector(`.pcard[data-id="${next}"]`).scrollIntoView({ block: "nearest" });
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
  const ODDS = [8192, 4096, 2048, 1365, 1024, 683, 512, 256, 128];
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
  const fmtDate = ts => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

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
      const d = new Date(l.ts), local = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
      return `<li class="en-item ${open ? "open" : ""}" style="--accent:${g.accent};--accent2:${g.accent2}">
        <button class="en-row" data-edit="${key}">
          <span class="en-thumb">${l.m.sprite ? `<img src="${l.m.sprite}" alt="">` : ""}</span>
          <span class="en-main">
            <b>${esc(l.m.name)}${l.m.form ? ` <em>${esc(l.m.form)}</em>` : ""}</b>
            <span class="en-game">${esc(g.name)}</span>
            <small>${fmtDate(l.ts)}${l.odds && l.g !== "pogo" ? ` · 1/${l.odds}` : ""}</small>
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
          <div class="en-edit-actions">
            <button class="en-save" data-save>Save</button>
            <button class="dr-danger" data-delete>Delete</button>
          </div>
        </div>` : ""}
      </li>`;
    }).join("") : `<li class="log-empty">No shinies logged for ${esc(m.name)} yet. Start a hunt below ✦</li>`;

    const addGames = LOG_GAMES.filter(g => g === "pogo" || m.games[g]);
    const now = new Date(), nowLocal = new Date(now - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    $("#enAdd").innerHTML = adding ? `<div class="en-add-form">
        <label class="wide">Game<select name="game">${addGames.map(g => `<option value="${g}">${esc(GAME_INFO[g].name)}</option>`).join("")}</select></label>
        <label>Encounters<input type="number" min="0" name="count" value="0"></label>
        <label>Hours<input type="number" min="0" name="h" value="0"></label>
        <label>Min<input type="number" min="0" max="59" name="m" value="0"></label>
        <label class="en-odds">Odds<select name="odds">${ODDS.map(o => `<option value="${o}" ${o === 4096 ? "selected" : ""}>1/${o}</option>`).join("")}</select></label>
        <label class="wide">Caught on<input type="datetime-local" name="ts" value="${nowLocal}"></label>
        <div class="en-edit-actions">
          <button class="en-save" data-add-save>Add ${esc(m.name)}${m.form && m.form !== "Original" ? ` (${esc(m.form)})` : ""} ✦</button>
          <button class="dr-danger en-cancel" data-add-cancel>Cancel</button>
        </div>
      </div>`
      : `<button class="en-add-btn" data-add-open><span>+</span> Add a shiny manually</button>`;

    const games = GAMES.filter(gid => m.games[gid]);
    $("#enGames").innerHTML = games.length
      ? games.map(gid => {
        const g = GAME_INFO[gid], h = hunts[hk(gid, m.id)];
        return `<button class="en-game-chip" data-hunt="${gid}" style="--accent:${g.accent};--accent2:${g.accent2}">
          <span>${esc(g.short || g.name)}</span><small>${isActive(h) ? `⚡ ${nf(h.count)}` : codes(m, gid).join(" / ")}</small></button>`;
      }).join("")
      : `<p class="en-none">Not obtainable in the tracked games.</p>`;
  }

  // GO has no odds to pick; main-series games default to the odds last used there.
  en.root.addEventListener("change", e => {
    if (e.target.name !== "game" || !e.target.closest(".en-add-form")) return;
    const form = e.target.closest(".en-add-form"), go = e.target.value === "pogo";
    form.querySelector(".en-odds").hidden = go;
    if (!go) form.querySelector('[name="odds"]').value = (prefs[e.target.value] || {}).odds || 4096;
  });

  en.root.addEventListener("click", e => {
    if (e.target.closest("[data-eclose]")) return closeEntry();
    if (e.target.closest("[data-add-open]")) { adding = true; editing = null; return paintEntry(); }
    if (e.target.closest("[data-add-cancel]")) { adding = false; return paintEntry(); }
    const addBtn = e.target.closest("[data-add-save]");
    if (addBtn) {
      const f = addBtn.closest(".en-add-form"), val = n => f.querySelector(`[name="${n}"]`).value;
      const g = val("game"), ts = new Date(val("ts")).getTime(), num = n => Math.max(0, +val(n) || 0);
      const k = hk(g, entryMon.id);
      (shinies[k] = shinies[k] || []).push({ count: num("count"), time: num("h") * 3600 + num("m") * 60, odds: g === "pogo" ? null : +val("odds"), ts: isNaN(ts) ? Date.now() : ts, manual: true });
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
      location.hash = "#/" + hunt.dataset.hunt;
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
      <img class="pip-img" alt="">
      <div class="pip-info"><span class="pip-name"></span><span class="pip-time"></span></div>
      <button class="pip-play"></button>
      <div class="pip-row">
        <span class="pip-count"></span>
        <button class="pip-minus"></button>
        <button class="pip-plus"></button>
      </div>
    </div>`;
    d.querySelector(".pip-plus").onclick = () => addEncounter(1);
    d.querySelector(".pip-img").onclick = () => addEncounter(1);
    d.querySelector(".pip-minus").onclick = () => addEncounter(-1);
    d.querySelector(".pip-play").onclick = togglePlay;
    pip.addEventListener("keydown", e => {
      const act = { " ": () => addEncounter(1), "+": () => addEncounter(1), "=": () => addEncounter(1), "-": () => addEncounter(-1), p: togglePlay, P: togglePlay }[e.key];
      if (act) { e.preventDefault(); act(); }
    });
    pip.addEventListener("pagehide", () => {
      pip = null;
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
    d.querySelector(".pip-name").textContent = cur.name + (cur.form ? ` · ${cur.form}` : "");
    d.querySelector(".pip-time").textContent = fmtTime(s);
    d.querySelector(".pip-count").textContent = nf(h.count);
    d.querySelector(".pip-plus").textContent = h.since ? `+${h.inc}` : "▶";
    d.querySelector(".pip-minus").textContent = `−${h.inc}`;
    d.querySelector(".pip-play").textContent = h.since ? "❚❚" : "▶";
  }
  pipBtn.addEventListener("click", popOut);

  // One clock for everything that runs: the open drawer and live hunt strips on cards.
  setInterval(() => {
    if (cur && hunt().since) { dr.time.textContent = fmtTime(elapsed(hunt())); paintPip(); }
    if (!state.page) return;
    for (const n of el.gameCards.querySelectorAll("[data-live]")) {
      const h = hunts[hk(state.page, n.dataset.live)];
      if (h && h.since) n.textContent = fmtTime(elapsed(h));
    }
  }, 1000);

  // ---------- Events ----------
  for (const root of [el.cards, el.gameCards]) {
    const activate = c => root === el.gameCards ? openDrawer(+c.dataset.id) : openEntry(+c.dataset.id);
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
  el.upNext.addEventListener("click", e => {
    const b = e.target.closest("[data-jump]");
    if (!b) return;
    let c = el.cards.querySelector(`.pcard[data-id="${b.dataset.jump}"]`);
    if (!c) { el.q.value = ""; state.missing = false; $("#fMissing").setAttribute("aria-pressed", "false"); render(); c = el.cards.querySelector(`.pcard[data-id="${b.dataset.jump}"]`); }
    if (!c) return;
    c.scrollIntoView({ behavior: "smooth", block: "center" });
    c.classList.remove("flash");
    void c.offsetWidth;
    c.classList.add("flash");
  });

  for (const [id, key] of [["#fMissing", "missing"], ["#fForms", "forms"], ["#gMissing", "gMissing"], ["#gForms", "gForms"]]) {
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

  // Routing: #/ is the Living Dex, #/<game> a game page.
  function route() {
    const id = location.hash.replace(/^#\/?/, "");
    const page = GAME_INFO[id] && !GAME_INFO[id].logOnly ? id : "";
    if (page !== state.page) { closeDrawer(); closeEntry(); state.page = page; state.tab = ""; el.gq.value = ""; scrollTo(0, 0); }
    document.body.classList.remove("menu-open");
    render();
    if (pendingHunt && state.page) { openDrawer(pendingHunt); pendingHunt = null; }
  }
  addEventListener("hashchange", route);

  // Mobile menu
  $("#menuBtn").addEventListener("click", () => document.body.classList.add("menu-open"));
  $("#scrim").addEventListener("click", () => document.body.classList.remove("menu-open"));

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

  // Export / import / reset
  $("#export").addEventListener("click", () => {
    const data = snapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob), download: `shinycheck-livingdex-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Backup saved · ${mons.filter(has).length} registered`);
  });
  $("#import").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      applyData(JSON.parse(await f.text()));
      window.Cloud && window.Cloud.flush();
      toast(`Backup loaded · ${mons.filter(has).length} registered`);
    } catch {
      toast("That file couldn't be read");
    }
    e.target.value = "";
  });
  $("#reset").addEventListener("click", () => {
    if (!confirm("Reset all progress, hunts and shiny logs? Export a backup first if you want to keep it.")) return;
    applyData({});
    window.Cloud && window.Cloud.flush();
    toast("Progress reset");
  });

  route();
})();
