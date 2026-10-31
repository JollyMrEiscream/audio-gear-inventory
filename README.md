# Audio Gear Inventory

Public catalog of Levi Szantosi’s audio gear — speakers, mixers, microphones, stands, and cables.

**Live site:** https://jollymreiscream.github.io/audio-gear-inventory/

`src/data/inventory.json` is the list of gear. Photos live in `public/photos/`. A filename in an item’s `photos` array must match a file in that folder. Items with an empty `photos` array show a placeholder instead of a picture.

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
