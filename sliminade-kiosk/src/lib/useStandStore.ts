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
  saveState,
  snapshotBackup,
  undoLastSale,
  type StandState,
  type StandTotals,
} from "./store";
import type { ProductId } from "./business";

type Listener = () => void;

type StoreSnapshot = {
  state: StandState;
  backupAvailable: boolean;
  version: number;
};

let state: StandState = createInitialState();
let version = 0;
let hydrated = false;
const listeners = new Set<Listener>();

/** Cached snapshot so useSyncExternalStore gets a stable Object.is when unchanged. */
let cachedSnapshot: StoreSnapshot = {
  state,
  backupAvailable: false,
  version: 0,
};

function emit() {
  cachedSnapshot = {
    state,
    backupAvailable: canRestoreFromBackup(state),
    version,
  };
  listeners.forEach((l) => l());
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  state = loadState();
  version += 1;
  hydrated = true;
  cachedSnapshot = {
    state,
    backupAvailable: canRestoreFromBackup(state),
    version,
  };
}

function setState(next: StandState) {
  ensureHydrated();
  state = next;
  version += 1;
  saveState(state);
  emit();
}

function getLiveState(): StandState {
  ensureHydrated();
  return state;
}

function subscribe(listener: Listener) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StoreSnapshot {
  ensureHydrated();
  return cachedSnapshot;
}

function getServerSnapshot(): StoreSnapshot {
  return {
    state: createInitialState(),
    backupAvailable: false,
    version: 0,
  };
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
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return {
    state: snapshot.state,
    totals: computeTotals(snapshot.state),
    sell: (productId) => {
      const current = getLiveState();
      if (!canSell(current, productId)) return false;
      // Keep a restore point from before this sale, then save post-sale too.
      snapshotBackup(current, { force: true });
      setState(recordSale(current, productId));
      return true;
    },
    undo: () => {
      const current = getLiveState();
      if (current.sales.length === 0) return;
      snapshotBackup(current, { force: true });
      setState(undoLastSale(current));
    },
    reset: () => {
      const current = getLiveState();
      snapshotBackup(current, { force: true });
      setState(createInitialState());
    },
    restoreBackup: () => {
      const current = getLiveState();
      const restored = restoreFromBackup();
      if (!restored) return false;
      if (
        restored.lemonadeStock === current.lemonadeStock &&
        restored.slimeBundleStock === current.slimeBundleStock &&
        restored.sales.length === current.sales.length &&
        restored.sales[0]?.id === current.sales[0]?.id
      ) {
        return false;
      }
      // Keep what we're leaving behind, then put the backup back into live counts.
      snapshotBackup(current, { force: true });
      setState(restored);
      return true;
    },
    downloadSales: () => downloadSalesCsv(getLiveState()),
    canRestoreBackup: snapshot.backupAvailable,
    canSellProduct: (productId) => canSell(snapshot.state, productId),
  };
}
