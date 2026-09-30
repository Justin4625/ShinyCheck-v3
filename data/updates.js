// What's new: the update log in the app (/updates), newest first. The first entry is also shown
// once as a popup to everyone who already used ShinyCheck (once per account and device).
// Adding an update = adding an entry at the top:
//   id      unique and never changed (it's how "seen" is remembered)
//   date    YYYY-MM-DD
//   title   short, in English like the rest of the app
//   text    one or two sentences on what it is
//   steps   optional mini tutorial for the popup and the log (plain text, **bold** allowed)
//   shot    optional screenshot (phone, portrait, WebP in shots/updates/ or shots/)
//   action  optional button: { label, go } with go = a page ("stats", "sv") or "entry:<keyword>" (Dex Entry)
window.UPDATES = [
  {
    id: "bw2-2026-09",
    date: "2026-09-30",
    title: "Black 2 & White 2",
    text: "The new Unova dex of Black 2 & White 2 is in, plus every Pokémon you can get beyond it (swarms, Hidden Grottos, the Nature Preserve, legends like the Regis and Latios & Latias). The Shiny Charm is here too: 1 in 2,731 in the wild, 1 in 1,024 with the Masuda Method.",
    steps: [
      "Open **Black 2 & White 2** in the menu.",
      "Start a hunt and turn on the **Shiny Charm** if you have it.",
      "Turn on **Count outside the dex** to count the Pokémon from other regions too.",
    ],
    shot: "shots/updates/bw2.webp",
    action: { label: "Open Black 2 & White 2", go: "bw2" },
  },
  {
    id: "bw-2026-09",
    date: "2026-09-30",
    title: "Black & White",
    text: "Unova is in: the Unova dex and every Pokémon you can get beyond it after the story (White Forest, swarms, fossils). Hunts use Gen 5's odds of 1 in 8,192, with the Masuda Method at 1 in 1,366.",
    steps: [
      "Open **Black & White** in the menu.",
      "Start a hunt: **Wild**, **Breeding** or **Masuda**.",
      "Turn on **Count outside the dex** to count the Pokémon from other regions too.",
    ],
    shot: "shots/updates/bw.webp",
    action: { label: "Open Black & White", go: "bw" },
  },
  {
    id: "xy-2026-09",
    date: "2026-09-30",
    title: "X & Y",
    text: "Kalos is in: the whole Kalos dex (Central, Coastal and Mountain as one), the Pokémon you can get beyond it (Friend Safari, fossils) and hunts with the Poké Radar, the Friend Safari, chain fishing and hordes.",
    steps: [
      "Open **X & Y** in the menu.",
      "Start a hunt and pick **Poké Radar**, **Friend Safari** or **Chain fishing**, then set your chain.",
      "Turn on **Count outside the dex** to count the Friend Safari Pokémon and fossils too.",
    ],
    shot: "shots/updates/xy.webp",
    action: { label: "Open X & Y", go: "xy" },
  },
  {
    id: "oras-2026-09",
    date: "2026-09-30",
    title: "Omega Ruby & Alpha Sapphire",
    text: "Hoenn is in: the Hoenn dex, every Pokémon you can get beyond it (Mirage spots, Soaring, the other starters) and hunts with the DexNav, chain fishing and hordes.",
    steps: [
      "Open **Omega Ruby & Alpha Sapphire** in the menu.",
      "Start a hunt and pick **DexNav**, then set your search level and where you are in the chain.",
      "Turn on **Count outside the dex** to count the Mirage spot and Soaring Pokémon too.",
    ],
    shot: "shots/updates/oras.webp",
    action: { label: "Open Omega Ruby & Alpha Sapphire", go: "oras" },
  },
  {
    id: "hunt-methods-2026-09",
    date: "2026-09-30",
    title: "More hunt methods",
    text: "Ultra Wormholes in Ultra Sun & Ultra Moon, Brilliant Aura with the Number battled bonus and Max Raids in Sword & Shield, every Poké Radar chain step in BD & SP, and Breeding and Tera Raids in Scarlet & Violet.",
    steps: [
      "Open a hunt and pick the method under **Hunt method**.",
      "Set the details, like the wormhole's rings and light-years or your radar chain.",
      "The odds, luck meter and pace follow right away.",
    ],
    shot: "shots/updates/hunt-methods.webp",
    action: { label: "Open Ultra Sun & Ultra Moon", go: "usum" },
  },
  {
    id: "hunt-pace-2026-09",
    date: "2026-09-30",
    title: "Hunt pace and ETA",
    text: "The Hunt Deck now shows your encounters per hour, how many more hours of hunting until you hit odds at that pace, and the average hunting time per shiny.",
    steps: [
      "Open a hunt and scroll to **Pace**, under the luck meter.",
      "It appears after a minute and a few encounters, and follows your timer.",
      "It counts hunt time, like your timer: pauses don't count.",
    ],
    shot: "shots/updates/hunt-pace.webp",
    action: { label: "Open Active hunts", go: "hunts" },
  },
  {
    id: "forms-2026-09",
    date: "2026-09-30",
    title: "Forms: collect every look",
    text: "Vivillon patterns, Furfrou trims, Flabébé flowers, Rotom appliances, gender differences and more: 142 Pokémon now have a forms checklist. Any form still counts the Pokémon, the rest is extra.",
    steps: [
      "Open a Pokémon in the **Shiny Dex**, like Vivillon. **Forms** shows which ones you have.",
      "**Tap a form** to see its shiny and your shinies of it.",
      "Pick the form with the **Form** dropdown when you hunt, add or edit a shiny.",
    ],
    shot: "shots/updates/forms.webp",
    action: { label: "Try it on Vivillon", go: "entry:vivillon" },
  },
  {
    id: "stats-2026-09",
    date: "2026-09-30",
    title: "Stats: your Shiny Wrapped",
    text: "Highlights, charts per game and month, your luckiest and longest hunts, and a card to share. Per year or all time.",
    steps: ["Open **Stats** in the menu.", "Pick a year at the top.", "Tap **Share your Wrapped** for the card."],
    shot: "shots/stats.webp",
    action: { label: "Open Stats", go: "stats" },
  },
  {
    id: "share-card-2026-09",
    date: "2026-09-30",
    title: "Share cards",
    text: "Every logged shiny gets a card with its sprite, encounters, hunt time and odds, ready for your socials.",
    steps: ["Hit **Gotcha!** and tap **Share card** in the message, or", "open a shiny in the log and tap **Share**."],
    shot: "shots/share-card.webp",
  },
  {
    id: "notifications-2026-09",
    date: "2026-09-29",
    title: "Notifications",
    text: "Get a notification on your phone or computer when ShinyCheck adds a game or feature. Only real updates.",
    steps: ["Open the menu and tap **Notifications**.", "Tap **Turn on**. On iPhone, add ShinyCheck to your Home Screen first."],
  },
  {
    id: "app-2026-09",
    date: "2026-09-29",
    title: "ShinyCheck as an app",
    text: "Install ShinyCheck on your phone or computer. It opens full screen, works offline and keeps the screen on while a hunt runs.",
    steps: ["Tap **Install app** in the menu (on iPhone: Share → Add to Home Screen)."],
  },
  {
    id: "phone-2026-09",
    date: "2026-09-29",
    title: "Made for phones",
    text: "Big +1 and Gotcha! buttons in reach of your thumb, a timer that keeps running, and a layout that fits every screen.",
    shot: "shots/hunt.webp",
  },
  {
    id: "sm-2026-09",
    date: "2026-09-29",
    title: "Sun & Moon and Ultra Sun & Ultra Moon",
    text: "Both Alola games are in, with their island dexes, SOS chains and Island Scan locations.",
    action: { label: "Open Sun & Moon", go: "sm" },
  },
  {
    id: "outside-2026-09",
    date: "2026-09-29",
    title: "Outside the dex and shiny locks",
    text: "Pokémon you can catch beyond a game's regional dex have their own tab. Shiny-locked Pokémon show a lock and don't count toward a game's total.",
  },
  {
    id: "phases-2026-09",
    date: "2026-09-29",
    title: "Phases",
    text: "Found a different shiny mid-hunt? Log it as a phase and keep going. The hunt remembers every phase.",
    steps: ["In the Hunt Deck, tap **Log phase** and pick the Pokémon."],
  },
  {
    id: "methods-2026-09",
    date: "2026-09-29",
    title: "Hunt methods with real odds",
    text: "Pick your method, Shiny Charm and bonuses per game, and ShinyCheck works out the odds for you.",
  },
];
