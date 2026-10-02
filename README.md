# webTPG

A small, minimalist web app that shows live tram and bus departures for stops in Geneva, using the
[transport.opendata.ch](https://transport.opendata.ch) API.

- **Search**: find a stop by name (results are limited to the Geneva area). Recently opened stops are remembered.
- **Near me**: uses your location to list the closest stops with their distance.
- Tap a stop to see upcoming trams and buses: line, final destination and minutes until departure
  (realtime delays included when available). The board refreshes every 30 seconds.
- English / French toggle, light and dark mode, mobile-first layout.

## Run locally

```sh
npm install
npm run dev       # http://localhost:5173
```

Build a static bundle into `dist/`:

```sh
npm run build
npm run preview
```

The build is fully static (relative paths), so `dist/` can be served from any static host.

## Deploy

`.github/workflows/pages.yml` builds and deploys to GitHub Pages on every push to `main` (and the current default branch).
Enable it once under **Settings → Pages → Source: GitHub Actions**.

Note: "Near me" needs the page to be served over HTTPS (or `localhost`) for the browser to allow location access.
