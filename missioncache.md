# Mission Cache

## Completed

- [x] Add the HTML media player under `VidCoreLargePlayer/`.
- [x] Default the configurable base URL to `https://vidcore.net`.
- [x] Start at movie ID `1`.
- [x] Support movie and TV URL formats.
- [x] Add Previous, Play, Next, Random, Save, Theater, Fullscreen, and Ad blockers controls.
- [x] Replace the oversized fixed-height iframe with a capped responsive 16:9 player.
- [x] Add honest full-width Theater mode without spoofing browser fullscreen state.
- [x] Hide the sidebar and title-details row in Theater mode.
- [x] Persist Theater mode and allow the **Esc** key to restore the normal layout.
- [x] Add `VidCoreLargePlayer/tests/theater-mode.test.mjs` covering toggle, persistence, and Esc exit.
- [x] Preserve a dedicated library sidebar without forcing the player beyond the visible desktop area.
- [x] Replace flat localStorage favorites with structured IndexedDB storage.
- [x] Migrate legacy favorites automatically.
- [x] Resolve title names, posters, years, descriptions, genres, IMDb IDs, and TMDB IDs through Wikidata.
- [x] Add English Wikipedia fallback resolution for generic names, missing descriptions, and missing cover art.
- [x] Include Wikipedia article bindings in single-title and bulk Wikidata queries.
- [x] Make **Resolve list** repair already-resolved entries with incomplete names or art.
- [x] Limit Wikipedia metadata repair to three concurrent requests.
- [x] Add a **Recommended** section combining library, Continue Watching, and related suggestions.
- [x] Label saved/recent recommendations as known and related suggestions as availability unknown.
- [x] Add **Random** selection that prefers known non-current titles before related suggestions.
- [x] Add `VidCoreLargePlayer/tests/discovery.test.mjs` covering metadata repair, recommendation aggregation, and random selection.
- [x] Add a bulk **Resolve list** action for the selected list or the complete library.
- [x] Batch bulk metadata resolution in groups of 20 entries.
- [x] Add named lists with item counts, watched state, notes, filtering, and JSON import/export.
- [x] Add Continue Watching for recently played movies and TV episodes.
- [x] Include Continue Watching history in JSON export/import.
- [x] Add related movie/TV suggestions with official IMDb/TMDB links.
- [x] Split the player into `index.html`, `styles.css`, and `app.js` plus focused enhancement scripts.
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
- [x] Test strict iframe sandboxing and confirm the provider detects or rejects it.
- [x] Retire the detected iframe sandbox and restore a normal unsandboxed player iframe.
- [x] Replace the internal popup-blocking toggle with an **Ad blockers** help dialog.
- [x] Add official uBlock Origin for Edge and Pie Adblock links.
- [x] Detect `file://` launches and explain **Allow access to file URLs**.
- [x] Add a copy action for `edge://extensions` and document the localhost alternative.
- [x] Add `VidCoreLargePlayer/tests/ad-blocker-help.test.mjs` covering the dialog, file warning, copy action, and close action.
- [x] Retain `popup-guard.js` only as an unloaded compatibility tombstone for old cached pages.
- [x] Document storage behavior, external ad blocker setup, Theater mode, metadata fallback, recommendations, testing, and backup workflow.

## Open / deferred

- [ ] Optional cloud synchronization requires a user-owned backend or account provider.
- [ ] Entries with no matching Wikidata identifier or English Wikipedia article can still have incomplete metadata.
- [ ] Related-title ranking can be improved later with more signals than shared genres.
- [ ] Exact playback position cannot be read from a cross-origin embedded player unless the provider exposes a supported postMessage event API.
- [ ] Browser extensions must be enabled for the player origin; `file://` launches may require explicit file-URL access.
- [ ] Extension effectiveness depends on browser permissions, filter lists, and provider anti-blocking behavior.
- [ ] The app intentionally does not fake `document.fullscreenElement`, fullscreen events, or browser fullscreen state for embedded providers.
