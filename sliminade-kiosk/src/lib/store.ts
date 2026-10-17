import {
  CHECKLIST_ITEMS,
  DEFAULT_LOW_STOCK,
  INVENTORY_IDS,
  INVENTORY_ITEMS,
  PRODUCT_IDS,
  PRODUCTS,
  PROFIT_GOAL,
  TOTAL_HARD_COSTS,
  createStartingInventory,
  createStartingProductStock,
  productDisplayName,
  usageForSale,
  type InventoryId,
  type InventoryStock,
  type ProductId,
  type ProductStock,
} from "./business";

const STORAGE_KEY = "sliminade-kiosk-v2";
const LEGACY_STORAGE_KEY = "sliminade-kiosk-v1";
const RESTORE_HISTORY_KEY = "sliminade-kiosk-restore-history-v1";
const SETTINGS_KEY = "sliminade-kiosk-settings-v1";
const MAX_RESTORE_POINTS = 5;

export type Sale = {
  id: string;
  productId: ProductId;
  qty: number;
  amount: number;
  at: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  action: "sale" | "undo" | "reset" | "restock" | "restore" | "closeout";
  detail: string;
};

export type CloseoutRecord = {
  at: string;
  expectedCash: number;
  actualCash: number;
  difference: number;
};

export type StandState = {
  productStock: ProductStock;
  inventory: InventoryStock;
  sales: Sale[];
  auditLog: AuditEntry[];
  closeout: CloseoutRecord | null;
};

export type RestorePoint = {
  id: string;
  at: string;
  reason: "undo" | "reset" | "restock" | "closeout" | "manual";
  label: string;
  revenue: number;
  productStock: ProductStock;
  salesCount: number;
  state: StandState;
};

export type StandSettings = {
  eventName: string;
  lowStockAt: ProductStock;
  prices: ProductStock;
  startingCash: number;
  kioskLocked: boolean;
  checklist: Record<string, boolean>;
};

export type StandTotals = {
  sold: ProductStock;
  remaining: ProductStock;
  revenue: number;
  hardCosts: number;
  profit: number;
  costRecoveryPct: number;
  remainingToRecover: number;
  profitGoalPct: number;
  expectedCash: number;
  inventory: InventoryStock;
  lowInventoryIds: InventoryId[];
};

export type SaveResult = { ok: true } | { ok: false; error: string };

export function createInitialState(): StandState {
  return {
    productStock: createStartingProductStock(),
    inventory: createStartingInventory(),
    sales: [],
    auditLog: [],
    closeout: null,
  };
}

function sanitizeInventory(value: unknown): InventoryStock {
  const defaults = createStartingInventory();
  if (!value || typeof value !== "object") return defaults;
  const raw = value as Partial<Record<InventoryId, unknown>>;
  const next = { ...defaults };
  for (const id of INVENTORY_IDS) {
    const amount = raw[id];
    if (typeof amount === "number" && Number.isFinite(amount)) {
      next[id] = Math.max(0, Math.floor(amount));
    }
  }
  return next;
}

function sanitizeProductStock(value: unknown, legacy?: unknown): ProductStock {
  const defaults = createStartingProductStock();
  const next = { ...defaults };

  if (value && typeof value === "object") {
    const raw = value as Partial<Record<ProductId, unknown>>;
    for (const id of PRODUCT_IDS) {
      const amount = raw[id];
      if (typeof amount === "number" && Number.isFinite(amount)) {
        next[id] = Math.max(0, Math.floor(amount));
      }
    }
    return next;
  }

  // Migrate older saves that used lemonadeStock / slimeBundleStock fields.
  if (legacy && typeof legacy === "object") {
    const old = legacy as {
      lemonadeStock?: unknown;
      slimeBundleStock?: unknown;
      passionFruitStock?: unknown;
    };
    if (
      typeof old.lemonadeStock === "number" &&
      Number.isFinite(old.lemonadeStock)
    ) {
      next.lemonade = Math.max(0, Math.floor(old.lemonadeStock));
    }
    if (
      typeof old.slimeBundleStock === "number" &&
      Number.isFinite(old.slimeBundleStock)
    ) {
      next.slimeBundle = Math.max(0, Math.floor(old.slimeBundleStock));
    }
    if (
      typeof old.passionFruitStock === "number" &&
      Number.isFinite(old.passionFruitStock)
    ) {
      next.passionFruit = Math.max(0, Math.floor(old.passionFruitStock));
    }
  }

  return next;
}

