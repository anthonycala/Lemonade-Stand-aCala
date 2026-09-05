import { useSyncExternalStore } from "react";
import {
  canRestoreFromBackup,
  canSell,
  computeTotals,
  createDefaultSettings,
  createInitialState,
  downloadStandCsv,
  getRestorePoint,
  listRestorePoints,
  loadSettings,
  loadState,
  recordCloseout,
  recordSale,
  restock,
  saveSettings,
  saveState,
  snapshotSafetyBackup,
  stockFor,
  undoLastSale,
  type RestorePoint,
  type StandSettings,
  type StandState,
} from "./store";
import type { ProductId } from "./business";

type Listener = () => void;

type StoreSnapshot = {
  state: StandState;
  settings: StandSettings;
  restorePoints: RestorePoint[];
  backupAvailable: boolean;
  saveWarning: string | null;
  version: number;
};

let state: StandState = createInitialState();
let settings: StandSettings = createDefaultSettings();
let saveWarning: string | null = null;
let version = 0;
let hydrated = false;
let storageBound = false;
const listeners = new Set<Listener>();

let cachedSnapshot: StoreSnapshot = {
  state,
  settings,
  restorePoints: [],
  backupAvailable: false,
  saveWarning: null,
  version: 0,
};

function rebuildSnapshot(): StoreSnapshot {
  const restorePoints = listRestorePoints();
  return {
    state,
    settings,
    restorePoints,
    backupAvailable: restorePoints.some((point) =>
      // compare lightly without importing statesDiffer
      point.state.sales.length !== state.sales.length ||
      point.state.lemonadeStock !== state.lemonadeStock ||
      point.state.slimeBundleStock !== state.slimeBundleStock ||
      point.state.sales[0]?.id !== state.sales[0]?.id
    ),
    saveWarning,
    version,
  };
}

function emit() {
  cachedSnapshot = rebuildSnapshot();
  listeners.forEach((l) => l());
}

function persistState(next: StandState) {
  const result = saveState(next);
  saveWarning = result.ok ? null : result.error;
}

function persistSettings(next: StandSettings) {
  const result = saveSettings(next);
  if (!result.ok) saveWarning = result.error;
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  state = loadState();
  settings = loadSettings();
  version += 1;
  hydrated = true;
  cachedSnapshot = rebuildSnapshot();
}

function setState(next: StandState) {
  ensureHydrated();
  state = next;
  version += 1;
  persistState(state);
  emit();
}

function setSettings(next: StandSettings) {
  ensureHydrated();
  settings = next;
  version += 1;
  persistSettings(settings);
  emit();
}

function getLiveState(): StandState {
  ensureHydrated();
  return state;
}

function getLiveSettings(): StandSettings {
  ensureHydrated();
  return settings;
}

function subscribe(listener: Listener) {
  ensureHydrated();
  listeners.add(listener);

  if (!storageBound && typeof window !== "undefined") {
    storageBound = true;
    window.addEventListener("storage", (event: StorageEvent) => {
      if (
        event.key &&
        ![
          "sliminade-kiosk-v2",
          "sliminade-kiosk-v1",
          "sliminade-kiosk-settings-v1",
          "sliminade-kiosk-restore-history-v1",
        ].includes(event.key)
      ) {
        return;
      }
      state = loadState();
      settings = loadSettings();
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
    settings: createDefaultSettings(),
    restorePoints: [],
    backupAvailable: false,
    saveWarning: null,
    version: 0,
  };
}

export function useStandStore() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return {
    state: snapshot.state,
    settings: snapshot.settings,
    totals: computeTotals(snapshot.state, snapshot.settings),
    restorePoints: snapshot.restorePoints,
    saveWarning: snapshot.saveWarning,
    sell: (productId: ProductId, qty = 1) => {
      const current = getLiveState();
      if (!canSell(current, productId, qty)) return false;
      setState(recordSale(current, productId, qty));
      return true;
    },
    restockProduct: (productId: ProductId, qty: number) => {
      const current = getLiveState();
      if (qty <= 0) return false;
      snapshotSafetyBackup(current, "restock", "Before restock");
      setState(restock(current, productId, qty));
      return true;
    },
    undo: () => {
      const current = getLiveState();
      if (current.sales.length === 0) return;
      snapshotSafetyBackup(current, "undo", "Before undo last sale");
      setState(undoLastSale(current));
    },
    reset: () => {
      const current = getLiveState();
      snapshotSafetyBackup(current, "reset", "Before day reset");
      setState({
        ...createInitialState(),
        auditLog: [
          {
            id: `${Date.now()}-reset`,
            at: new Date().toISOString(),
            action: "reset" as const,
            detail: "Day reset to starting inventory",
          },
        ],
      });
    },
    restoreBackup: (pointId?: string) => {
      const current = getLiveState();
      const point = pointId
        ? getRestorePoint(pointId)
        : listRestorePoints().find(
            (item) =>
              item.state.sales.length !== current.sales.length ||
              item.state.lemonadeStock !== current.lemonadeStock ||
              item.state.slimeBundleStock !== current.slimeBundleStock
          );
      if (!point) return false;
      if (!canRestoreFromBackup(current) && !pointId) return false;
      snapshotSafetyBackup(current, "manual", "Before restore");
      setState({
        ...point.state,
        auditLog: [
          {
            id: `${Date.now()}-restore`,
            at: new Date().toISOString(),
            action: "restore" as const,
            detail: `Restored “${point.label}” from ${new Date(point.at).toLocaleString()}`,
          },
          ...point.state.auditLog,
        ].slice(0, 100),
      });
      return true;
    },
    closeOut: (actualCash: number) => {
      const current = getLiveState();
      const currentSettings = getLiveSettings();
      snapshotSafetyBackup(current, "closeout", "Before cash closeout");
      setState(recordCloseout(current, currentSettings, actualCash));
    },
    updateSettings: (patch: Partial<StandSettings>) => {
      setSettings({ ...getLiveSettings(), ...patch });
    },
    toggleChecklist: (id: string) => {
      const current = getLiveSettings();
      setSettings({
        ...current,
        checklist: {
          ...current.checklist,
          [id]: !current.checklist[id],
        },
      });
    },
    setKioskLocked: (locked: boolean) => {
      setSettings({ ...getLiveSettings(), kioskLocked: locked });
    },
    downloadSales: () =>
      downloadStandCsv(getLiveState(), getLiveSettings()),
    canRestoreBackup: snapshot.backupAvailable,
    availableStock: (productId: ProductId) =>
      stockFor(snapshot.state, productId),
    canSellProduct: (productId: ProductId, qty = 1) =>
      canSell(snapshot.state, productId, qty),
  };
}
