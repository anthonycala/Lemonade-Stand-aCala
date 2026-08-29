# Nayeli's Sliminade Stand Kiosk

Tablet-friendly point-of-sale kiosk for the stand. Tap to record lemonade and slime-bundle sales while inventory, hard costs, revenue, and profit update live.

## Products (from the business plan)

| Product | Price | Starting stock |
| --- | --- | --- |
| Fresh Lemonade | $6 each | 200 cups |
| Slime Bundle | $4 (3 slimes) | 80 bundles |

Starting hard costs total **$409.50**. The kiosk shows progress toward earning that back.

## Run locally

```bash
cd sliminade-kiosk
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Sales persist in the browser via `localStorage`.

## Website / GitHub Pages

Merging to `master` runs [`.github/workflows/deploy-kiosk.yml`](../.github/workflows/deploy-kiosk.yml), which publishes the kiosk as a static website.

1. In the GitHub repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. If the repo is private on a free plan, make it **public** (or use GitHub Pro) so Pages can serve it
3. After the workflow succeeds, open:

**https://anthonycala.github.io/Lemonade-Stand-aCala/**

### How to test on the site

1. Open the site on a phone or laptop
2. Tap **Tap to sell** on lemonade → **Yes, sold!** → revenue should be $6, cups left 199
3. Tap slime → read the safety warning → **Yes, sold!** → revenue $10, bundles left 79
4. Check **Hard-cost recovery** and **Starting hard costs** ($409.50)
5. Try **Undo last sale**, then **Reset day**

## Use at the stand

1. Open the app on a phone or tablet (full-screen / kiosk mode works best).
2. Tap **Tap to sell** on lemonade or slime.
3. Confirm the sale (slime shows the not-edible safety reminder).
4. Watch inventory, revenue, profit, and hard-cost recovery update.
5. Use **Undo last sale** for mistakes or **Reset day** to start fresh.

## Stack

Vite + React + TypeScript. Brand art lives in `public/assets/`.
