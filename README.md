# The Editorial Estate

Mobile-first UK property deal stream with:

- 3-bed and garden-first feed
- county and town filters
- infinite scrolling cards
- PropBar-style price reduction visual
- school A-F rank, crime signal, EPC, and station time

## Run

```bash
npm install
npm run dev
```

Client: `http://localhost:5173`

API: `http://localhost:8787`

## Docker

Run the remote-style single-container deployment from GHCR:

```bash
docker compose up -d
```

Then open:

```bash
http://localhost:8080
```

Image:

```bash
ghcr.io/athen-player1/house-hunting:latest
```

## Notes

- The repo ships with seeded UK listings so the app is usable immediately when no live search target is provided.
- Targeted county or town searches now attempt live Zoopla ingestion through a local curl-based scraper path, with seeded fallback when no live scrape target is available.
- Live Zoopla matches carry real listing detail URLs; fallback seeded cards keep using search-style links until additional live sources are integrated.
- `server/providers/portal-adapters.ts` is the seam for plugging in real scrapers or licensed feeds.
- School bands and crime signals are modeled in the API response so official public datasets can be wired in without redesigning the frontend.
- Additional research on commercial vs open-data integrations lives in `docs/integrations.md`.
