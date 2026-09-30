// The tracked games: names, colours, logos, regional dex sections and dex-number helpers.
// Sections are keyed by the letter prefix of the regional dex number in the sheet ("" = no prefix).
export const GAME_INFO = {
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
export const gamePrefix = v => v.replace(/[0-9]/g, "");
export const gameNum = v => +v.replace(/\D/g, "");
// A Pokémon can sit in more than one dex of the same game (Lumiose + Mega Dimension),
// so the extra code lives in m.extra[gid] next to the sheet's m.games[gid].
export const codes = (m, gid) => [m.games[gid], m.extra && m.extra[gid]].filter(Boolean);
export const codeIn = (m, gid, p) => codes(m, gid).find(c => gamePrefix(c) === p);
export const gameGrad = g => `linear-gradient(90deg, ${g.accent}, ${g.accent2})`;
