# ShinyCheck V3

Pokémon HOME Living Dex and shiny-hunt tracker. Plain HTML, CSS and JavaScript — no build step.

- **Living Dex** — all 1,081 Pokémon and forms from AustinJohn's HOME Living Dex sheet (v1.4.1). A card glows once a shiny of it is logged.
- **Games** — Sword & Shield, BD & SP, Legends: Arceus, Scarlet & Violet and Legends: Z-A (incl. Mega Dimension), each with its regional dexes.
- **Hunt Deck** — encounter counter, timer that keeps running, luck meter, Gotcha! log, pop-out mini window.
- **Dex Entry** — every shiny of a species across all games (and Pokémon GO), edit, evolve and undo evolve.
- **Accounts** — Firebase Auth (Google or email) with progress synced to Firestore.

## Run locally

Firebase sign-in needs an http(s) origin, so serve the folder instead of opening the file:

```sh
python3 -m http.server 5173
```

Then open http://localhost:5173.

## Firebase

- `firebase-config.js` — the project's web config (public by design). Set it to `null` for local-only mode.
- `firestore.rules` — security rules; paste them into Firestore → Rules. Each account can only read and write its own `users/{uid}` document, with ShinyCheck's fields and size limits.

## Data sources

- Pokémon, forms, sprites and regional dex numbers: AustinJohn's HOME Living Dex sheet.
- Evolution chains: [PokeAPI](https://pokeapi.co) (`evo.js`).
- Legends: Z-A Mega Dimension dex order: ShinyCheck V2.
