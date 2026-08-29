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

## Use at the stand

1. Open the app on a phone or tablet (full-screen / kiosk mode works best).
2. Tap **Tap to sell** on lemonade or slime.
3. Confirm the sale (slime shows the not-edible safety reminder).
4. Watch inventory, revenue, profit, and hard-cost recovery update.
5. Use **Undo last sale** for mistakes or **Reset day** to start fresh.

## Stack

Vite + React + TypeScript. Brand art lives in `public/assets/`.
