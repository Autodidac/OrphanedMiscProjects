# VidCore Library Player

A standalone responsive HTML player with a persistent local media library.

## Core controls

- Defaults to `https://vidcore.net`
- Starts at movie ID `1`
- Movie and TV modes
- Previous, Play, Next, Save, Theater, Fullscreen, and Ad blockers controls
- TV mode uses `{series}/{season}/{episode}`
- Previous and Next remain manual controls; the app does not scan endpoint IDs automatically

## Theater mode

**Theater** fills the available browser width without entering fullscreen or reporting a false fullscreen state to the embedded page.

When enabled, it:

- hides the library sidebar and title-details row
- expands the main player to the complete browser content width
- preserves the embedded video's aspect ratio while respecting the visible browser height
- changes the button to **Exit theater**
- exits with the button or the **Esc** key
- remembers the preference in the current browser profile

Real **Fullscreen** remains available as a separate control.

## External ad blocker setup

The embedded player now uses a normal unsandboxed iframe because some providers detect and reject sandbox mode.

The **Ad blockers** button opens:

- the official uBlock Origin listing for Microsoft Edge
- the official Pie Adblock listing
- instructions for enabling extension access when the player is opened from `file://`
- a copy button for `edge://extensions`
- the localhost launch command

When opening `index.html` directly, Edge extensions may need **Allow access to file URLs** enabled from the extension's Details page. Without that permission, an installed blocker may not filter the embedded page reliably.

The more reliable setup is:

```powershell
py -m http.server 8080
```

Then open:

```text
http://localhost:8080/VidCoreLargePlayer/
```

The retired `popup-guard.js` file remains only as a compatibility tombstone for old cached copies of `index.html`; current builds do not load it.

## Compact player layout

The normal player uses a capped 16:9 viewport instead of a fixed `650px` minimum height. On desktop it is limited to the available content width and `68vh`, with smaller responsive minimums on tablets and phones. Theater mode removes the content-width cap and uses the full horizontal browser area.

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

Interface preferences are stored as:

```text
vidcoreLibrary.theaterMode
```

The data is not saved in the GitHub repository and is not synchronized across browsers or devices. The older `vidcoreLargePlayer.favorites` localStorage format is migrated automatically.

Use **Export JSON** to back up or transfer the complete library.

## Validation

Run the syntax checks and regression tests from the repository root:

```powershell
node --check VidCoreLargePlayer/app.js
node --check VidCoreLargePlayer/ad-blocker-help.js
node --check VidCoreLargePlayer/theater-mode.js
node VidCoreLargePlayer/tests/storage-startup.test.mjs
node VidCoreLargePlayer/tests/ad-blocker-help.test.mjs
node VidCoreLargePlayer/tests/popup-guard.test.mjs
node VidCoreLargePlayer/tests/theater-mode.test.mjs
```

The storage regression test verifies fallback storage and list creation. The ad-blocker-help test verifies the dialog, local-file warning, extensions-page copy action, and close action. The retired popup-guard test verifies the sandbox is absent and the replacement is loaded. The theater-mode test verifies the layout toggle, persisted preference, and **Esc** exit behavior.

## URL formats

Movie:

```text
{base_url}/movie/{imdb_or_tmdb_id}
```

TV:

```text
{base_url}/tv/{tmdb_series_id}/{season}/{episode}
```
