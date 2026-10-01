# ShinyCheck V3

Shiny Dex and shiny-hunt tracker for Pokémon. Plain HTML, CSS and JavaScript (ES modules) — no build step,
no dependencies. Live at [shinycheck.nl](https://shinycheck.nl).

- **Shiny Dex** — all 1,081 Pokémon and forms. A card glows once a shiny of it is logged in any game.
- **Games** — Red, Blue & Yellow (the Kanto dex to browse; Gen 1 has no shinies), Gold & Silver, Crystal, Ruby & Sapphire, FireRed & LeafGreen, Emerald, Diamond & Pearl, Platinum, HeartGold & SoulSilver, Black & White, Black 2 & White 2, X & Y, Omega Ruby & Alpha Sapphire, Sun & Moon, Ultra Sun & Ultra Moon, Let's Go Pikachu & Eevee, Sword & Shield, BD & SP, Legends: Arceus, Scarlet & Violet and Legends: Z-A (incl. Mega Dimension), each with its regional dexes, an Outside the dex tab and per-game shiny locks.
- **Hunt Deck** — encounter counter, timer that keeps running, luck meter, pace (encounters per hour, time to odds), a live chain counter for the Poké Radar, chain fishing and the DexNav, Gotcha! log, pop-out mini window.
- **Dex Entry** — every shiny of a species across all games (and Pokémon GO), edit, evolve and undo evolve.
- **Forms** — cosmetic forms, switchable forms and gender differences (Vivillon, Furfrou, Flabébé, Rotom, …) as a checklist in Dex Entry; pick the form when adding, editing or hunting. Any form counts the species; forms are extra.
- **Landing page** — shown before signing in (the gate in `index.html`): what shiny hunting is, the features with screenshots from `shots/`, and the sign-in card. Its **Feed** tab shows everyone's newest catches read-only (`js/features/landing-feed.js`); liking or opening a trainer asks to create an account. Firestore lets anyone read posts and public profiles for this.
- **Community** — a feed (`/feed`) of everyone's new catches ("For you") or of the trainers you follow ("Following"),
  with likes (tap the heart or double-tap the Pokémon). Every trainer has a profile (`/@username`, or `/trainer` for your
  own) with their catches, whole collection (big cards with every fact, or mini tiles; search by name or dex number, sort by newest, dex number or name, filter by game with chips for only the games they have shinies in), likes, followers and following. A new catch (Gotcha, a phase, or a manual log
  dated in the last 3 days) is posted by itself; editing or deleting it updates the post. Profiles are public by default
  and can be made private in Edit profile (name, unique @username, picture). The bell shows new followers and likes on your shinies. **Find trainers** (on the feed page) looks people up by name or @username. Emails are never shown.
- **Admin dashboard** — `/admin`, only for the admin account (`ADMIN_UID` in `js/core/config.js`, `isAdmin()` in
  `firestore.rules`; reached from the ⚙ menu): accounts, trainers online now / today / this week, community totals and the
  free plan's Firestore limits with a link to the usage page in the Firebase console (reading the numbers in the app would
  need Google's Monitoring API, which needs billing). Online comes from `presence/{uid}`, stamped every 4 minutes while
  the app is open (`features/presence.js`).
- **Accounts** — Firebase Auth (Google or email) with progress synced to Firestore. On start the app shows the landing page or the app straight away, from what this device saw last
  (`shinycheck-v3-signed-in`, read in `index.html`'s head); `services/cloud.js` corrects it once Firebase knows.
- **What's new** — update log at `/updates`, filled from `data/updates.js` (newest first). The newest entry shows once as a popup with a short tutorial and screenshot (`shots/updates/`) to people who already use ShinyCheck; "seen" is kept in the account and on the device. To announce an update, add an entry at the top.
- **Notifications** — opt-in update news (Menu → Notifications), sent with Firebase Cloud Messaging.
- **App** — installable (Add to Home Screen / Install app) and works offline via a service worker (`sw.js`); new versions show an Update prompt.

## Project structure

```
index.html              the page: all markup (landing/sign-in gate, pages, drawers, dialogs)
404.html                GitHub Pages fallback: sends clean URLs like /sv back to the app
sw.js                   service worker: offline app, update prompt, push notifications
manifest.webmanifest    installable app
firebase-config.js      Firebase web config (public); null = local-only mode
firestore.rules         Firestore security rules
firestore.indexes.json  the one composite index (posts by trainer, newest first) the Following feed needs

css/                    stylesheets, loaded in name order (later files win on equal selectors)
data/                   content as plain scripts that set a global:
  pokedex.js              window.DEX      every Pokémon and form (sprites, types, dex numbers per game)
  evolutions.js           window.EVO      evolution chains
  forms.js                window.FORMS    alternate forms per entry (generated, scripts/gen-forms.py)
  updates.js              window.UPDATES  the What's new log (edit by hand)
js/                     the app, as ES modules
  main.js                 entry point: loads everything, runs each module's init() in order, routes
  core/                   config, storage (store.js), UI state, formatting, helpers
  model/                  game data and rules: games, dex, shiny locks, per-game dex, hunt odds, forms
  components/             reusable UI: card, form picker, game picker, hunt setup, toast, sidebar, …
  pages/                  one per route: home (/), game (/sv …), hunts, stats, updates, feed, profile, admin, plus the router
  features/               drawers and dialogs: hunt-deck/, dex-entry, share card, backups, …
  services/cloud.js       Firebase: sign-in, Firestore sync, backups, push tokens (separate module)
  services/social.js      community data: profiles, usernames, posts, likes, follows (through cloud.js's connection)
  services/admin.js       admin dashboard data: counts, who's online, the free plan's limits
scripts/                bump-version (asset versions), gen-forms.py, send-push.mjs (notifications)
tests/smoke.mjs         end-to-end smoke test in headless Chrome
sprites/ types/ logos/ icons/ shots/   images
```

### How it fits together

- **Data flow.** `core/store.js` holds the collection (`shinies`, `hunts`, `prefs`) in localStorage. Every
  change calls a `save…()` function, which also tells `services/cloud.js` to sync it to Firestore.
  `features/sync.js` turns the collection into a snapshot for backups and the cloud, and loads one back in.
- **Model vs. UI.** `core/` and `model/` never touch other folders' UI and run their code on import.
  Everything else exports an `init()` with its event wiring; `main.js` calls those in a fixed order.
- **Rendering.** Pages render HTML strings into the containers in `index.html`. `pages/router.js` maps the
  URL to a page (`render()`); after data changes, call `render()` or the page's own render function.
- **Versions.** `scripts/bump-version.mjs` stamps `?v=<version>` on every file and generates the CSS links,
  the import map (so each module gets the new version) and the service worker's offline file list.
  It runs from the pre-commit hook, so adding a CSS or JS file needs no other edit.
- **Community.** `features/social-sync.js` mirrors the collection to the public side after every cloud save:
  `collections/{uid}` (the profile's Collection tab), the shiny count on `profiles/{uid}`, and one `posts/{uid_pid}`
  per catch that has a post id (`pid`, given by `markPost()` when it's logged). `pages/feed.js` and `pages/profile.js`
  show them with `components/post-card.js` (the share card's facts) and `features/post-actions.js` (likes, share).
  cloud.js announces `cloud:user`, `cloud:ready` and `cloud:saved` events; the social modules listen to those.

### Adding things

- **A feature**: a new module in `js/features/` (or `js/pages/` for a new route) with a header comment, an
  `init()` for its event wiring, imported and called in `js/main.js`. Markup goes in `index.html`, styles
  in a new or matching file in `css/`. Reusable pieces belong in `js/components/`.
- **A game**: `js/model/games.js` (GAMES in `core/config.js`, GAME_INFO), dex numbers in `data/pokedex.js`,
  hunt methods in `js/model/hunt-setup.js`, locks in `js/model/availability.js`.
- **An update in What's new**: an entry at the top of `data/updates.js` (optionally a screenshot in `shots/updates/`).
- **Forms**: run `python3 scripts/gen-forms.py`.

## Testing

```sh
node tests/smoke.mjs
```

Drives the whole app in headless Chrome (Node 22+, Google Chrome) with a demo collection, a fixed clock and
seeded randomness: every page and game, the Hunt Deck, Dex Entry, forms, dialogs, the What's new popup and a
phone layout. It fails on any JavaScript error or broken expectation. Run it before every commit.

For refactors that shouldn't change anything, record a run before and compare after:
`node tests/smoke.mjs --record before.json`, change the code, then `node tests/smoke.mjs --compare before.json`
(add `--shots dir` to also save a screenshot per step).

## Run locally

Firebase sign-in needs an http(s) origin, so serve the folder instead of opening the file:

```sh
python3 -m http.server 5173
```

Then open http://localhost:5173. The service worker stays off on localhost so you always get fresh files; add `?sw` to test it.

## Deploying

Push to `main`; GitHub Pages publishes it within a minute. Files carry a `?v=` version so browsers don't
keep serving old ones — `scripts/bump-version.sh` updates it. Install it as a pre-commit hook once:

```sh
printf '#!/bin/sh\nif git diff --cached --name-only | grep -qE "\\.(js|css|html)$|^sprites/|^types/|^logos/"; then\n  ./scripts/bump-version.sh >/dev/null && git add index.html sw.js\nfi\n' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

## Firebase

- `firebase-config.js` — the project's web config (public by design). Set it to `null` for local-only mode.
- `firestore.rules` — security rules; paste them into Firestore → Rules. Each account can only read and write its own `users/{uid}` document, with ShinyCheck's fields and size limits.
  The community collections are readable by every signed-in trainer and written by their owner only; a post's like
  count can only move by one together with that trainer's like document, follows can only be made in your own name,
  and a username belongs to whoever claimed it first (`usernames/{name}`).
- `firestore.indexes.json` — the composite index for the Following feed (`posts`: `uid` ascending, `createdAt`
  descending). Create it once under Firestore → Indexes → Composite → Create index.

### Testing against the emulators

To try accounts and the community without touching the real project, run the Firebase emulators (auth on 9099,
Firestore on 8181, with `firestore.rules`) and, on `http://localhost:…`, set `localStorage["shinycheck-emulator"] = "1"`
before the app loads: cloud.js then connects to the emulators instead.

## Notifications

Devices that turn on notifications store their FCM token in `pushTokens/{token}`; `sw.js` shows the
message and opens the app on tap. Send one from GitHub → Actions → **Send notification** → Run workflow,
or from a terminal:

```sh
gh workflow run notify.yml -f title="Sun & Moon has been added" -f body="Track your Alola shinies" -f url=/sm
```

Setup (once):
1. Firebase → Project settings → Cloud Messaging → Web Push certificates → Generate key pair, and put the
   public key in `vapidKey` in `firebase-config.js`.
2. Firebase → Project settings → Service accounts → Generate new private key, then
   `gh secret set FIREBASE_SERVICE_ACCOUNT < key.json` and delete the file. Never commit it.
3. Publish the updated `firestore.rules` (it has the `pushTokens` section).

On iPhone and iPad notifications only work in the installed app (Add to Home Screen, iOS 16.4+).

## Screenshots

The landing page images in `shots/` are real screenshots of the app with a demo collection, taken in headless
Chrome (dark theme; desktop at 1280×800 @2x, phones at 390×844 @3x) and saved as WebP. Retake them when the UI changes.

## Data sources

- Pokémon, forms, sprites and regional dex numbers: a Pokémon HOME Living Dex spreadsheet.
- Red, Blue & Yellow: Kanto dex from PokeAPI (`kanto`), browse only: Gen 1 has no shinies (`DEX_ONLY` in
  `js/core/config.js`, `noShiny` in `GAME_INFO`). Its logo and Gold & Silver's come from the English title screens.
- Gold & Silver: Johto dex from PokeAPI (`original-johto`), locks from Serebii's per-species pages as for Crystal.
- Crystal: Johto dex from PokeAPI (`original-johto`, all 251); locations from Serebii's per-species pages decide
  which ones are locked (trades from Gold & Silver or Gen 1 don't count).
- Ruby & Sapphire: Hoenn dex from PokeAPI (`hoenn`); every other Pokémon there needs a trade, so there's no
  Outside the dex.
- FireRed & LeafGreen: Kanto dex from PokeAPI (`kanto`), Outside the dex and locations from Serebii's per-species
  pages (the Sevii Islands, and Navel Rock and Birth Island: the Switch version gives their tickets after the
  Hall of Fame; trades and events don't count).
- Emerald: Hoenn dex from PokeAPI (`hoenn`), Outside the dex and locations from Serebii's per-species pages
  (the ticket islands, Altering Cave's event Pokémon, the Colosseum bonus disc and trades don't count).
- Diamond & Pearl: Sinnoh dex from PokeAPI (`original-sinnoh`), Outside the dex and locations from Serebii's
  per-species pages (Pal Park, the dual-slot Game Boy Advance encounters, trades and events don't count).
- Platinum: Sinnoh dex from PokeAPI (`extended-sinnoh`), Outside the dex and locations the same way.
- HeartGold & SoulSilver: Johto dex from PokeAPI (`updated-johto`), Outside the dex and locations from
  Serebii's per-species pages (Pokéwalker counts; Pal Park, the event-only Sinjoh Ruins and trades don't).
- Black & White: Unova dex from PokeAPI (`original-unova`), Outside the dex and locations from Serebii's
  per-species pages (Dream World, Dream Radar, transfers and events don't count).
- Black 2 & White 2: Unova dex from PokeAPI (`updated-unova`), Outside the dex and locations the same way.
- X & Y: Kalos dex from PokeAPI's `kalos-central`, `kalos-coastal` and `kalos-mountain`, numbered on as one
  dex (Central 1–150, Coastal 151–303, Mountain 304–454), Outside the dex and locations from Serebii's per-species pages.
- Omega Ruby & Alpha Sapphire: Hoenn dex from PokeAPI (`updated-hoenn`), Outside the dex and locations from
  Serebii's per-species pages (a trade with X & Y, transfer or event doesn't count).
- Evolution chains: [PokeAPI](https://pokeapi.co) (`data/evolutions.js`).
- Forms and their shiny HOME sprites: [PokeAPI](https://pokeapi.co) via `scripts/gen-forms.py` (`data/forms.js`, `sprites/forms/`).
