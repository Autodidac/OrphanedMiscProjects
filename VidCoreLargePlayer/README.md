# VidCore Library Player

A standalone responsive HTML player with a persistent local media library and metadata-first discovery tools.

## Core controls

- Defaults to `https://vidcore.net`
- Starts at movie ID `1`
- Movie and TV modes
- Previous, Play, Next, Random, Save, Theater, Fullscreen, and Ad blockers controls
- TV mode uses `{series}/{season}/{episode}`

## Metadata-first Previous and Next

**Previous** and **Next** now scan numeric TMDB identifiers through public metadata before loading the embedded player.

The scanner:

- checks one identifier at a time
- waits 650 ms between unresolved identifiers
- does not load unresolved identifiers into the video iframe
- continues until it finds a real metadata match
- loads the matched title automatically
- changes Previous, Next, and Random to **Stop scan** while active
- stops immediately when any scan button is pressed again
- stops on metadata-service errors instead of retrying aggressively

Sequential scanning requires a numeric TMDB identifier. IMDb-style `tt...` identifiers can still be played directly, but they are not numerically incremented.

## Random discovery

The selector beside **Random** offers two modes:

- **Random ID** — chooses a random numeric starting point and scans forward until metadata resolves.
- **Database pick** — chooses an actual movie or TV identifier from the public metadata database, resolves it, and loads it.

Random discovery no longer selects from saved favorites, Continue Watching, or prior choices.

## Rolling Recommended queue

The **Recommended** tab is now a rolling discovery queue rather than a history-based recommendation list.

Any title that resolves with cover art is added automatically, including:

- sequential scanner matches
- random ID matches
- public-database picks
- manually resolved current titles
- related titles with resolved cover art
- list entries whose metadata or artwork was repaired

Titles do not need to be saved. The newest resolved image is placed first, duplicate identifiers are promoted instead of duplicated, and the queue keeps the newest 40 entries before older entries are pushed out.

The queue is stored locally under:

```text
vidcoreLibrary.discoveryQueue
```

## Improved names and cover art

Metadata resolution uses two layers:

1. Wikidata resolves identifiers, names, descriptions, years, genres, IMDb/TMDB identifiers, and direct images.
2. When the name is generic, the description is missing, or no direct image exists, the matching English Wikipedia page is queried for a better title, introduction, and thumbnail.

**Resolve list** also repairs entries previously marked resolved but still missing cover art, descriptions, or real names.

Some entries can remain incomplete when the identifier has no matching Wikidata record or English Wikipedia page.

## Theater mode

**Theater** fills the available browser width without entering fullscreen or reporting a false fullscreen state to the embedded page.

It hides the library sidebar and title-details row, preserves the video aspect ratio, remembers the preference, and exits with the button or **Esc**. Real **Fullscreen** remains separate.

## External ad blocker setup

The embedded player uses a normal unsandboxed iframe because some providers detect and reject sandbox mode.

The **Ad blockers** button opens official uBlock Origin for Edge and Pie Adblock listings, file-URL permission instructions, a copy action for `edge://extensions`, and the localhost launch command.

When opening `index.html` directly, Edge extensions may need **Allow access to file URLs** enabled from the extension Details page.

The more reliable setup is:

```powershell
py -m http.server 8080
```

Then open:

```text
http://localhost:8080/VidCoreLargePlayer/
```

## Library features

- Named lists with item counts
- Watched state and notes
- Continue Watching
- Library filtering
- Related movie and TV suggestions
- Official IMDb/TMDB links
- JSON import and export
- IndexedDB storage with automatic localStorage fallback
- Automatic migration of older favorites

## Storage

Preferred storage:

```text
Database: vidcore-library
Stores: favorites, lists, history
```

Fallback storage uses keys beginning with:

```text
vidcoreLibrary.fallback.
```

Theater and discovery preferences use:

```text
vidcoreLibrary.theaterMode
vidcoreLibrary.discoveryQueue
```

Data is local to the current browser profile and is not synchronized automatically.

## Validation

Run from the repository root:

```powershell
node --check VidCoreLargePlayer/app.js
node --check VidCoreLargePlayer/discovery.js
node --check VidCoreLargePlayer/scanner.js
node --check VidCoreLargePlayer/ad-blocker-help.js
node --check VidCoreLargePlayer/theater-mode.js
node VidCoreLargePlayer/tests/storage-startup.test.mjs
node VidCoreLargePlayer/tests/discovery.test.mjs
node VidCoreLargePlayer/tests/scanner.test.mjs
node VidCoreLargePlayer/tests/ad-blocker-help.test.mjs
node VidCoreLargePlayer/tests/popup-guard.test.mjs
node VidCoreLargePlayer/tests/theater-mode.test.mjs
```

## URL formats

Movie:

```text
{base_url}/movie/{imdb_or_tmdb_id}
```

TV:

```text
{base_url}/tv/{tmdb_series_id}/{season}/{episode}
```