function applyInventoryDelta(
  inventory: InventoryStock,
  usage: Partial<Record<InventoryId, number>>,
  direction: 1 | -1
): InventoryStock {
  const next = { ...inventory };
  for (const [id, amount] of Object.entries(usage) as [InventoryId, number][]) {
    next[id] = Math.max(0, next[id] + direction * amount);
  }
  return next;
}

export function hasInventoryForSale(
  state: StandState,
  productId: ProductId,
  qty: number
): boolean {
  const usage = usageForSale(productId, Math.floor(qty));
  for (const [id, amount] of Object.entries(usage) as [InventoryId, number][]) {
    if ((state.inventory[id] ?? 0) < amount) return false;
  }
  return true;
}

export function createDefaultSettings(): StandSettings {
  const checklist: Record<string, boolean> = {};
  for (const item of CHECKLIST_ITEMS) checklist[item.id] = false;
  const prices = {} as ProductStock;
  for (const id of PRODUCT_IDS) prices[id] = PRODUCTS[id].price;
  return {
    eventName: "",
    lowStockAt: { ...DEFAULT_LOW_STOCK },
    prices,
    startingCash: 40,
    kioskLocked: false,
    checklist,
  };
}

export function productPrice(
  productId: ProductId,
  settings: StandSettings
): number {
  return settings.prices[productId] ?? PRODUCTS[productId].price;
}

function isProductId(value: unknown): value is ProductId {
  return typeof value === "string" && value in PRODUCTS;
}

function isValidSale(value: unknown): value is Sale {
  if (!value || typeof value !== "object") return false;
  const sale = value as Sale;
  return (
    typeof sale.id === "string" &&
    sale.id.length > 0 &&
    isProductId(sale.productId) &&
    typeof sale.qty === "number" &&
    Number.isFinite(sale.qty) &&
    sale.qty > 0 &&
    typeof sale.amount === "number" &&
    Number.isFinite(sale.amount) &&
    sale.amount >= 0 &&
    typeof sale.at === "string"
  );
}

function isValidAudit(value: unknown): value is AuditEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as AuditEntry;
  return (
    typeof entry.id === "string" &&
    typeof entry.at === "string" &&
    typeof entry.action === "string" &&
    typeof entry.detail === "string"
  );
}

function sanitizeState(value: unknown): StandState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as StandState & {
    lemonadeStock?: unknown;
    slimeBundleStock?: unknown;
    passionFruitStock?: unknown;
  };
  if (!Array.isArray(raw.sales)) return null;

  const productStock = sanitizeProductStock(raw.productStock, raw);
  const hasLegacyStock =
    typeof raw.lemonadeStock === "number" ||
    typeof raw.slimeBundleStock === "number";
  if (!raw.productStock && !hasLegacyStock) return null;

  return {
    productStock,
    inventory: sanitizeInventory(raw.inventory),
    sales: raw.sales.filter(isValidSale),
    auditLog: Array.isArray(raw.auditLog)
      ? raw.auditLog.filter(isValidAudit)
      : [],
    closeout:
      raw.closeout &&
      typeof raw.closeout === "object" &&
      typeof raw.closeout.actualCash === "number"
        ? raw.closeout
        : null,
  };
}

function sanitizeMoney(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100) / 100;
  }
  return fallback;
}

function sanitizeCount(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  return fallback;
}

