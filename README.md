# even-checker

Cloudflare Worker that proxies the [Even Realities](https://evenrealities.com) order tracking API and renders a clean, bookmarkable status page.

## Why

The official tracking site at `track.evenrealities.com` requires manually entering email and order number every visit. This worker accepts those as URL params so you can bookmark a direct link to your order status.

## Usage

```
https://even-checker.<subdomain>.workers.dev/?email=you@example.com&order_number=12345
```

Without params, it shows a simple lookup form.

## Development

```bash
npm install
npm run dev        # starts local dev server at localhost:8787
```

## Deploy

```bash
npm run deploy
```

Requires [Wrangler](https://developers.cloudflare.com/workers/wrangler/) and a Cloudflare account.
