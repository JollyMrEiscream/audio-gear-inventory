# Audio Gear Inventory

Public catalog of Levi Szantosi’s audio gear — speakers, mixers, microphones, stands, and cables.

**Live site:** https://jollymreiscream.github.io/audio-gear-inventory/

`src/data/inventory.json` is the list of gear. Photos live in `public/photos/`. A filename in an item’s `photos` array must match a file in that folder. Items with an empty `photos` array show a placeholder instead of a picture.

Items marked `"photoSource": "web"` use a manufacturer or retailer product photo instead of a photo of the actual unit; the card shows a **Product photo** badge and `photoCredit` holds the source page.

## Photo credits

Product photos are from the makers' and retailers' product pages, used to identify the gear:

- Yamaha MG12 — [Yamaha](https://usa.yamaha.com/products/proaudio/mixers/mg_series_xu_model/index.html)
- Shure BLX88, BLX1, SCM410, SM58, A25D clip — [Shure](https://www.shure.com/)
- RØDE NTG4, RM5 clip — [RØDE](https://rode.com/)
- Swiff Audio M1 — [CBN Music Warehouse](https://www.cbnmusicwarehouse.com/products/swiff-audio-m1-wireless-microphone-system-transmitter)
- RadioShack 3300660 — [Open Box Central](https://www.openboxcentral.com/radioshack-usb-digital-xlr-analog-dynamic-microphone/)

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. The dev server uses the GitHub Pages base path, so the app is at:

http://localhost:5173/audio-gear-inventory/

## Production build

```bash
npm run build
npm run preview
```

`npm run build` writes the static site to `dist/`. The preview server uses the same `/audio-gear-inventory/` base path.

## GitHub Pages

Pushes to `main` run [`.github/workflows/pages.yml`](.github/workflows/pages.yml): `npm ci`, `npm run build`, upload `dist`, then deploy with GitHub Pages.

Pages has to build from GitHub Actions (Settings → Pages → Build and deployment → Source: **GitHub Actions**). The published site is:

https://jollymreiscream.github.io/audio-gear-inventory/
