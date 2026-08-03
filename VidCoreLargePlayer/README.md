# VidCore Library Player

A standalone responsive HTML player with a persistent local media library and metadata-first discovery tools.

## Core controls

- Defaults to `https://vidcore.net`
- Starts at movie ID `1`
- Movie and TV modes
- Previous, Play, Next, Random, Save, Theater, Fullscreen, and Ad blockers controls
- TV mode uses `{series}/{season}/{episode}`

## Direct Previous and Next discovery

**Previous** and **Next** use the public metadata database to jump directly to the nearest known numeric TMDB identifier before loading the embedded player.

The discovery path:

- requests the nearest database ID above or below the current ID
- does not request every missing integer between titles
- resolves the returned title and cover metadata
- keeps unusable or generic metadata out of the video iframe
- continues to the next actual database record only when a returned record still lacks usable metadata
- waits 900 ms between those exceptional candidate retries
- loads the first usable title automatically
- changes Previous, Next, and Random to **Stop scan** while active
- stops immediately when a scan button is pressed again
- stops on metadata-service errors instead of retrying aggressively

Sequential discovery requires a numeric TMDB identifier. IMDb-style `tt...` identifiers can still be played directly, but they are not numerically ordered.

## Random discovery

The selector beside **Random** offers two modes:

- **Random ID** — chooses a random numeric seed, asks the public database for the nearest known ID at or above that seed, resolves it, and loads it.
- **Database pick** — chooses a random release year and month, requests a matching public-database movie or TV identifier, resolves it, and loads it. It falls back to a random numeric seed when that month has no match.

Random discovery does not select from saved favorites, Continue Watching, or prior choices.

## Rolling Recommended queue

The **Recommended** tab is a rolling discovery queue rather than a history-based recommendation list.

Any title that resolves with cover art is added automatically, including:

- Previous and Next matches
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

The scanner regression verifies rolling-queue behavior, direct next/previous database queries, random-number and database-title queries, and that `scanner.js` is loaded after `discovery.js` by the shipped page.

## URL formats

Movie:

```text
{base_url}/movie/{imdb_or_tmdb_id}
```

TV:

```text
{base_url}/tv/{tmdb_series_id}/{season}/{episode}
```
