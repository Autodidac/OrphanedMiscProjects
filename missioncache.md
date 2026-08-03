# Mission Cache

## Completed

- [x] Add the HTML media player under `VidCoreLargePlayer/`.
- [x] Default the configurable base URL to `https://vidcore.net`.
- [x] Start at movie ID `1`.
- [x] Support movie and TV URL formats.
- [x] Add Previous, Play, Next, Random, Save, Theater, Fullscreen, and Ad blockers controls.
- [x] Replace the oversized fixed-height iframe with a capped responsive 16:9 player.
- [x] Add full-width Theater mode without spoofing browser fullscreen state.
- [x] Persist Theater mode and allow **Esc** to restore the normal layout.
- [x] Add `VidCoreLargePlayer/tests/theater-mode.test.mjs`.
- [x] Preserve a dedicated library sidebar.
- [x] Replace flat localStorage favorites with IndexedDB plus localStorage fallback.
- [x] Migrate legacy favorites automatically.
- [x] Fix `Cannot read properties of null (reading 'transaction')` when creating lists.
- [x] Disable storage-dependent controls until initialization completes.
- [x] Handle cross-tab IndexedDB version changes without null dereferences.
- [x] Queue Continue Watching updates during storage startup.
- [x] Preserve notes and list selection when editing saved titles.
- [x] Reject empty, reserved, and case-insensitive duplicate list names.
- [x] Add `VidCoreLargePlayer/tests/storage-startup.test.mjs`.
- [x] Resolve names, posters, years, descriptions, genres, IMDb IDs, and TMDB IDs through Wikidata.
- [x] Add English Wikipedia fallback for generic names, missing descriptions, and missing cover art.
- [x] Make **Resolve list** repair already-resolved entries with incomplete metadata.
- [x] Batch bulk Wikidata resolution and limit Wikipedia repair concurrency.
- [x] Prevent stale metadata and related-title responses from overwriting a newer title.
- [x] Add related movie/TV suggestions with IMDb/TMDB links.
- [x] Add metadata-first sequential scanning for numeric IDs.
- [x] Make **Previous** and **Next** check one public metadata ID at a time until a match resolves.
- [x] Keep unresolved scan candidates out of the video iframe.
- [x] Delay unresolved scanner steps by 650 ms and stop on metadata errors.
- [x] Allow any scan button to cancel an active scan.
- [x] Add **Random ID** discovery that starts at a random numeric ID and scans forward.
- [x] Add **Database pick** discovery that chooses an actual public metadata identifier.
- [x] Stop using favorites, history, or prior choices as the Random source.
- [x] Replace history-based recommendations with a rolling resolved-image queue.
- [x] Add every resolved title with cover art to Recommended even when it is not saved.
- [x] Include scanner hits, database picks, manual resolutions, related images, and repaired list entries in Recommended.
- [x] Deduplicate the rolling queue, promote newly resolved duplicates, and retain the newest 40 entries.
- [x] Persist rolling discoveries under `vidcoreLibrary.discoveryQueue`.
- [x] Add `VidCoreLargePlayer/scanner.js` as an isolated scanner layer.
- [x] Add `VidCoreLargePlayer/tests/scanner.test.mjs` covering queue behavior and database-choice queries.
- [x] Add named lists with counts, watched state, notes, filtering, and JSON import/export.
- [x] Add Continue Watching and include it in JSON backup.
- [x] Split the player into focused HTML, CSS, storage, discovery, scanner, blocker-help, and theater modules.
- [x] Test strict iframe sandboxing and confirm the provider detects or rejects it.
- [x] Retire the detected iframe sandbox and restore a normal unsandboxed iframe.
- [x] Replace internal popup blocking with an **Ad blockers** help dialog.
- [x] Add official uBlock Origin for Edge and Pie Adblock links.
- [x] Explain **Allow access to file URLs** and document localhost serving.
- [x] Add `VidCoreLargePlayer/tests/ad-blocker-help.test.mjs`.
- [x] Retain `popup-guard.js` only as an unloaded compatibility tombstone.
- [x] Delete stale `agent/*` branches and leave only `main`.
- [x] Document scanner behavior, rolling recommendations, metadata fallback, storage, ad blockers, and testing.

## Open / deferred

- [ ] Optional cloud synchronization requires a user-owned backend or account provider.
- [ ] Entries with no matching Wikidata identifier or English Wikipedia article can still have incomplete metadata.
- [ ] Exact playback position cannot be read from a cross-origin embedded player unless the provider exposes a supported `postMessage` API.
- [ ] Browser extensions must be enabled for the player origin; `file://` launches may require explicit file-URL access.
- [ ] Extension effectiveness depends on browser permissions, filter lists, and provider anti-blocking behavior.
- [ ] The app intentionally does not fake browser fullscreen state.
