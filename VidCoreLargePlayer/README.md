# VidCore Library Player

A standalone responsive HTML player with a persistent local media library.

## Core controls

- Defaults to `https://vidcore.net`
- Starts at movie ID `1`
- Movie and TV modes
- Previous, Play, Next, Save, Fullscreen, and Popup blocking controls
- TV mode uses `{series}/{season}/{episode}`
- Previous and Next remain manual controls; the app does not scan endpoint IDs automatically

## Popup and redirect blocking

**Popup blocking: On** is the default. The embedded player receives a strict iframe sandbox with only these capabilities:

```text
allow-scripts allow-same-origin allow-presentation
```

Because the sandbox does **not** grant popup, top-navigation, download, form, or modal permissions, embedded pages cannot:

- open popup or pop-under windows
- redirect the parent player page
- start downloads
- submit forms
- display JavaScript modal dialogs
- use web-share, camera, microphone, geolocation, payment, USB, or clipboard permissions

The iframe also uses `referrerpolicy="no-referrer"` and a restricted Permissions Policy containing only autoplay, encrypted media, fullscreen, and picture-in-picture.

Some providers may refuse to play inside a sandbox. **Popup blocking: Off** removes the sandbox, reloads the current player, and stores that compatibility preference locally. Turning blocking back on reapplies the restrictions and reloads the player.

A parent page cannot inspect or cancel a cross-origin redirect that remains entirely inside the iframe. The sandbox prevents that embedded page from escaping into the parent tab or opening another window, which is the protection available in ordinary browser code without a browser extension or filtering proxy.

## Compact player layout

The player uses a capped 16:9 viewport instead of a fixed `650px` minimum height. On desktop it is limited to the available content width and `68vh`, with smaller responsive minimums on tablets and phones.

## Library features

- Resolves available names, descriptions, years, posters, genres, IMDb IDs, and TMDB IDs through the public Wikidata SPARQL endpoint
- **Resolve list** resolves every unresolved item in the currently selected list, or the complete library when **All** is selected
- Bulk resolution runs in batches of 20 entries instead of issuing one request per saved title
- Saves entries into named lists with visible item counts
- Tracks watched state and notes
- Includes **Continue Watching** for recently played movies and TV episodes
- Filters the saved library
- Suggests related movies or TV using shared Wikidata genres
- Related results link to IMDb/TMDB and can place an identifier into the player field
- Exports and imports the complete library, lists, and Continue Watching history as JSON

## Storage reliability

The app uses a storage backend instead of directly dereferencing a global database handle:

1. IndexedDB is opened first.
2. Storage-dependent controls stay disabled until initialization finishes.
3. If IndexedDB is unavailable, blocked for more than six seconds, or rejected by the browser, the app automatically uses a localStorage fallback.
4. Every list, favorite, history, import, export, and bulk-resolution action waits for the shared storage readiness promise.
5. Cross-tab IndexedDB version changes close the old connection and display a reload warning instead of throwing a null `transaction` error.

Empty list names, the reserved name `All`, and case-insensitive duplicates are rejected with visible feedback. Editing an existing saved title preserves its notes and selected list.

## Where favorites are saved

Preferred storage:

```text
Database: vidcore-library
Stores: favorites, lists, history
```

Fallback storage uses browser localStorage keys beginning with:

```text
vidcoreLibrary.fallback.
```

The popup-blocking preference is stored as:

```text
vidcoreLibrary.strictPopupBlocking
```

The data is not saved in the GitHub repository and is not synchronized across browsers or devices. The older `vidcoreLargePlayer.favorites` localStorage format is migrated automatically.

Use **Export JSON** to back up or transfer the complete library.

## Running

Open `index.html` directly. For more consistent browser storage and network behavior, use a local server:

```powershell
py -m http.server 8080
```

Then open:

```text
http://localhost:8080/VidCoreLargePlayer/
```

## Validation

Run the syntax checks and regression tests from the repository root:

```powershell
node --check VidCoreLargePlayer/app.js
node --check VidCoreLargePlayer/popup-guard.js
node VidCoreLargePlayer/tests/storage-startup.test.mjs
node VidCoreLargePlayer/tests/popup-guard.test.mjs
```

The storage regression test runs the app with IndexedDB intentionally unavailable and verifies fallback storage and list creation. The popup-guard test verifies strict blocking is enabled by default, forbidden sandbox capabilities remain absent, and compatibility mode can be toggled and persisted.

## URL formats

Movie:

```text
{base_url}/movie/{imdb_or_tmdb_id}
```

TV:

```text
{base_url}/tv/{tmdb_series_id}/{season}/{episode}
```