function sanitizeSettings(value: unknown): StandSettings {
  const defaults = createDefaultSettings();
  if (!value || typeof value !== "object") return defaults;
  const raw = value as Partial<StandSettings> & {
    lemonadeLowAt?: unknown;
    slimeLowAt?: unknown;
    passionFruitLowAt?: unknown;
    lemonadePrice?: unknown;
    slimeBundlePrice?: unknown;
    passionFruitPrice?: unknown;
  };
  const checklist = { ...defaults.checklist };
  if (raw.checklist && typeof raw.checklist === "object") {
    for (const item of CHECKLIST_ITEMS) {
      if (typeof raw.checklist[item.id] === "boolean") {
        checklist[item.id] = raw.checklist[item.id];
      }
    }
  }

  const prices = { ...defaults.prices };
  if (raw.prices && typeof raw.prices === "object") {
    for (const id of PRODUCT_IDS) {
      prices[id] = sanitizeMoney(
        (raw.prices as ProductStock)[id],
        defaults.prices[id]
      );
    }
  } else {
    prices.lemonade = sanitizeMoney(raw.lemonadePrice, defaults.prices.lemonade);
    prices.slimeBundle = sanitizeMoney(
      raw.slimeBundlePrice,
      defaults.prices.slimeBundle
    );
    prices.passionFruit = sanitizeMoney(
      raw.passionFruitPrice,
      defaults.prices.passionFruit
    );
  }

  const lowStockAt = { ...defaults.lowStockAt };
  if (raw.lowStockAt && typeof raw.lowStockAt === "object") {
    for (const id of PRODUCT_IDS) {
      lowStockAt[id] = sanitizeCount(
        (raw.lowStockAt as ProductStock)[id],
        defaults.lowStockAt[id]
      );
    }
  } else {
    lowStockAt.lemonade = sanitizeCount(
      raw.lemonadeLowAt,
      defaults.lowStockAt.lemonade
    );
    lowStockAt.slimeBundle = sanitizeCount(
      raw.slimeLowAt,
      defaults.lowStockAt.slimeBundle
    );
    lowStockAt.passionFruit = sanitizeCount(
      raw.passionFruitLowAt,
      defaults.lowStockAt.passionFruit
    );
  }

  return {
    eventName:
      typeof raw.eventName === "string" ? raw.eventName.slice(0, 60) : "",
    lowStockAt,
    prices,
    startingCash: sanitizeMoney(raw.startingCash, defaults.startingCash),
    kioskLocked: Boolean(raw.kioskLocked),
    checklist,
  };
}

function writeJson(key: string, value: unknown): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Couldn’t save on this device — check storage or leave private browsing.",
    };
  }
}

function readJson(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function inventoryDiffers(a: InventoryStock, b: InventoryStock): boolean {
  for (const id of INVENTORY_IDS) {
    if (a[id] !== b[id]) return true;
  }
  return false;
}

function productStockDiffers(a: ProductStock, b: ProductStock): boolean {
  for (const id of PRODUCT_IDS) {
    if (a[id] !== b[id]) return true;
  }
  return false;
}

function statesDiffer(a: StandState, b: StandState): boolean {
  if (productStockDiffers(a.productStock, b.productStock)) return true;
  if (inventoryDiffers(a.inventory, b.inventory)) return true;
  if (a.sales.length !== b.sales.length) return true;
  if (a.sales[0]?.id !== b.sales[0]?.id) return true;
  return false;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushAudit(
  state: StandState,
  action: AuditEntry["action"],
  detail: string
): StandState {
  const entry: AuditEntry = {
    id: makeId(),
    at: new Date().toISOString(),
    action,
    detail,
  };
  return {
    ...state,
    auditLog: [entry, ...state.auditLog].slice(0, 100),
  };
}

export function loadState(): StandState {
  const primary = sanitizeState(readJson(STORAGE_KEY));
  if (primary) return primary;

  const legacy = sanitizeState(readJson(LEGACY_STORAGE_KEY));
  if (legacy) {
    writeJson(STORAGE_KEY, legacy);
    return legacy;
  }

  const history = listRestorePoints();
  if (history[0]) {
    writeJson(STORAGE_KEY, history[0].state);
    return history[0].state;
  }

  return createInitialState();
}

export function saveState(state: StandState): SaveResult {
  return writeJson(STORAGE_KEY, state);
}

export function loadSettings(): StandSettings {
  return sanitizeSettings(readJson(SETTINGS_KEY));
}

export function saveSettings(settings: StandSettings): SaveResult {
  return writeJson(SETTINGS_KEY, sanitizeSettings(settings));
}

export function listRestorePoints(): RestorePoint[] {
  const raw = readJson(RESTORE_HISTORY_KEY);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const point = item as RestorePoint;
      const state = sanitizeState(point.state);
      if (!state) return null;
      return {
        id: typeof point.id === "string" ? point.id : makeId(),
        at: typeof point.at === "string" ? point.at : new Date().toISOString(),
        reason: point.reason ?? "manual",
        label: typeof point.label === "string" ? point.label : "Restore point",
        revenue: typeof point.revenue === "number" ? point.revenue : 0,
        productStock: { ...state.productStock },
        salesCount: state.sales.length,
        state,
      } satisfies RestorePoint;
    })
    .filter((point): point is RestorePoint => point !== null)
    .slice(0, MAX_RESTORE_POINTS);
}

