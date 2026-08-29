import {
  PRODUCTS,
  TOTAL_HARD_COSTS,
  type ProductId,
} from "./business";

const STORAGE_KEY = "sliminade-kiosk-v1";
/** Only written before undo/reset — sales must not overwrite this. */
const SAFETY_BACKUP_KEY = "sliminade-kiosk-safety-backup-v1";

export type Sale = {
  id: string;
  productId: ProductId;
  qty: number;
  amount: number;
  at: string;
};

export type StandState = {
  lemonadeStock: number;
  slimeBundleStock: number;
  sales: Sale[];
};

export type StandTotals = {
  lemonadeSold: number;
  slimeBundlesSold: number;
  revenue: number;
  hardCosts: number;
  profit: number;
  costRecoveryPct: number;
  remainingToRecover: number;
  lemonadeRemaining: number;
  slimeBundlesRemaining: number;
};

export type SaveResult = { ok: true } | { ok: false; error: string };

export function createInitialState(): StandState {
  return {
    lemonadeStock: PRODUCTS.lemonade.startingStock,
    slimeBundleStock: PRODUCTS.slimeBundle.startingStock,
    sales: [],
  };
}

function isProductId(value: unknown): value is ProductId {
  return value === "lemonade" || value === "slimeBundle";
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

function sanitizeState(value: unknown): StandState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as StandState;
  if (
    typeof raw.lemonadeStock !== "number" ||
    !Number.isFinite(raw.lemonadeStock) ||
    typeof raw.slimeBundleStock !== "number" ||
    !Number.isFinite(raw.slimeBundleStock) ||
    !Array.isArray(raw.sales)
  ) {
    return null;
  }

  const sales = raw.sales.filter(isValidSale);
  return {
    lemonadeStock: Math.max(0, Math.floor(raw.lemonadeStock)),
    slimeBundleStock: Math.max(0, Math.floor(raw.slimeBundleStock)),
    sales,
  };
}

function readKey(key: string): StandState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return sanitizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeKey(key: string, state: StandState): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Couldn’t save on this device — check storage or leave private browsing.",
    };
  }
}

function statesDiffer(a: StandState, b: StandState): boolean {
  if (a.lemonadeStock !== b.lemonadeStock) return true;
  if (a.slimeBundleStock !== b.slimeBundleStock) return true;
  if (a.sales.length !== b.sales.length) return true;
  if (a.sales[0]?.id !== b.sales[0]?.id) return true;
  return false;
}

export function loadState(): StandState {
  const primary = readKey(STORAGE_KEY);
  if (primary) return primary;

  const backup = readKey(SAFETY_BACKUP_KEY);
  if (backup) {
    writeKey(STORAGE_KEY, backup);
    return backup;
  }

  return createInitialState();
}

export function readSafetyBackup(): StandState | null {
  return readKey(SAFETY_BACKUP_KEY);
}

export function canRestoreFromBackup(current: StandState): boolean {
  const backup = readSafetyBackup();
  if (!backup) return false;
  return statesDiffer(backup, current);
}

export function saveState(state: StandState): SaveResult {
  return writeKey(STORAGE_KEY, state);
}

/** Snapshot used only for Restore after undo/reset. */
export function snapshotSafetyBackup(state: StandState): SaveResult {
  return writeKey(SAFETY_BACKUP_KEY, state);
}

export function restoreFromBackup(): StandState | null {
  return readSafetyBackup();
}

export function computeTotals(state: StandState): StandTotals {
  let lemonadeSold = 0;
  let slimeBundlesSold = 0;
  let revenue = 0;

  for (const sale of state.sales) {
    revenue += sale.amount;
    if (sale.productId === "lemonade") lemonadeSold += sale.qty;
    if (sale.productId === "slimeBundle") slimeBundlesSold += sale.qty;
  }

  const hardCosts = TOTAL_HARD_COSTS;
  const profit = revenue - hardCosts;
  const costRecoveryPct = Math.min(100, (revenue / hardCosts) * 100);
  const remainingToRecover = Math.max(0, hardCosts - revenue);

  return {
    lemonadeSold,
    slimeBundlesSold,
    revenue,
    hardCosts,
    profit,
    costRecoveryPct,
    remainingToRecover,
    lemonadeRemaining: state.lemonadeStock,
    slimeBundlesRemaining: state.slimeBundleStock,
  };
}

export function stockFor(state: StandState, productId: ProductId): number {
  return productId === "lemonade"
    ? state.lemonadeStock
    : state.slimeBundleStock;
}

export function canSell(
  state: StandState,
  productId: ProductId,
  qty = 1
): boolean {
  return stockFor(state, productId) >= qty && qty >= 1;
}

export function recordSale(
  state: StandState,
  productId: ProductId,
  qty = 1
): StandState {
  const count = Math.floor(qty);
  if (!canSell(state, productId, count)) return state;

  const product = PRODUCTS[productId];
  const sale: Sale = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId,
    qty: count,
    amount: product.price * count,
    at: new Date().toISOString(),
  };

  if (productId === "lemonade") {
    return {
      ...state,
      lemonadeStock: state.lemonadeStock - count,
      sales: [sale, ...state.sales],
    };
  }

  return {
    ...state,
    slimeBundleStock: state.slimeBundleStock - count,
    sales: [sale, ...state.sales],
  };
}

export function restock(
  state: StandState,
  productId: ProductId,
  qty: number
): StandState {
  const count = Math.floor(qty);
  if (count <= 0) return state;

  if (productId === "lemonade") {
    return {
      ...state,
      lemonadeStock: state.lemonadeStock + count,
    };
  }

  return {
    ...state,
    slimeBundleStock: state.slimeBundleStock + count,
  };
}

export function undoLastSale(state: StandState): StandState {
  const [last, ...rest] = state.sales;
  if (!last) return state;

  if (last.productId === "lemonade") {
    return {
      ...state,
      lemonadeStock: state.lemonadeStock + last.qty,
      sales: rest,
    };
  }

  return {
    ...state,
    slimeBundleStock: state.slimeBundleStock + last.qty,
    sales: rest,
  };
}

export function salesToCsv(state: StandState): string {
  const header = "time,product,qty,amount";
  const rows = state.sales.map((sale) => {
    const product =
      sale.productId === "lemonade" ? "lemonade" : "slime_bundle";
    return `${sale.at},${product},${sale.qty},${sale.amount.toFixed(2)}`;
  });
  return [header, ...rows].join("\n");
}

export async function downloadSalesCsv(state: StandState): Promise<void> {
  const csv = salesToCsv(state);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `sliminade-sales-${stamp}.csv`;
  const file = new File([csv], filename, { type: "text/csv" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "Sliminade sales",
      text: "Nayeli's Sliminade Stand sales log",
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
