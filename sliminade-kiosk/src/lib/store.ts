import {
  PRODUCTS,
  TOTAL_HARD_COSTS,
  type ProductId,
} from "./business";

const STORAGE_KEY = "sliminade-kiosk-v1";

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

export function loadState(): StandState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as StandState;
    if (
      typeof parsed.lemonadeStock !== "number" ||
      typeof parsed.slimeBundleStock !== "number" ||
      !Array.isArray(parsed.sales)
    ) {
      return createInitialState();
    }
    return parsed;
  } catch {
    return createInitialState();
  }
}

export function saveState(state: StandState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
