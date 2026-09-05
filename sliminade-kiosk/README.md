# Nayeli's Sliminade Stand Kiosk

Tablet-friendly point-of-sale kiosk for the stand. Tap to record lemonade and slime-bundle sales while inventory, hard costs, revenue, and profit update live.

## Products (from the business plan)

| Product | Price | Starting stock |
| --- | --- | --- |
| Fresh Lemonade | $6 each | 200 cups |
| Slime Bundle | $4 (3 slimes) | 80 bundles |

Starting hard costs total **$409.50**. Profit goal from the plan: **$1,110.50**.

## Run locally

```bash
cd sliminade-kiosk
npm install
npm run dev
```

## Live site

**https://anthonycala.github.io/Lemonade-Stand-aCala/**

On iPhone: Safari → Share → **Add to Home Screen** (works offline after the first visit).

## Stand tools

- Quantity sales (1–5), restock +10
- Full sales history + filters
- Multiple restore points (Undo/Reset/Restock/Closeout)
- Cash closeout (starting cash + revenue vs counted cash)
- Pre-event checklist
- Settings: event name, starting cash, low-stock thresholds
- Download/share CSV (sales + inventory + audit)
- Kiosk lock PIN: `1234`
- Day reset requires typing `RESET`

## Linear project

https://linear.app/sliminade-kiosk-stand/project/sliminade-kiosk-enhancements-de59a5f1ea71
