# VidCore Library Player

A standalone large-screen HTML player with a persistent local media library.

## Core controls

- Defaults to `https://vidcore.net`
- Starts at movie ID `1`
- Movie and TV modes
- Previous, Play, Next, Save, and Fullscreen
- TV mode uses `{series}/{season}/{episode}`

## Library upgrades

- Resolves available title names, descriptions, years, posters, genres, IMDb IDs, and TMDB IDs through the public Wikidata SPARQL endpoint
- Saves entries into named lists
- Tracks watched state and notes
- Filters the saved library
- Suggests related movies or TV using shared Wikidata genres
- Related results link to IMDb/TMDB and can copy an identifier into the player field
- Exports and imports the complete library as JSON

## Where favorites are saved

Favorites and named lists are stored in the current browser profile using IndexedDB:

```text
Database: vidcore-library
Stores: favorites, lists
```

They are not saved in the GitHub repository and are not synchronized across browsers or devices.

The older `vidcoreLargePlayer.favorites` localStorage data is migrated automatically on first load.

Use **Export JSON** to back up or transfer the library.

## Running

Open `index.html` directly. For more consistent browser storage and network behavior, use a local server:

```powershell
py -m http.server 8080
```

Then open:

```text
http://localhost:8080/VidCoreLargePlayer/
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

Previous and Next are manual controls. The app does not automatically scan endpoint IDs.