export function snapshotSafetyBackup(
  state: StandState,
  reason: RestorePoint["reason"],
  label: string
): SaveResult {
  const totals = computeTotals(state, createDefaultSettings());
  const point: RestorePoint = {
    id: makeId(),
    at: new Date().toISOString(),
    reason,
    label,
    revenue: totals.revenue,
    productStock: { ...state.productStock },
    salesCount: state.sales.length,
    state,
  };
  const next = [point, ...listRestorePoints()].slice(0, MAX_RESTORE_POINTS);
  return writeJson(RESTORE_HISTORY_KEY, next);
}

export function canRestoreFromBackup(current: StandState): boolean {
  return listRestorePoints().some((point) => statesDiffer(point.state, current));
}

export function getRestorePoint(id: string): RestorePoint | null {
  return listRestorePoints().find((point) => point.id === id) ?? null;
}

export function computeTotals(
  state: StandState,
  settings: StandSettings
): StandTotals {
  const sold = createStartingProductStock();
  for (const id of PRODUCT_IDS) sold[id] = 0;
  let revenue = 0;

  for (const sale of state.sales) {
    revenue += sale.amount;
    sold[sale.productId] += sale.qty;
  }

  const hardCosts = TOTAL_HARD_COSTS;
  const profit = revenue - hardCosts;
  const costRecoveryPct = Math.min(100, (revenue / hardCosts) * 100);
  const remainingToRecover = Math.max(0, hardCosts - revenue);
  const profitGoalPct = Math.min(
    100,
    Math.max(0, (Math.max(0, profit) / PROFIT_GOAL) * 100)
  );

  const lowInventoryIds = INVENTORY_IDS.filter((id) => {
    const item = INVENTORY_ITEMS[id];
    const current = state.inventory[id] ?? 0;
    return current > 0 && current <= item.reorderAt;
  });

  return {
    sold,
    remaining: { ...state.productStock },
    revenue,
    hardCosts,
    profit,
    costRecoveryPct,
    remainingToRecover,
    profitGoalPct,
    expectedCash: settings.startingCash + revenue,
    inventory: state.inventory,
    lowInventoryIds,
  };
}

export function stockFor(state: StandState, productId: ProductId): number {
  return state.productStock[productId] ?? 0;
}

export function canSell(
  state: StandState,
  productId: ProductId,
  qty = 1
): boolean {
  return (
    qty >= 1 &&
    stockFor(state, productId) >= qty &&
    hasInventoryForSale(state, productId, qty)
  );
}

export function recordSale(
  state: StandState,
  productId: ProductId,
  qty = 1,
  settings: StandSettings = createDefaultSettings()
): StandState {
  const count = Math.floor(qty);
  if (!canSell(state, productId, count)) return state;

  const unitPrice = productPrice(productId, settings);
  const usage = usageForSale(productId, count);
  const sale: Sale = {
    id: makeId(),
    productId,
    qty: count,
    amount: unitPrice * count,
    at: new Date().toISOString(),
  };

  const next: StandState = {
    ...state,
    productStock: {
      ...state.productStock,
      [productId]: state.productStock[productId] - count,
    },
    inventory: applyInventoryDelta(state.inventory, usage, -1),
    sales: [sale, ...state.sales],
    closeout: null,
  };

  return pushAudit(
    next,
    "sale",
    `Sold ${count} ${productDisplayName(productId, count)} for $${sale.amount.toFixed(2)}`
  );
}

export function restock(
  state: StandState,
  productId: ProductId,
  qty: number
): StandState {
  const count = Math.floor(qty);
  if (count <= 0) return state;

  const usage = usageForSale(productId, count);
  const next: StandState = {
    ...state,
    productStock: {
      ...state.productStock,
      [productId]: state.productStock[productId] + count,
    },
    inventory: applyInventoryDelta(state.inventory, usage, 1),
  };

  return pushAudit(
    next,
    "restock",
    `Restocked +${count} ${productDisplayName(productId, count)} (+ matching supplies)`
  );
}

