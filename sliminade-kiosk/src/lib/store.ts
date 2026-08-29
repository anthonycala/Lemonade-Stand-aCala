import {
  PRODUCTS,
  TOTAL_HARD_COSTS,
  type ProductId,
} from "./business";

const STORAGE_KEY = "sliminade-kiosk-v1";
const BACKUP_KEY = "sliminade-kiosk-backup-v1";

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
  lemonadeRemaining: number;
  slimeBundlesRemaining: number;
};

export function createInitialState(): StandState {
  return {
    lemonadeStock: PRODUCTS.lemonade.startingStock,
    slimeBundleStock: PRODUCTS.slimeBundle.startingStock,
    sales: [],
  };
}

function isValidState(value: unknown): value is StandState {
  if (!value || typeof value !== "object") return false;
  const parsed = value as StandState;
  return (
    typeof parsed.lemonadeStock === "number" &&
    Number.isFinite(parsed.lemonadeStock) &&
    typeof parsed.slimeBundleStock === "number" &&
    Number.isFinite(parsed.slimeBundleStock) &&
    Array.isArray(parsed.sales)
  );
}

function readKey(key: string): StandState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
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

  const backup = readKey(BACKUP_KEY);
  if (backup) {
    saveState(backup);
    return backup;
  }

  return createInitialState();
}

export function readBackup(): StandState | null {
  return readKey(BACKUP_KEY);
}

/** True when backup exists and is different from the live counts. */
export function canRestoreFromBackup(current: StandState): boolean {
  const backup = readBackup();
  if (!backup) return false;
  return statesDiffer(backup, current);
}

export function saveState(state: StandState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Save a restore point. Skips overwriting a useful backup with an empty
 * snapshot unless `force` is set (used right before reset/undo).
 */
export function snapshotBackup(
  state: StandState,
  options: { force?: boolean } = {}
): void {
  const existing = readBackup();
  if (
    !options.force &&
    state.sales.length === 0 &&
    existing &&
    existing.sales.length > 0
  ) {
    return;
  }
  localStorage.setItem(BACKUP_KEY, JSON.stringify(state));
}

export function restoreFromBackup(): StandState | null {
  return readBackup();
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

  return {
    lemonadeSold,
    slimeBundlesSold,
    revenue,
    hardCosts,
    profit,
    costRecoveryPct,
    lemonadeRemaining: state.lemonadeStock,
    slimeBundlesRemaining: state.slimeBundleStock,
  };
}

export function canSell(state: StandState, productId: ProductId): boolean {
  if (productId === "lemonade") return state.lemonadeStock >= 1;
  return state.slimeBundleStock >= 1;
}

export function recordSale(
  state: StandState,
  productId: ProductId
): StandState {
  if (!canSell(state, productId)) return state;

  const product = PRODUCTS[productId];
  const sale: Sale = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId,
    qty: 1,
    amount: product.price,
    at: new Date().toISOString(),
  };

  if (productId === "lemonade") {
    return {
      ...state,
      lemonadeStock: state.lemonadeStock - 1,
      sales: [sale, ...state.sales],
    };
  }

  return {
    ...state,
    slimeBundleStock: state.slimeBundleStock - 1,
    sales: [sale, ...state.sales],
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

export function downloadSalesCsv(state: StandState): void {
  const csv = salesToCsv(state);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const link = document.createElement("a");
  link.href = url;
  link.download = `sliminade-sales-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
