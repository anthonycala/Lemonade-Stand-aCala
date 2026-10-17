/** Business numbers from Nayeli's Sliminade Stand 4th Grade Business Plan */

export const PRODUCTS = {
  lemonade: {
    id: "lemonade" as const,
    name: "Fresh Lemonade",
    unitLabel: "cup",
    price: 6,
    startingStock: 200,
    image: "assets/lemonade-cup.jpg",
    imageAlt: "Fresh squeezed lemonade in a clear cup with ice and lemon",
    cardClass: "lemonade",
    priceLabel: "each" as const,
    description: "Fresh squeezed lemonade in a 24 oz cup with ice.",
  },
  passionFruit: {
    id: "passionFruit" as const,
    name: "Passion Fruit Lemonade",
    unitLabel: "cup",
    price: 8,
    startingStock: 50,
    image: "assets/passion-fruit-cup.jpg",
    imageAlt: "Passion fruit lemonade in a light-up cup with spider ring",
    cardClass: "passion",
    priceLabel: "each" as const,
    description:
      "Fresh squeezed passion fruit lemonade. Includes spider ring + light-up cup!",
    includes: "Includes spider ring + light-up cup!",
    safetyWarning: "Spider ring and light are not edible.",
  },
  slimeBundle: {
    id: "slimeBundle" as const,
    name: "Slime Bundle",
    unitLabel: "bundle",
    price: 5,
    unitsPerSale: 3,
    startingStock: 80, // 240 slimes ÷ 3
    image: "assets/slime-product.jpg",
    imageAlt:
      "Slime bundle of three colorful slime tubs — green, pink, and blue",
    cardClass: "slime",
    priceLabel: "bundle" as const,
    description:
      "3 glow-in-the-dark slimes for $5, plus 3 free Halloween charms.",
    includes: "+ 3 free charms with every 3-slime purchase",
    safetyWarning: "DO NOT EAT — Slime and charms are not edible.",
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;
export const PRODUCT_IDS = Object.keys(PRODUCTS) as ProductId[];
export type ProductStock = Record<ProductId, number>;

/** Editable catalog fields stored in settings (images as data URLs). */
export type ProductCatalogEntry = {
  description: string;
  /** Custom image as a data URL; null/empty uses the default asset. */
  imageDataUrl: string | null;
};

export type ProductCatalog = Record<ProductId, ProductCatalogEntry>;

export function createDefaultProductCatalog(): ProductCatalog {
  const catalog = {} as ProductCatalog;
  for (const id of PRODUCT_IDS) {
    catalog[id] = {
      description: PRODUCTS[id].description,
      imageDataUrl: null,
    };
  }
  return catalog;
}

export function createStartingProductStock(): ProductStock {
  const stock = {} as ProductStock;
  for (const id of PRODUCT_IDS) {
    stock[id] = PRODUCTS[id].startingStock;
  }
  return stock;
}

export function defaultProductImageSrc(productId: ProductId): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${PRODUCTS[productId].image}`;
}

export function productDisplayName(productId: ProductId, qty = 1): string {
  if (productId === "lemonade") {
    return qty === 1 ? "lemonade" : "lemonades";
  }
  if (productId === "passionFruit") {
    return qty === 1 ? "passion fruit" : "passion fruits";
  }
  return qty === 1 ? "slime bundle" : "slime bundles";
}

/**
 * Individual supply inventory (from stand inventory tracker).
 * Starting stocks match the business-plan capacity for lemonade (200)
 * and slime (240 individual tubs / 80 bundles).
 */
export const INVENTORY_ITEMS = {
  cups: {
    id: "cups" as const,
    name: "Cups",
    category: "serving" as const,
    unit: "each",
    startingStock: 200,
    reorderAt: 20,
  },
  lids: {
    id: "lids" as const,
    name: "Lids",
    category: "serving" as const,
    unit: "each",
    startingStock: 200,
    reorderAt: 20,
  },
  straws: {
    id: "straws" as const,
    name: "Straws",
    category: "serving" as const,
    unit: "each",
    startingStock: 200,
    reorderAt: 20,
  },
  lightUpCups: {
    id: "lightUpCups" as const,
    name: "Light-up cups",
    category: "serving" as const,
    unit: "each",
    startingStock: 50,
    reorderAt: 5,
  },
  spiderStraws: {
    id: "spiderStraws" as const,
    name: "Spider rings",
    category: "serving" as const,
    unit: "each",
    startingStock: 50,
    reorderAt: 5,
  },
  charmGhost: {
    id: "charmGhost" as const,
    name: "Ghost charms",
    category: "charms" as const,
    unit: "each",
    startingStock: 120,
    reorderAt: 12,
  },
  charmPumpkin: {
    id: "charmPumpkin" as const,
    name: "Pumpkin charms",
    category: "charms" as const,
    unit: "each",
    startingStock: 120,
    reorderAt: 12,
  },
  charmBat: {
    id: "charmBat" as const,
    name: "Bat charms",
    category: "charms" as const,
    unit: "each",
    startingStock: 120,
    reorderAt: 12,
  },
  charmBlackCat: {
    id: "charmBlackCat" as const,
    name: "Black cat charms",
    category: "charms" as const,
    unit: "each",
    startingStock: 120,
    reorderAt: 12,
  },
  charmWitchHat: {
    id: "charmWitchHat" as const,
    name: "Witch hat charms",
    category: "charms" as const,
    unit: "each",
    startingStock: 120,
    reorderAt: 12,
  },
  charmSkull: {
    id: "charmSkull" as const,
    name: "Skull charms",
    category: "charms" as const,
    unit: "each",
    startingStock: 120,
    reorderAt: 12,
  },
  lemons: {
    id: "lemons" as const,
    name: "Lemons",
    category: "ingredients" as const,
    unit: "each",
    startingStock: 100,
    reorderAt: 20,
  },
  sugar: {
    id: "sugar" as const,
    name: "Sugar portions",
    category: "ingredients" as const,
    unit: "portion",
    startingStock: 200,
    reorderAt: 20,
  },
  water: {
    id: "water" as const,
    name: "Water portions",
    category: "ingredients" as const,
    unit: "portion",
    startingStock: 200,
    reorderAt: 20,
  },
  ice: {
    id: "ice" as const,
    name: "Ice portions",
    category: "ingredients" as const,
    unit: "portion",
    startingStock: 200,
    reorderAt: 20,
  },
  glue: {
    id: "glue" as const,
    name: "Glue portions",
    category: "slime" as const,
    unit: "portion",
    startingStock: 240,
    reorderAt: 24,
  },
  activator: {
    id: "activator" as const,
    name: "Activator portions",
    category: "slime" as const,
    unit: "portion",
    startingStock: 240,
    reorderAt: 24,
  },
  foodColoring: {
    id: "foodColoring" as const,
    name: "Food coloring",
    category: "slime" as const,
    unit: "portion",
    startingStock: 240,
    reorderAt: 24,
  },
  glitter: {
    id: "glitter" as const,
    name: "Glitter / mix-ins",
    category: "slime" as const,
    unit: "portion",
    startingStock: 240,
    reorderAt: 24,
  },
  slimeContainers: {
    id: "slimeContainers" as const,
    name: "Slime containers",
    category: "slime" as const,
    unit: "each",
    startingStock: 240,
    reorderAt: 24,
  },
  napkins: {
    id: "napkins" as const,
    name: "Napkins",
    category: "packaging" as const,
    unit: "each",
    startingStock: 200,
    reorderAt: 20,
  },
  stickers: {
    id: "stickers" as const,
    name: "Labels / stickers",
    category: "packaging" as const,
    unit: "each",
    startingStock: 300,
    reorderAt: 30,
  },
} as const;

export type InventoryId = keyof typeof INVENTORY_ITEMS;
export type InventoryCategory = (typeof INVENTORY_ITEMS)[InventoryId]["category"];

export type InventoryStock = Record<InventoryId, number>;

export const INVENTORY_IDS = Object.keys(INVENTORY_ITEMS) as InventoryId[];

export const INVENTORY_CATEGORIES: {
  id: InventoryCategory;
  label: string;
}[] = [
  { id: "serving", label: "Serving" },
  { id: "ingredients", label: "Ingredients" },
  { id: "slime", label: "Slime supplies" },
  { id: "charms", label: "Charms" },
  { id: "packaging", label: "Packaging" },
];

/** Paid / optional upgrades that can be added on the confirm-sale screen. */
export const UPGRADES = {
  lightUpCup: {
    id: "lightUpCup" as const,
    name: "Light-up cup",
    price: 1,
    products: ["lemonade"] as const satisfies readonly ProductId[],
    inventory: { lightUpCups: 1 } as Partial<Record<InventoryId, number>>,
    replaces: { cups: 1 } as Partial<Record<InventoryId, number>>,
    notEdible: true,
  },
  spiderRing: {
    id: "spiderRing" as const,
    name: "Spider ring",
    price: 1,
    products: ["lemonade"] as const satisfies readonly ProductId[],
    inventory: { spiderStraws: 1 } as Partial<Record<InventoryId, number>>,
    replaces: { straws: 1 } as Partial<Record<InventoryId, number>>,
    notEdible: true,
  },
} as const;

export type UpgradeId = keyof typeof UPGRADES;
export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

/** Free charm picks with every slime bundle (3 per bundle). */
export const CHARM_OPTIONS = [
  { id: "ghost" as const, name: "Ghost", inventoryId: "charmGhost" as const },
  {
    id: "pumpkin" as const,
    name: "Pumpkin",
    inventoryId: "charmPumpkin" as const,
  },
  { id: "bat" as const, name: "Bat", inventoryId: "charmBat" as const },
  {
    id: "blackCat" as const,
    name: "Black cat",
    inventoryId: "charmBlackCat" as const,
  },
  {
    id: "witchHat" as const,
    name: "Witch hat",
    inventoryId: "charmWitchHat" as const,
  },
  { id: "skull" as const, name: "Skull", inventoryId: "charmSkull" as const },
] as const;

export type CharmId = (typeof CHARM_OPTIONS)[number]["id"];
export const FREE_CHARMS_PER_BUNDLE = 3;
export const EXTRA_CHARM_PRICE = 0.5;

export function freeCharmAllowance(bundleQty: number): number {
  return FREE_CHARMS_PER_BUNDLE * Math.max(0, Math.floor(bundleQty));
}

export function upgradesForProduct(productId: ProductId): UpgradeId[] {
  return UPGRADE_IDS.filter((id) =>
    (UPGRADES[id].products as readonly ProductId[]).includes(productId)
  );
}

export function upgradePriceTotal(
  upgradeIds: readonly UpgradeId[],
  qty: number
): number {
  let total = 0;
  for (const id of upgradeIds) total += UPGRADES[id].price * qty;
  return total;
}

export function charmPriceTotal(
  charmIds: readonly CharmId[],
  bundleQty: number
): number {
  const free = freeCharmAllowance(bundleQty);
  const extra = Math.max(0, charmIds.length - free);
  return extra * EXTRA_CHARM_PRICE;
}

/** Components used per product sale quantity. */
export const PRODUCT_USAGE: Record<
  ProductId,
  Partial<Record<InventoryId, number>>
> = {
  lemonade: {
    cups: 1,
    lids: 1,
    straws: 1,
    lemons: 1,
    sugar: 1,
    water: 1,
    ice: 1,
    napkins: 1,
  },
  passionFruit: {
    lightUpCups: 1,
    spiderStraws: 1,
    lids: 1,
    sugar: 1,
    water: 1,
    ice: 1,
    napkins: 1,
    stickers: 1,
  },
  slimeBundle: {
    // Bundle = 3 individual slimes
    glue: 3,
    activator: 3,
    foodColoring: 3,
    glitter: 3,
    slimeContainers: 3,
    stickers: 3,
  },
};

export function createStartingInventory(): InventoryStock {
  const stock = {} as InventoryStock;
  for (const id of INVENTORY_IDS) {
    stock[id] = INVENTORY_ITEMS[id].startingStock;
  }
  return stock;
}

export function usageForSale(
  productId: ProductId,
  qty: number,
  upgradeIds: readonly UpgradeId[] = [],
  charmIds: readonly CharmId[] = []
): Partial<Record<InventoryId, number>> {
  const count = Math.max(0, Math.floor(qty));
  const scaled: Partial<Record<InventoryId, number>> = {};
  const base = PRODUCT_USAGE[productId];
  for (const [id, amount] of Object.entries(base) as [InventoryId, number][]) {
    scaled[id] = amount * count;
  }

  for (const upgradeId of upgradeIds) {
    const upgrade = UPGRADES[upgradeId];
    for (const [id, amount] of Object.entries(upgrade.inventory) as [
      InventoryId,
      number,
    ][]) {
      scaled[id] = (scaled[id] ?? 0) + amount * count;
    }
    for (const [id, amount] of Object.entries(upgrade.replaces) as [
      InventoryId,
      number,
    ][]) {
      scaled[id] = Math.max(0, (scaled[id] ?? 0) - amount * count);
    }
  }

  for (const charmId of charmIds) {
    const option = CHARM_OPTIONS.find((item) => item.id === charmId);
    if (!option) continue;
    scaled[option.inventoryId] = (scaled[option.inventoryId] ?? 0) + 1;
  }

  return scaled;
}

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

/** Projected profit if everything sells (business plan). */
export const PROFIT_GOAL = 1110.5;
export const REVENUE_GOAL = 1520;

export const DEFAULT_LOW_STOCK: ProductStock = {
  lemonade: 20,
  passionFruit: 5,
  slimeBundle: 10,
};

export const CHECKLIST_ITEMS = [
  { id: "inventory", label: "Count finished goods and supply inventory" },
  { id: "cash", label: "Set starting cash / change box" },
  { id: "battery", label: "Phone/tablet charged or plugged in" },
  { id: "network", label: "Open the kiosk site once while online" },
  { id: "backup", label: "Download a sales backup if continuing a day" },
  { id: "warning", label: "Post the slime not-edible safety reminder" },
] as const;

export const BRAND = {
  name: "Nayeli's Sliminade Stand",
  tagline: "Lemonade • Passion Fruit • Cool Slime",
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