export function restockInventoryItem(
  state: StandState,
  itemId: InventoryId,
  qty: number
): StandState {
  const count = Math.floor(qty);
  if (count <= 0) return state;
  if (!INVENTORY_ITEMS[itemId]) return state;

  const next: StandState = {
    ...state,
    inventory: {
      ...state.inventory,
      [itemId]: state.inventory[itemId] + count,
    },
  };

  return pushAudit(
    next,
    "restock",
    `Restocked +${count} ${INVENTORY_ITEMS[itemId].name}`
  );
}

export function undoLastSale(state: StandState): StandState {
  const [last, ...rest] = state.sales;
  if (!last) return state;

  const usage = usageForSale(last.productId, last.qty);
  const next: StandState = {
    ...state,
    productStock: {
      ...state.productStock,
      [last.productId]: state.productStock[last.productId] + last.qty,
    },
    inventory: applyInventoryDelta(state.inventory, usage, 1),
    sales: rest,
    closeout: null,
  };

  return pushAudit(
    next,
    "undo",
    `Undid ${last.qty} ${productDisplayName(last.productId, last.qty)} sale ($${last.amount.toFixed(2)})`
  );
}

export function recordCloseout(
  state: StandState,
  settings: StandSettings,
  actualCash: number
): StandState {
  const totals = computeTotals(state, settings);
  const closeout: CloseoutRecord = {
    at: new Date().toISOString(),
    expectedCash: totals.expectedCash,
    actualCash,
    difference: actualCash - totals.expectedCash,
  };
  return pushAudit(
    { ...state, closeout },
    "closeout",
    `Closeout: expected $${closeout.expectedCash.toFixed(2)}, counted $${actualCash.toFixed(2)}, diff $${closeout.difference.toFixed(2)}`
  );
}

function csvProductKey(productId: ProductId): string {
  if (productId === "slimeBundle") return "slime_bundle";
  if (productId === "passionFruit") return "passion_fruit";
  return productId;
}

export function standExportCsv(
  state: StandState,
  settings: StandSettings
): string {
  const totals = computeTotals(state, settings);
  const lines = [
    "section,field,value",
    `summary,event_name,"${settings.eventName.replaceAll('"', '""')}"`,
    `summary,revenue,${totals.revenue.toFixed(2)}`,
    `summary,hard_costs,${totals.hardCosts.toFixed(2)}`,
    `summary,profit,${totals.profit.toFixed(2)}`,
    ...PRODUCT_IDS.flatMap((id) => [
      `summary,${csvProductKey(id)}_sold,${totals.sold[id]}`,
      `summary,${csvProductKey(id)}_remaining,${totals.remaining[id]}`,
      `summary,${csvProductKey(id)}_price,${settings.prices[id].toFixed(2)}`,
    ]),
    `summary,starting_cash,${settings.startingCash.toFixed(2)}`,
    `summary,expected_cash,${totals.expectedCash.toFixed(2)}`,
    ...(state.closeout
      ? [
          `summary,actual_cash,${state.closeout.actualCash.toFixed(2)}`,
          `summary,cash_difference,${state.closeout.difference.toFixed(2)}`,
        ]
      : []),
    "",
    "inventory,item,category,unit,starting,current,reorder_at",
    ...INVENTORY_IDS.map((id) => {
      const item = INVENTORY_ITEMS[id];
      const current = state.inventory[id] ?? 0;
      return `inventory,${item.name},${item.category},${item.unit},${item.startingStock},${current},${item.reorderAt}`;
    }),
    "",
    "time,product,qty,amount",
    ...state.sales.map((sale) => {
      return `${sale.at},${csvProductKey(sale.productId)},${sale.qty},${sale.amount.toFixed(2)}`;
    }),
    "",
    "time,action,detail",
    ...state.auditLog.map(
      (entry) =>
        `${entry.at},${entry.action},"${entry.detail.replaceAll('"', '""')}"`
    ),
  ];
  return lines.join("\n");
}

export async function downloadStandCsv(
  state: StandState,
  settings: StandSettings
): Promise<void> {
  const csv = standExportCsv(state, settings);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `sliminade-stand-${stamp}.csv`;
  const file = new File([csv], filename, { type: "text/csv" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "Sliminade stand export",
      text: "Sales, inventory, and closeout export",
    });
    return;
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
