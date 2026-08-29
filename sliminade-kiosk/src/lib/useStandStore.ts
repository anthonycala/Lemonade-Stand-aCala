import { useSyncExternalStore } from "react";
import {
  canRestoreFromBackup,
  canSell,
  computeTotals,
  createInitialState,
  downloadSalesCsv,
  loadState,
  recordSale,
  restoreFromBackup,
  restock,
  saveState,
  snapshotSafetyBackup,
  stockFor,
  undoLastSale,
  type StandState,
  type StandTotals,
} from "./store";
import type { ProductId } from "./business";

type Listener = () => void;

type StoreSnapshot = {
  state: StandState;
  backupAvailable: boolean;
  saveWarning: string | null;
  version: number;
};

let state: StandState = createInitialState();
let saveWarning: string | null = null;
let version = 0;
let hydrated = false;
const listeners = new Set<Listener>();

let cachedSnapshot: StoreSnapshot = {
  state,
  backupAvailable: false,
  saveWarning: null,
  version: 0,
};

function rebuildSnapshot(): StoreSnapshot {
  return {
    state,
    backupAvailable: canRestoreFromBackup(state),
    saveWarning,
    version,
  };
}

function emit() {
  cachedSnapshot = rebuildSnapshot();
  listeners.forEach((l) => l());
}

function persist(next: StandState) {
  const result = saveState(next);
  saveWarning = result.ok ? null : result.error;
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  state = loadState();
  version += 1;
  hydrated = true;
  cachedSnapshot = rebuildSnapshot();
}

function setState(next: StandState) {
  ensureHydrated();
  state = next;
  version += 1;
  persist(state);
  emit();
}

function getLiveState(): StandState {
  ensureHydrated();
  return state;
}

let storageBound = false;

function subscribe(listener: Listener) {
  ensureHydrated();
  listeners.add(listener);

  if (!storageBound && typeof window !== "undefined") {
    storageBound = true;
    window.addEventListener("storage", (event: StorageEvent) => {
      if (event.key !== "sliminade-kiosk-v1" && event.key !== null) return;
      state = loadState();
      version += 1;
      saveWarning = null;
      emit();
    });
  }

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): StoreSnapshot {
  ensureHydrated();
  return cachedSnapshot;
}

function getServerSnapshot(): StoreSnapshot {
  return {
    state: createInitialState(),
    backupAvailable: false,
    saveWarning: null,
    version: 0,
  };
}

export function useStandStore(): {
  state: StandState;
  totals: StandTotals;
  saveWarning: string | null;
  sell: (productId: ProductId, qty?: number) => boolean;
  restockProduct: (productId: ProductId, qty: number) => boolean;
  undo: () => void;
  reset: () => void;
  restoreBackup: () => boolean;
  downloadSales: () => Promise<void>;
  canRestoreBackup: boolean;
  availableStock: (productId: ProductId) => number;
  canSellProduct: (productId: ProductId, qty?: number) => boolean;
} {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return {
    state: snapshot.state,
    totals: computeTotals(snapshot.state),
    saveWarning: snapshot.saveWarning,
    sell: (productId, qty = 1) => {
      const current = getLiveState();
      if (!canSell(current, productId, qty)) return false;
      setState(recordSale(current, productId, qty));
      return true;
    },
    restockProduct: (productId, qty) => {
      const current = getLiveState();
      if (qty <= 0) return false;
      snapshotSafetyBackup(current);
      setState(restock(current, productId, qty));
      return true;
    },
    undo: () => {
      const current = getLiveState();
      if (current.sales.length === 0) return;
      snapshotSafetyBackup(current);
      setState(undoLastSale(current));
    },
    reset: () => {
      const current = getLiveState();
      snapshotSafetyBackup(current);
      setState(createInitialState());
    },
    restoreBackup: () => {
      const current = getLiveState();
      const restored = restoreFromBackup();
      if (!restored) return false;
      if (!canRestoreFromBackup(current)) return false;
      // Preserve what we're leaving so Restore can toggle back if needed.
      snapshotSafetyBackup(current);
      setState(restored);
      return true;
    },
    downloadSales: () => downloadSalesCsv(getLiveState()),
    canRestoreBackup: snapshot.backupAvailable,
    availableStock: (productId) => stockFor(snapshot.state, productId),
    canSellProduct: (productId, qty = 1) =>
      canSell(snapshot.state, productId, qty),
  };
}
