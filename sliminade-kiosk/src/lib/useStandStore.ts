import { useSyncExternalStore } from "react";
import {
  canSell,
  computeTotals,
  createInitialState,
  loadState,
  recordSale,
  saveState,
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
    undo: () => setState(undoLastSale(current)),
    reset: () => setState(createInitialState()),
    canSellProduct: (productId) => canSell(current, productId),
  };
}
