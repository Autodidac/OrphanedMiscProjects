# VidCore Library Player

A standalone responsive HTML player with a persistent local media library.

## Core controls

- Defaults to `https://vidcore.net`
- Starts at movie ID `1`
- Movie and TV modes
- Previous, Play, Next, Save, and Fullscreen
- TV mode uses `{series}/{season}/{episode}`
- Previous and Next remain manual controls; the app does not scan endpoint IDs automatically

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

The app now uses a storage backend instead of directly dereferencing a global database handle:

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

Run the syntax check and storage-startup regression test from the repository root:

```powershell
node --check VidCoreLargePlayer/app.js
node VidCoreLargePlayer/tests/storage-startup.test.mjs
```

The regression test runs the app with IndexedDB intentionally unavailable and verifies that fallback storage initializes, a list can be created, and case-insensitive duplicate names are rejected.

## URL formats

Movie:

```text
{base_url}/movie/{imdb_or_tmdb_id}
```

TV:

```text
{base_url}/tv/{tmdb_series_id}/{season}/{episode}
```
