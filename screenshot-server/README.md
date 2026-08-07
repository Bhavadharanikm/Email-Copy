# VPS screenshot server

Runs on the box behind `http://2.24.211.60:3001`. `netlify/functions/html-to-image.js`
calls it as the **primary** renderer because it is far faster than launching Puppeteer
inside a Netlify function.

## Why this exists

The VPS could not produce transparent PNGs, so on 24 June 2026 the app was changed to
**skip the VPS whenever a transparent render was requested** (commit `a8070de`).

That turned out to cover almost everything — **20 of 24** render calls across all
templates pass `transparent: true`: every button PNG, every grid, the pins, the stamps.
So in practice nearly every render fell back to local Puppeteer at roughly **5 seconds
each**, several per Generate.

`server.js` here fixes that. Two changes over the old server:

1. **`omitBackground`** — reads `transparent` from the request body and passes it to
   `page.screenshot()`, so transparent renders work.
2. **Warm browser** — launches Chromium once and reuses it, closing only the tab per
   request. Launch was the bulk of the per-render cost.

## Contract

Do not change this — the Netlify function depends on it.

```
POST /screenshot
  { html, width, height, locationId, ghlApiKey, transparent }
  -> 200 { url }        # hosted PNG in the GHL media library
  -> 4xx/5xx { error }

GET /health -> { ok: true, warm: <bool> }
```

## Deploy

```bash
# on the VPS, in this folder
npm init -y
npm pkg set type=module
npm i express puppeteer
node server.js            # PORT env var, defaults to 3001
```

Keep it running with pm2 / systemd, whatever the box already uses:

```bash
pm2 start server.js --name screenshot && pm2 save
```

## Then turn it on

Once deployed, set this in Netlify env vars:

```
VPS_SUPPORTS_TRANSPARENT=true
```

That flips `html-to-image.js` to route transparent renders through the VPS too. Until
it is set, behaviour is unchanged — transparent renders keep using local Puppeteer, so
deploying this server early is safe.

## Verify

```bash
curl -s localhost:3001/health
```

Then generate once and check the Netlify function log:

```
[html-to-image] VPS OK (transparent: true ): https://assets.cdn.filesafe.space/...
```

If you instead see `Launching Puppeteer (sparticuz/chromium, Linux)`, the VPS was
skipped or failed — the preceding `VPS failed:` line says why.
