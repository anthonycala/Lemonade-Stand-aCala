/** Business numbers from Nayeli's Sliminade Stand 4th Grade Business Plan */

export const PRODUCTS = {
  lemonade: {
    id: "lemonade" as const,
    name: "Fresh Lemonade",
    unitLabel: "cup",
    price: 6,
    startingStock: 200,
  },
  slimeBundle: {
    id: "slimeBundle" as const,
    name: "Slime Bundle",
    unitLabel: "bundle",
    price: 4,
    unitsPerSale: 3,
    startingStock: 80, // 240 slimes ÷ 3
    safetyWarning: "SLIME IS NOT EDIBLE, NOT SAFE TO CONSUME",
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;

export const HARD_COSTS = [
  { item: "Lemons", details: "2 cases", amount: 110.0, category: "products" as const },
  { item: "Sugar", details: "3 bags @ $7.98", amount: 23.94, category: "products" as const },
  { item: "Cups", details: "2 packs (200 cups)", amount: 149.76, category: "supplies" as const },
  { item: "Ice", details: "Starting ice", amount: 28.82, category: "products" as const },
  { item: "Stickers", details: "Branding", amount: 23.0, category: "supplies" as const },
  { item: "Water", details: "Fresh water", amount: 20.0, category: "supplies" as const },
  { item: "Slime inventory", details: "240 slimes", amount: 53.98, category: "products" as const },
] as const;

export const TOTAL_HARD_COSTS = HARD_COSTS.reduce((sum, row) => sum + row.amount, 0);

export const BRAND = {
  name: "Nayeli's Sliminade Stand",
  tagline: "Fresh Lemonade • Cool Slime • Good Vibes",
  slogan: "Squeeze it. Stretch it. Love it!",
  colors: {
    pink: "#FF4FA3",
    green: "#8BD640",
    yellow: "#FFD44D",
    purple: "#7B5EA7",
    cream: "#FFF8E7",
    ink: "#2A1F3D",
  },
} as const;

export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
