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
    id: "hunt-pace-2026-09",
    date: "2026-09-30",
    title: "Hunt pace and ETA",
    text: "The Hunt Deck now shows your encounters per hour, how long until you hit odds at that pace, and the average wait for a shiny.",
    steps: [
      "Open a hunt and scroll to **Pace**, under the luck meter.",
      "It appears after a minute and a few encounters, and follows your timer.",
      "While the timer runs you also see the time you'd hit odds hunting non-stop.",
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
