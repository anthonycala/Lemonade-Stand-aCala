# Nayeli's Sliminade Stand Kiosk

Tablet-friendly point-of-sale kiosk for the stand. Tap to record lemonade and slime-bundle sales while inventory, hard costs, revenue, and profit update live.

## Products

| Product | Price | Starting stock | Notes |
| --- | --- | --- | --- |
| Fresh Lemonade | $6 each | 200 cups | Separate cup art |
| Passion Fruit Lemonade | $8 each | 50 cups | Light-up cup + spider ring |
| Slime Bundle | $5 (3 slimes) | 80 bundles | Original slime product photo |

Starting hard costs total **$409.50**. Profit goal from the plan: **$1,110.50**.

In **Settings** you can change each product’s price, description, and picture (upload JPG/PNG). Custom pictures save on the device.

## Run locally

```bash
cd sliminade-kiosk
npm install
npm run dev
```

## Live site

**https://anthonycala.github.io/Lemonade-Stand-aCala/**

On iPhone: Safari → Share → **Add to Home Screen** (works offline after the first visit).

## Upgrades

On the confirm-sale screen:

- **Lemonade:** add a light-up cup (+$1) and/or spider ring (+$1). Inventory swaps the regular cup/straw for the upgrade pieces.
- **Passion Fruit Lemonade ($8):** spider ring + light-up cup already included.
- **Slime Bundle:** pick **3 free charms** per bundle (ghost, pumpkin, bat, black cat, witch hat, skull). Extra charms are +$0.50 each.

## Individual inventory

Sales also decrement supply pieces (cups, lids, straws, lemons, sugar/water/ice portions, slime containers, glue/activator/coloring/glitter, napkins, stickers, charms). Light-up cups and spider rings are tracked for drink upgrades. CSV exports include inventory plus upgrade/charm columns on each sale.

## Stand tools

- Quantity sales (1–5), restock finished goods or individual supplies (+10)
- Full sales history + filters
- Multiple restore points (Undo/Reset/Restock/Closeout)
- Cash closeout (starting cash + revenue vs counted cash)
- Pre-event checklist
- Settings: event name, product prices, starting cash, low-stock thresholds
- Download/share CSV (sales + individual inventory + audit)
- Kiosk lock PIN: `1234`
- Day reset requires typing `RESET`

## Linear project

https://linear.app/sliminade-kiosk-stand/project/sliminade-kiosk-enhancements-de59a5f1ea71
