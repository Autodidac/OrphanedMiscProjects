# Mission Cache

## Completed

- [x] Add the HTML media player under `VidCoreLargePlayer/`.
- [x] Default the configurable base URL to `https://vidcore.net`.
- [x] Start at movie ID `1`.
- [x] Support movie and TV URL formats.
- [x] Add Previous, Play, Next, Save, Theater, Fullscreen, and Popup blocking controls.
- [x] Replace the oversized fixed-height iframe with a capped responsive 16:9 player.
- [x] Add honest full-width Theater mode without spoofing browser fullscreen state.
- [x] Hide the sidebar and title-details row in Theater mode while preserving popup blocking.
- [x] Persist Theater mode and allow the **Esc** key to restore the normal layout.
- [x] Add `VidCoreLargePlayer/tests/theater-mode.test.mjs` covering toggle, persistence, and Esc exit.
- [x] Preserve a dedicated library sidebar without forcing the player beyond the visible desktop area.
- [x] Replace flat localStorage favorites with structured IndexedDB storage.
- [x] Migrate legacy favorites automatically.
- [x] Resolve title names, posters, years, descriptions, genres, IMDb IDs, and TMDB IDs through Wikidata.
- [x] Add a bulk **Resolve list** action for the selected list or the complete library.
- [x] Batch bulk metadata resolution in groups of 20 entries.
- [x] Add named lists with item counts, watched state, notes, filtering, and JSON import/export.
- [x] Add Continue Watching for recently played movies and TV episodes.
- [x] Include Continue Watching history in JSON export/import.
- [x] Add related movie/TV suggestions with official IMDb/TMDB links.
- [x] Split the player into `index.html`, `styles.css`, and `app.js` for maintainability.
- [x] Fix `Cannot read properties of null (reading 'transaction')` when creating lists.
- [x] Replace the fragile global database handle with an IndexedDB/localStorage storage backend.
- [x] Disable storage-dependent controls until storage initialization completes.
- [x] Make every favorites, lists, history, import, export, and bulk-action path wait for shared storage readiness.
- [x] Fall back to browser localStorage when IndexedDB is unavailable, blocked, or rejected.
- [x] Handle cross-tab IndexedDB version changes without null dereferences.
- [x] Queue Continue Watching updates when playback starts before storage initialization completes.
- [x] Prevent stale metadata and related-title responses from overwriting a newer selected title.
- [x] Preserve existing notes and list selection when editing a saved title.
- [x] Reject empty, reserved, and case-insensitive duplicate list names with visible feedback.
- [x] Add `VidCoreLargePlayer/tests/storage-startup.test.mjs` covering fallback startup and list creation.
- [x] Validate `app.js` with `node --check` and the storage regression test.
- [x] Delete stale `agent/*` branches and leave only `main`.
- [x] Add strict iframe sandboxing that blocks popups, parent-page redirects, downloads, forms, and modal dialogs.
- [x] Remove web-share and all unnecessary iframe permissions.
- [x] Add a persisted **Popup blocking** compatibility toggle that reloads the current player.
- [x] Add `VidCoreLargePlayer/tests/popup-guard.test.mjs` covering strict defaults and compatibility mode.
- [x] Document storage behavior, popup blocking, Theater mode, fallback behavior, testing, and backup workflow.

## Open / deferred

- [ ] Optional cloud synchronization requires a user-owned backend or account provider.
- [ ] Metadata quality depends on the corresponding Wikidata record.
- [ ] Related-title ranking can be improved later with more signals than shared genres.
- [ ] Exact playback position cannot be read from a cross-origin embedded player unless the provider exposes a supported postMessage event API.
- [ ] A cross-origin redirect that remains entirely inside the iframe cannot be inspected or canceled by ordinary parent-page JavaScript; complete network-level filtering requires a browser extension, DNS/content blocker, or filtering proxy.
- [ ] The app intentionally does not fake `document.fullscreenElement`, fullscreen events, or browser fullscreen state for embedded providers.
