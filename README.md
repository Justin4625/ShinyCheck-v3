# ShinyCheck V3

Shiny Dex and shiny-hunt tracker for Pokémon. Plain HTML, CSS and JavaScript — no build step.

- **Shiny Dex** — all 1,081 Pokémon and forms. A card glows once a shiny of it is logged in any game.
- **Games** — Sun & Moon, Ultra Sun & Ultra Moon, Let's Go Pikachu & Eevee, Sword & Shield, BD & SP, Legends: Arceus, Scarlet & Violet and Legends: Z-A (incl. Mega Dimension), each with its regional dexes, an Outside the dex tab and per-game shiny locks.
- **Hunt Deck** — encounter counter, timer that keeps running, luck meter, Gotcha! log, pop-out mini window.
- **Dex Entry** — every shiny of a species across all games (and Pokémon GO), edit, evolve and undo evolve.
- **Forms** — cosmetic forms, switchable forms and gender differences (Vivillon, Furfrou, Flabébé, Rotom, …) as a checklist in Dex Entry; pick the form when adding, editing or hunting. Any form counts the species; forms are extra.
- **Landing page** — shown before signing in (the gate in `index.html`): what shiny hunting is, the features with screenshots from `shots/`, and the sign-in card.
- **Accounts** — Firebase Auth (Google or email) with progress synced to Firestore.
- **What's new** — update log at `/updates`, filled from `updates.js` (newest first). The newest entry shows once as a popup with a short tutorial and screenshot (`shots/updates/`) to people who already use ShinyCheck; "seen" is kept in the account and on the device. To announce an update, add an entry at the top.
- **Notifications** — opt-in update news (Menu → Notifications), sent with Firebase Cloud Messaging.
- **App** — installable (Add to Home Screen / Install app) and works offline via a service worker (`sw.js`); new versions show an Update prompt.

## Run locally

Firebase sign-in needs an http(s) origin, so serve the folder instead of opening the file:

```sh
python3 -m http.server 5173
```

Then open http://localhost:5173. The service worker stays off on localhost so you always get fresh files; add `?sw` to test it.

## Deploying

Push to `main`; GitHub Pages publishes it within a minute. Scripts and the stylesheet carry a
`?v=` version so browsers don't keep serving old files — `scripts/bump-version.sh` updates it
(run it before committing, or install it as a pre-commit hook).

## Firebase

- `firebase-config.js` — the project's web config (public by design). Set it to `null` for local-only mode.
- `firestore.rules` — security rules; paste them into Firestore → Rules. Each account can only read and write its own `users/{uid}` document, with ShinyCheck's fields and size limits.

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
- Evolution chains: [PokeAPI](https://pokeapi.co) (`evo.js`).
- Forms and their shiny HOME sprites: [PokeAPI](https://pokeapi.co) via `scripts/gen-forms.py` (`forms.js`, `sprites/forms/`).
