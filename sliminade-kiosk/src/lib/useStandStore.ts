import { useSyncExternalStore } from "react";
import {
  canSell,
  computeTotals,
  createInitialState,
  downloadSalesCsv,
  hasBackup,
  loadState,
  recordSale,
  restoreFromBackup,
  saveState,
  snapshotBackup,
  undoLastSale,
  type StandState,
  type StandTotals,
} from "./store";
import type { ProductId } from "./business";

type Listener = () => void;

let state: StandState = createInitialState();
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  state = loadState();
  hydrated = true;
}

function setState(next: StandState) {
  ensureHydrated();
  state = next;
  saveState(state);
  emit();
}

function subscribe(listener: Listener) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureHydrated();
  return state;
}

function getServerSnapshot() {
  return createInitialState();
}

export function useStandStore(): {
  state: StandState;
  totals: StandTotals;
  sell: (productId: ProductId) => boolean;
  undo: () => void;
  reset: () => void;
  restoreBackup: () => boolean;
  downloadSales: () => void;
  canRestoreBackup: boolean;
  canSellProduct: (productId: ProductId) => boolean;
} {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    state: current,
    totals: computeTotals(current),
    sell: (productId) => {
      if (!canSell(current, productId)) return false;
      setState(recordSale(current, productId));
      return true;
    },
    undo: () => {
      if (current.sales.length === 0) return;
      snapshotBackup(current);
      setState(undoLastSale(current));
    },
    reset: () => {
      snapshotBackup(current);
      setState(createInitialState());
    },
    restoreBackup: () => {
      const restored = restoreFromBackup();
      if (!restored) return false;
      setState(restored);
      return true;
    },
    downloadSales: () => downloadSalesCsv(current),
    canRestoreBackup: hasBackup(),
    canSellProduct: (productId) => canSell(current, productId),
  };
}
