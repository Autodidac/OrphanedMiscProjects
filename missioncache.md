# Mission Cache

## Completed

- [x] Add the HTML media player under `VidCoreLargePlayer/`.
- [x] Default the configurable base URL to `https://vidcore.net`.
- [x] Start at movie ID `1`.
- [x] Support movie and TV URL formats.
- [x] Add Previous, Play, Next, Save, and Fullscreen controls.
- [x] Replace the oversized fixed-height iframe with a capped responsive 16:9 player.
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
- [x] Fix the IndexedDB startup race that caused `Cannot read properties of null (reading 'transaction')` when creating lists.
- [x] Disable storage-dependent controls until IndexedDB is ready.
- [x] Add shared database readiness checks to every favorites, lists, history, import, export, and bulk-action path.
- [x] Handle blocked upgrades and cross-tab IndexedDB version changes without null dereferences.
- [x] Preserve existing notes and list selection when editing a saved title.
- [x] Reject duplicate and empty list names with visible feedback.
- [x] Document local storage behavior and backup workflow.

## Open / deferred

- [ ] Optional cloud synchronization requires a user-owned backend or account provider.
- [ ] Metadata quality depends on the corresponding Wikidata record.
- [ ] Related-title ranking can be improved later with more signals than shared genres.
- [ ] Exact playback position cannot be read from a cross-origin embedded player unless the provider exposes a supported postMessage event API.
