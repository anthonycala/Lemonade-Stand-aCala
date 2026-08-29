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

**https://anthonycala.github.io/Lemonade-Stand-aCala/**

On a phone: Safari → Share → **Add to Home Screen** for a full-screen kiosk icon.

### How to test on the site

1. Tap **Tap to sell**, set quantity if needed, confirm
2. Open **Stand tools** → Restock / Undo / Restore / Download / Reset
3. Reset requires typing `RESET`; Restore brings back the safety backup from Undo/Reset
4. Check hard-cost recovery vs $409.50

### Tips for event day

- Use **one device** as the register (tabs sync only if they share the same browser storage)
- Download/share the sales CSV at lunch and end of day
- Leave private browsing off so counts can save
- Safety backup is created on Undo/Reset and is **not** overwritten by later sales

## Stack

Vite + React + TypeScript. Brand art lives in `public/assets/`.
