import {
  CHECKLIST_ITEMS,
  DEFAULT_LOW_STOCK,
  PRODUCTS,
  PROFIT_GOAL,
  TOTAL_HARD_COSTS,
  type ProductId,
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
  lemonadeStock: number;
  slimeBundleStock: number;
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
  lemonadeStock: number;
  slimeBundleStock: number;
  salesCount: number;
  state: StandState;
};

export type StandSettings = {
  eventName: string;
  lemonadeLowAt: number;
  slimeLowAt: number;
  startingCash: number;
  kioskLocked: boolean;
  checklist: Record<string, boolean>;
};

export type StandTotals = {
  lemonadeSold: number;
  slimeBundlesSold: number;
  revenue: number;
  hardCosts: number;
  profit: number;
  costRecoveryPct: number;
  remainingToRecover: number;
  profitGoalPct: number;
  lemonadeRemaining: number;
  slimeBundlesRemaining: number;
  expectedCash: number;
};

export type SaveResult = { ok: true } | { ok: false; error: string };

export function createInitialState(): StandState {
  return {
    lemonadeStock: PRODUCTS.lemonade.startingStock,
    slimeBundleStock: PRODUCTS.slimeBundle.startingStock,
    sales: [],
    auditLog: [],
    closeout: null,
  };
}

export function createDefaultSettings(): StandSettings {
  const checklist: Record<string, boolean> = {};
  for (const item of CHECKLIST_ITEMS) checklist[item.id] = false;
  return {
    eventName: "",
    lemonadeLowAt: DEFAULT_LOW_STOCK.lemonade,
    slimeLowAt: DEFAULT_LOW_STOCK.slimeBundle,
    startingCash: 40,
    kioskLocked: false,
    checklist,
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

  return {
    lemonadeStock: Math.max(0, Math.floor(raw.lemonadeStock)),
    slimeBundleStock: Math.max(0, Math.floor(raw.slimeBundleStock)),
    sales: raw.sales.filter(isValidSale),
    auditLog: Array.isArray(raw.auditLog) ? raw.auditLog.filter(isValidAudit) : [],
    closeout:
      raw.closeout &&
      typeof raw.closeout === "object" &&
      typeof raw.closeout.actualCash === "number"
        ? raw.closeout
        : null,
  };
}

function sanitizeSettings(value: unknown): StandSettings {
  const defaults = createDefaultSettings();
  if (!value || typeof value !== "object") return defaults;
  const raw = value as Partial<StandSettings>;
  const checklist = { ...defaults.checklist };
  if (raw.checklist && typeof raw.checklist === "object") {
    for (const item of CHECKLIST_ITEMS) {
      if (typeof raw.checklist[item.id] === "boolean") {
        checklist[item.id] = raw.checklist[item.id];
      }
    }
  }
  return {
    eventName: typeof raw.eventName === "string" ? raw.eventName.slice(0, 60) : "",
    lemonadeLowAt:
      typeof raw.lemonadeLowAt === "number" && Number.isFinite(raw.lemonadeLowAt)
        ? Math.max(0, Math.floor(raw.lemonadeLowAt))
        : defaults.lemonadeLowAt,
    slimeLowAt:
      typeof raw.slimeLowAt === "number" && Number.isFinite(raw.slimeLowAt)
        ? Math.max(0, Math.floor(raw.slimeLowAt))
        : defaults.slimeLowAt,
    startingCash:
      typeof raw.startingCash === "number" && Number.isFinite(raw.startingCash)
        ? Math.max(0, raw.startingCash)
        : defaults.startingCash,
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

function statesDiffer(a: StandState, b: StandState): boolean {
  if (a.lemonadeStock !== b.lemonadeStock) return true;
  if (a.slimeBundleStock !== b.slimeBundleStock) return true;
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
        lemonadeStock: state.lemonadeStock,
        slimeBundleStock: state.slimeBundleStock,
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
    lemonadeStock: state.lemonadeStock,
    slimeBundleStock: state.slimeBundleStock,
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
  const profitGoalPct = Math.min(
    100,
    Math.max(0, (Math.max(0, profit) / PROFIT_GOAL) * 100)
  );

  return {
    lemonadeSold,
    slimeBundlesSold,
    revenue,
    hardCosts,
    profit,
    costRecoveryPct,
    remainingToRecover,
    profitGoalPct,
    lemonadeRemaining: state.lemonadeStock,
    slimeBundlesRemaining: state.slimeBundleStock,
    expectedCash: settings.startingCash + revenue,
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
    id: makeId(),
    productId,
    qty: count,
    amount: product.price * count,
    at: new Date().toISOString(),
  };

  const next: StandState =
    productId === "lemonade"
      ? {
          ...state,
          lemonadeStock: state.lemonadeStock - count,
          sales: [sale, ...state.sales],
          closeout: null,
        }
      : {
          ...state,
          slimeBundleStock: state.slimeBundleStock - count,
          sales: [sale, ...state.sales],
          closeout: null,
        };

  return pushAudit(
    next,
    "sale",
    `Sold ${count} ${productId === "lemonade" ? "lemonade" : "slime bundle"}${count > 1 ? "s" : ""} for $${sale.amount.toFixed(2)}`
  );
}

export function restock(
  state: StandState,
  productId: ProductId,
  qty: number
): StandState {
  const count = Math.floor(qty);
  if (count <= 0) return state;

  const next =
    productId === "lemonade"
      ? { ...state, lemonadeStock: state.lemonadeStock + count }
      : { ...state, slimeBundleStock: state.slimeBundleStock + count };

  return pushAudit(
    next,
    "restock",
    `Restocked +${count} ${productId === "lemonade" ? "lemonade cups" : "slime bundles"}`
  );
}

export function undoLastSale(state: StandState): StandState {
  const [last, ...rest] = state.sales;
  if (!last) return state;

  const next =
    last.productId === "lemonade"
      ? {
          ...state,
          lemonadeStock: state.lemonadeStock + last.qty,
          sales: rest,
          closeout: null,
        }
      : {
          ...state,
          slimeBundleStock: state.slimeBundleStock + last.qty,
          sales: rest,
          closeout: null,
        };

  return pushAudit(
    next,
    "undo",
    `Undid ${last.qty} ${last.productId === "lemonade" ? "lemonade" : "slime bundle"} sale ($${last.amount.toFixed(2)})`
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
    `summary,lemonade_sold,${totals.lemonadeSold}`,
    `summary,slime_bundles_sold,${totals.slimeBundlesSold}`,
    `summary,lemonade_remaining,${totals.lemonadeRemaining}`,
    `summary,slime_bundles_remaining,${totals.slimeBundlesRemaining}`,
    `summary,starting_cash,${settings.startingCash.toFixed(2)}`,
    `summary,expected_cash,${totals.expectedCash.toFixed(2)}`,
    ...(state.closeout
      ? [
          `summary,actual_cash,${state.closeout.actualCash.toFixed(2)}`,
          `summary,cash_difference,${state.closeout.difference.toFixed(2)}`,
        ]
      : []),
    "",
    "time,product,qty,amount",
    ...state.sales.map((sale) => {
      const product =
        sale.productId === "lemonade" ? "lemonade" : "slime_bundle";
      return `${sale.at},${product},${sale.qty},${sale.amount.toFixed(2)}`;
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
