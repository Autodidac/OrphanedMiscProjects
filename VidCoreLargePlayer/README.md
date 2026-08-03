# VidCore Large Player

A minimal single-file HTML player with a large viewing area and persistent favorites.

## Behavior

- Defaults to `https://vidcore.net`
- Starts with movie ID `1`
- **Play** loads the current ID
- **Next** increments a numeric movie ID by one
- In TV mode, **Next** increments the episode
- **Favorite** saves the current movie or episode in browser local storage
- Fullscreen support
- Responsive layout with a narrow favorites sidebar on large screens

## Run

Open `index.html` in a modern browser.

## URL formats

Movie:

```text
{base_url}/movie/{id}
```

TV:

```text
{base_url}/tv/{id}/{season}/{episode}
```

The **Next** button is manual. The app does not crawl sites, scan availability, or automatically detect valid IDs.
