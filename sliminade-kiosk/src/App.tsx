import { useEffect, useRef, useState } from "react";
import {
  BRAND,
  CHARM_OPTIONS,
  CHECKLIST_ITEMS,
  DEFAULT_LOW_STOCK,
  EXTRA_CHARM_PRICE,
  HARD_COSTS,
  INVENTORY_CATEGORIES,
  INVENTORY_IDS,
  INVENTORY_ITEMS,
  PRODUCT_IDS,
  PRODUCTS,
  PROFIT_GOAL,
  TOTAL_HARD_COSTS,
  UPGRADES,
  charmPriceTotal,
  createDefaultProductCatalog,
  formatMoney,
  freeCharmAllowance,
  productDisplayName,
  upgradePriceTotal,
  upgradesForProduct,
  type CharmId,
  type InventoryId,
  type ProductCatalog,
  type ProductId,
  type ProductStock,
  type UpgradeId,
} from "./lib/business";
import {
  fileToProductImageDataUrl,
  productDescription,
  productImageSrc,
  productPrice,
  saleAmount,
} from "./lib/store";
import { useStandStore } from "./lib/useStandStore";
import "./index.css";

type RestockTarget =
  | { kind: "product"; id: ProductId }
  | { kind: "supply"; id: InventoryId };

type PendingSale = ProductId | null;
type Modal =
  | "tools"
  | "restock"
  | "undo"
  | "reset"
  | "history"
  | "restore"
  | "closeout"
  | "checklist"
  | "settings"
  | "pin"
  | null;
type HistoryFilter = "all" | ProductId;

const RESET_PHRASE = "RESET";
const KIOSK_PIN = "1234";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function stockUnitLabel(productId: ProductId, remaining: number): string {
  if (remaining === 0) return "Sold out";
  if (productId === "slimeBundle") {
    return `${remaining} bundle${remaining === 1 ? "" : "s"} left`;
  }
  return `${remaining} cup${remaining === 1 ? "" : "s"} left`;
}

function pricePillText(productId: ProductId, price: number): string {
  if (productId === "slimeBundle") {
    return `3 for ${formatMoney(price)}`;
  }
  return `${formatMoney(price)} each`;
}

function emptyProductDraft(): Record<ProductId, string> {
  const draft = {} as Record<ProductId, string>;
  for (const id of PRODUCT_IDS) draft[id] = String(PRODUCTS[id].price);
  return draft;
}

function emptyLowDraft(): Record<ProductId, string> {
  const draft = {} as Record<ProductId, string>;
  for (const id of PRODUCT_IDS) draft[id] = String(DEFAULT_LOW_STOCK[id]);
  return draft;
}

export default function App() {
  const {
    state,
    settings,
    totals,
    restorePoints,
    saveWarning,
    sell,
    restockProduct,
    restockSupply,
    undo,
    reset,
    restoreBackup,
    closeOut,
    updateSettings,
    toggleChecklist,
    setKioskLocked,
    downloadSales,
    canRestoreBackup,
    availableStock,
    canSellProduct,
  } = useStandStore();

  const [pending, setPending] = useState<PendingSale>(null);
  const [qty, setQty] = useState(1);
  const [selectedUpgrades, setSelectedUpgrades] = useState<UpgradeId[]>([]);
  const [selectedCharms, setSelectedCharms] = useState<CharmId[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [restockTarget, setRestockTarget] = useState<RestockTarget>({
    kind: "product",
    id: "lemonade",
  });
  const [resetTyped, setResetTyped] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [pinDigits, setPinDigits] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [settingsDraft, setSettingsDraft] = useState({
    eventName: "",
    startingCash: "40",
    prices: emptyProductDraft(),
    lowStockAt: emptyLowDraft(),
    catalog: createDefaultProductCatalog(),
  });
  const [uploadingProduct, setUploadingProduct] = useState<ProductId | null>(
    null
  );
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null
  );
  const toastTimers = useRef<number[]>([]);
  const toastSeq = useRef(0);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  function flash(message: string) {
    toastTimers.current.forEach((id) => window.clearTimeout(id));
    toastTimers.current = [];
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToast({ id, message });
    toastTimers.current.push(
      window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 2400)
    );
  }

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;

    async function requestLock() {
      try {
        if (!("wakeLock" in navigator) || document.visibilityState !== "visible") {
          return;
        }
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Wake Lock is optional on unsupported/denied devices.
      }
    }

    void requestLock();
    const onVis = () => {
      if (document.visibilityState === "visible") void requestLock();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, []);

  useEffect(() => {
    if (!pending && !modal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPending(null);
        setModal(null);
        setResetTyped("");
        setPinDigits("");
        setQty(1);
        setSelectedUpgrades([]);
        setSelectedCharms([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, modal]);

  useEffect(() => {
    if (
      pending ||
      modal === "undo" ||
      modal === "reset" ||
      modal === "restock" ||
      modal === "closeout"
    ) {
      window.setTimeout(() => confirmBtnRef.current?.focus(), 0);
    }
    if (modal === "pin") {
      window.setTimeout(() => pinInputRef.current?.focus(), 0);
    }
  }, [pending, modal]);

  function buzz() {
    try {
      navigator.vibrate?.(40);
    } catch {
      // ignore
    }
  }

  function openTools() {
    if (settings.kioskLocked) {
      setPinDigits("");
      setModal("pin");
      return;
    }
    setModal("tools");
  }

  function closeModal() {
    setModal(null);
    setResetTyped("");
    setPinDigits("");
  }

  function requestSale(productId: ProductId) {
    if (!canSellProduct(productId, 1)) {
      flash("Out of stock — use Stand tools → Restock");
      return;
    }
    setQty(1);
    setSelectedUpgrades([]);
    setSelectedCharms([]);
    setPending(productId);
  }

  function maxQtyForPending(): number {
    if (!pending) return 1;
    return Math.min(5, availableStock(pending));
  }

  function clearPendingSale() {
    setPending(null);
    setQty(1);
    setSelectedUpgrades([]);
    setSelectedCharms([]);
  }

  function toggleUpgrade(upgradeId: UpgradeId) {
    setSelectedUpgrades((current) =>
      current.includes(upgradeId)
        ? current.filter((id) => id !== upgradeId)
        : [...current, upgradeId]
    );
  }

  function toggleCharm(charmId: CharmId) {
    setSelectedCharms((current) => {
      const free = freeCharmAllowance(qty);
      const maxAllowed = free + 6; // allow a few paid extras
      if (current.includes(charmId)) {
        const index = current.lastIndexOf(charmId);
        return [...current.slice(0, index), ...current.slice(index + 1)];
      }
      if (current.length >= maxAllowed) return current;
      return [...current, charmId];
    });
  }

  function confirmSale() {
    if (!pending) return;
    const productId = pending;
    const count = Math.min(qty, availableStock(productId));
    const options = {
      upgrades: selectedUpgrades,
      charms: productId === "slimeBundle" ? selectedCharms : [],
    };
    if (!canSellProduct(productId, count, options)) {
      flash("Not enough supplies for those upgrades");
      return;
    }
    clearPendingSale();
    const ok = sell(productId, count, options);
    if (ok) {
      buzz();
      const label = `${count} ${productDisplayName(productId, count)} · ${formatMoney(
        saleAmount(productId, count, settings, options)
      )}`;
      flash(label);
    } else {
      flash("Couldn’t record sale — check stock");
    }
  }

  function confirmUndo() {
    undo();
    closeModal();
    flash("Last sale undone");
  }

  function confirmReset() {
    if (resetTyped.trim().toUpperCase() !== RESET_PHRASE) return;
    reset();
    closeModal();
    flash("Day reset — use Restore points if that was a mistake");
  }

  function confirmRestock() {
    const ok =
      restockTarget.kind === "product"
        ? restockProduct(restockTarget.id, 10)
        : restockSupply(restockTarget.id, 10);
    closeModal();
    const label =
      restockTarget.kind === "product"
        ? `${productDisplayName(restockTarget.id, 10)} (+ supplies)`
        : INVENTORY_ITEMS[restockTarget.id].name;
    flash(ok ? `Restocked +10 ${label}` : "Couldn’t restock");
  }

  function handleRestore(pointId?: string) {
    if (!pointId && !canRestoreBackup) {
      flash("No restore point yet — available after Undo or Reset");
      return;
    }
    const ok = restoreBackup(pointId);
    flash(
      ok
        ? "Restored sales and inventory from restore point"
        : "Couldn’t restore — pick a different point"
    );
    closeModal();
  }

  async function handleDownload() {
    if (state.sales.length === 0) {
      flash("No sales to download yet");
      return;
    }
    try {
      await downloadSales();
      flash("Sales log ready");
    } catch {
      flash("Download canceled");
    }
  }

  function openSettings() {
    const prices = {} as Record<ProductId, string>;
    const lowStockAt = {} as Record<ProductId, string>;
    const catalog = createDefaultProductCatalog();
    for (const id of PRODUCT_IDS) {
      prices[id] = String(settings.prices[id]);
      lowStockAt[id] = String(settings.lowStockAt[id]);
      catalog[id] = {
        description:
          settings.catalog?.[id]?.description ?? PRODUCTS[id].description,
        imageDataUrl: settings.catalog?.[id]?.imageDataUrl ?? null,
      };
    }
    setSettingsDraft({
      eventName: settings.eventName,
      startingCash: String(settings.startingCash),
      prices,
      lowStockAt,
      catalog,
    });
    setModal("settings");
  }

  function draftImageSrc(productId: ProductId): string {
    const custom = settingsDraft.catalog[productId]?.imageDataUrl?.trim();
    if (custom && custom.startsWith("data:image/")) return custom;
    return productImageSrc(productId, {
      ...settings,
      catalog: settingsDraft.catalog,
    });
  }

  async function handleProductImageUpload(
    productId: ProductId,
    file: File | null
  ) {
    if (!file) return;
    setUploadingProduct(productId);
    try {
      const imageDataUrl = await fileToProductImageDataUrl(file);
      setSettingsDraft((draft) => ({
        ...draft,
        catalog: {
          ...draft.catalog,
          [productId]: {
            ...draft.catalog[productId],
            imageDataUrl,
          },
        },
      }));
      flash(`Updated ${PRODUCTS[productId].name} picture`);
    } catch {
      flash("Couldn’t use that picture — try a JPG or PNG");
    } finally {
      setUploadingProduct(null);
    }
  }

  function resetProductImage(productId: ProductId) {
    setSettingsDraft((draft) => ({
      ...draft,
      catalog: {
        ...draft.catalog,
        [productId]: {
          ...draft.catalog[productId],
          imageDataUrl: null,
        },
      },
    }));
  }

  function saveSettings() {
    const startingCash = Number(settingsDraft.startingCash);
    const prices = {} as ProductStock;
    const lowStockAt = {} as ProductStock;
    const catalog = {} as ProductCatalog;
    for (const id of PRODUCT_IDS) {
      prices[id] = Number(settingsDraft.prices[id]);
      lowStockAt[id] = Number(settingsDraft.lowStockAt[id]);
      catalog[id] = {
        description: settingsDraft.catalog[id].description.trim().slice(0, 240),
        imageDataUrl: settingsDraft.catalog[id].imageDataUrl,
      };
    }
    if (
      !Number.isFinite(startingCash) ||
      startingCash < 0 ||
      PRODUCT_IDS.some(
        (id) =>
          !Number.isFinite(prices[id]) ||
          prices[id] < 0 ||
          !Number.isFinite(lowStockAt[id]) ||
          lowStockAt[id] < 0
      )
    ) {
      flash("Check settings numbers");
      return;
    }
    const roundedPrices = {} as ProductStock;
    const flooredLow = {} as ProductStock;
    for (const id of PRODUCT_IDS) {
      roundedPrices[id] = Math.round(prices[id] * 100) / 100;
      flooredLow[id] = Math.floor(lowStockAt[id]);
    }
    updateSettings({
      eventName: settingsDraft.eventName.trim().slice(0, 60),
      startingCash,
      prices: roundedPrices,
      lowStockAt: flooredLow,
      catalog,
    });
    closeModal();
    flash("Settings saved");
  }

  function openCloseout() {
    setActualCash(String(totals.expectedCash));
    setModal("closeout");
  }

  function confirmCloseout() {
    const cash = Number(actualCash);
    if (!Number.isFinite(cash) || cash < 0) {
      flash("Enter a valid cash amount");
      return;
    }
    closeOut(cash);
    closeModal();
    const diff = cash - totals.expectedCash;
    flash(
      diff === 0
        ? "Cash closeout saved — counts match"
        : `Closeout saved · difference ${formatMoney(diff)}`
    );
  }

  function tryUnlockPin() {
    if (pinDigits.trim() === KIOSK_PIN) {
      setKioskLocked(false);
      setPinDigits("");
      setModal("tools");
      flash("Kiosk unlocked");
      return;
    }
    setPinDigits("");
    flash("Wrong PIN");
  }

  function lockKiosk() {
    setKioskLocked(true);
    closeModal();
    flash("Kiosk locked — tools need PIN");
  }

  const pendingProduct = pending ? PRODUCTS[pending] : null;
  const resetReady = resetTyped.trim().toUpperCase() === RESET_PHRASE;
  const paidOff = totals.costRecoveryPct >= 100;
  const locked = settings.kioskLocked;

  const filteredSales =
    historyFilter === "all"
      ? state.sales
      : state.sales.filter((sale) => sale.productId === historyFilter);

  const recentAudit = state.auditLog.slice(0, 8);

  return (
    <div className="app">
      <header className="brand-bar">
        <div className="brand-lockup">
          <div className="eyebrow">Nayeli&apos;s</div>
          <h1>
            <span>Sliminade</span> Stand Kiosk
          </h1>
          <p>
            {settings.eventName
              ? settings.eventName
              : BRAND.tagline}
          </p>
        </div>
        <div className="toolbar">
          <button
            type="button"
            className="ghost-btn"
            onClick={openTools}
            aria-label={locked ? "Stand tools (PIN required)" : "Stand tools"}
          >
            {locked ? "Unlock tools" : "Stand tools"}
          </button>
        </div>
      </header>

      <div className="kiosk-grid">
        <section className="sell-panel" aria-label="Record a sale">
          {PRODUCT_IDS.map((productId) => {
            const product = PRODUCTS[productId];
            const remaining = totals.remaining[productId];
            const low =
              remaining > 0 && remaining <= settings.lowStockAt[productId];
            const empty = remaining === 0;
            const canSell = canSellProduct(productId);
            return (
              <article
                key={productId}
                className={`product-card ${product.cardClass}`}
              >
                <div className="logo-wrap">
                  <img
                    src={productImageSrc(productId, settings)}
                    alt={product.imageAlt}
                  />
                </div>
                <div className="product-body">
                  <h2>{product.name}</h2>
                  <div className="product-meta">
                    <span className="price-pill">
                      {pricePillText(productId, settings.prices[productId])}
                    </span>
                    <span
                      className={`stock-chip${low ? " low" : ""}${empty ? " empty" : ""}`}
                      aria-live="polite"
                    >
                      {stockUnitLabel(productId, remaining)}
                    </span>
                  </div>
                  <p className="includes-note">
                    {productDescription(productId, settings)}
                  </p>
                  {"safetyWarning" in product && product.safetyWarning ? (
                    <p className="safety-note">{product.safetyWarning}</p>
                  ) : null}
                  <button
                    type="button"
                    className={`sell-btn ${product.cardClass}`}
                    onClick={() => requestSale(productId)}
                    disabled={!canSell}
                  >
                    {canSell ? "Tap to sell" : "Sold out"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="side-panel">
          <section className="panel" aria-label="Stand totals">
            <h3>Today&apos;s stand</h3>
            <div className="stats-grid">
              <div className="stat">
                <span className="label">Revenue in</span>
                <span className="value">{formatMoney(totals.revenue)}</span>
              </div>
              <div className={`stat green${paidOff ? "" : " waiting"}`}>
                <span className="label">
                  {paidOff ? "Profit after costs" : "Still to earn back"}
                </span>
                <span className="value">
                  {paidOff
                    ? formatMoney(totals.profit)
                    : formatMoney(totals.remainingToRecover)}
                </span>
              </div>
              <div className="stat pink">
                <span className="label">Lemonades sold</span>
                <span className="value">{totals.sold.lemonade}</span>
              </div>
              <div className="stat orange">
                <span className="label">Passion fruit</span>
                <span className="value">{totals.sold.passionFruit}</span>
              </div>
              <div className="stat purple">
                <span className="label">Slime bundles</span>
                <span className="value">{totals.sold.slimeBundle}</span>
              </div>
            </div>

            <div className="progress">
              <div className="progress-label">
                <span>Hard-cost recovery</span>
                <span>
                  {totals.costRecoveryPct.toFixed(0)}% of{" "}
                  {formatMoney(TOTAL_HARD_COSTS)}
                </span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Hard-cost recovery"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(totals.costRecoveryPct)}
              >
                <div
                  className="progress-fill"
                  style={{ width: `${totals.costRecoveryPct}%` }}
                />
              </div>
            </div>

            <div className="progress">
              <div className="progress-label">
                <span>Profit goal</span>
                <span>
                  {totals.profitGoalPct.toFixed(0)}% of{" "}
                  {formatMoney(PROFIT_GOAL)}
                </span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Profit goal progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(totals.profitGoalPct)}
              >
                <div
                  className="progress-fill"
                  style={{
                    width: `${totals.profitGoalPct}%`,
                    background:
                      "linear-gradient(90deg, var(--green), var(--yellow))",
                  }}
                />
              </div>
            </div>

            {!locked && (
              <p className="safety-hint">
                Counts save on this device. Undo/Reset create restore points.
                Use Stand tools for restock, closeout, checklist, and settings.
              </p>
            )}
          </section>

          {!locked && (
            <>
              <section className="panel" aria-label="Individual inventory">
                <h3>Individual inventory</h3>
                <p className="safety-hint" style={{ marginTop: 0 }}>
                  Cups, lids, ingredients, and slime supplies drop with each
                  sale. Restock from Stand tools.
                </p>
                {INVENTORY_CATEGORIES.map((category) => {
                  const rows = INVENTORY_IDS.filter(
                    (id) => INVENTORY_ITEMS[id].category === category.id
                  );
                  return (
                    <div key={category.id} className="inventory-group">
                      <h4>{category.label}</h4>
                      <ul className="inventory-list">
                        {rows.map((id) => {
                          const item = INVENTORY_ITEMS[id];
                          const current = totals.inventory[id] ?? 0;
                          const low = totals.lowInventoryIds.includes(id);
                          const empty = current === 0;
                          return (
                            <li key={id}>
                              <div>
                                <span className="item">{item.name}</span>
                                <span className="details">
                                  of {item.startingStock} {item.unit}
                                </span>
                              </div>
                              <span
                                className={`stock-chip${low ? " low" : ""}${empty ? " empty" : ""}`}
                              >
                                {empty ? "Out" : current}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </section>

              <section className="panel" aria-label="Hard costs">
                <h3>Starting hard costs</h3>
                <ul className="cost-list">
                  {HARD_COSTS.map((row) => (
                    <li key={row.item}>
                      <div>
                        <span className="item">{row.item}</span>
                        <span className="details">{row.details}</span>
                      </div>
                      <span className="amount">{formatMoney(row.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="cost-total">
                  <span>Total to earn back</span>
                  <strong>{formatMoney(TOTAL_HARD_COSTS)}</strong>
                </div>
              </section>

              <section className="panel" aria-label="Recent sales">
                <h3>Recent sales</h3>
                {state.sales.length === 0 ? (
                  <p className="empty">No sales yet — tap a product to start.</p>
                ) : (
                  <>
                    <ul className="sales-list">
                      {state.sales.slice(0, 8).map((sale) => (
                        <li key={sale.id}>
                          <span>
                            {PRODUCTS[sale.productId].name}
                            {sale.qty > 1 ? ` ×${sale.qty}` : ""}
                            {(sale.upgrades?.length ?? 0) > 0
                              ? ` · ${sale.upgrades
                                  .map((id) => UPGRADES[id].name)
                                  .join(" + ")}`
                              : ""}
                            {(sale.charms?.length ?? 0) > 0
                              ? ` · ${sale.charms.length} charms`
                              : ""}
                          </span>
                          <span>
                            {formatMoney(sale.amount)}{" "}
                            <span className="time">{formatTime(sale.at)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="modal-actions" style={{ marginTop: "0.75rem" }}>
                      <button
                        type="button"
                        className="cancel"
                        onClick={() => {
                          setHistoryFilter("all");
                          setModal("history");
                        }}
                      >
                        View all
                      </button>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </aside>
      </div>

      <footer className="footer-strip">
        <div className="gingham" aria-hidden="true" />
        <div className="msg">
          {BRAND.slogan} Thank you for supporting my stand!
        </div>
      </footer>

      {pendingProduct && pending && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            style={{ maxHeight: "90vh", overflow: "auto" }}
          >
            <h3 id="confirm-title">Confirm sale</h3>
            <p>
              Sell{" "}
              <strong>
                {qty} {productDisplayName(pending, qty)}
              </strong>{" "}
              for{" "}
              <strong>
                {formatMoney(
                  saleAmount(pending, qty, settings, {
                    upgrades: selectedUpgrades,
                    charms: pending === "slimeBundle" ? selectedCharms : [],
                  })
                )}
              </strong>
              ?
            </p>
            <div className="qty-row" aria-label="Quantity">
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="qty-value">{qty}</span>
              <button
                type="button"
                className="qty-btn"
                onClick={() =>
                  setQty((q) => Math.min(maxQtyForPending(), q + 1))
                }
                disabled={qty >= maxQtyForPending()}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            {upgradesForProduct(pending).length > 0 && (
              <div className="upgrade-block">
                <h4>Add upgrades</h4>
                <p className="upgrade-hint">
                  Base {formatMoney(productPrice(pending, settings))}
                  {selectedUpgrades.length > 0
                    ? ` + ${formatMoney(
                        upgradePriceTotal(selectedUpgrades, qty)
                      )} upgrades`
                    : ""}
                </p>
                <div className="upgrade-grid">
                  {upgradesForProduct(pending).map((upgradeId) => {
                    const upgrade = UPGRADES[upgradeId];
                    const selected = selectedUpgrades.includes(upgradeId);
                    const invId = Object.keys(
                      upgrade.inventory
                    )[0] as InventoryId | undefined;
                    const stockLeft = invId
                      ? (totals.inventory[invId] ?? 0)
                      : 0;
                    const unavailable = invId != null && stockLeft < qty;
                    return (
                      <button
                        key={upgradeId}
                        type="button"
                        className={`upgrade-chip${selected ? " selected" : ""}`}
                        disabled={unavailable && !selected}
                        onClick={() => toggleUpgrade(upgradeId)}
                      >
                        <strong>{upgrade.name}</strong>
                        <span>+{formatMoney(upgrade.price)}</span>
                        {unavailable ? (
                          <em>Out</em>
                        ) : (
                          <em>{stockLeft} left</em>
                        )}
                      </button>
                    );
                  })}
                </div>
                {(selectedUpgrades.includes("lightUpCup") ||
                  selectedUpgrades.includes("spiderRing")) && (
                  <div className="warning">
                    Spider ring and light are not edible.
                  </div>
                )}
              </div>
            )}

            {pending === "passionFruit" && (
              <p className="upgrade-hint">
                Includes spider ring + light-up cup (already in the $
                {settings.prices.passionFruit.toFixed(0)} price).
              </p>
            )}

            {pending === "slimeBundle" && (
              <div className="upgrade-block">
                <h4>Pick free charms</h4>
                <p className="upgrade-hint">
                  {freeCharmAllowance(qty)} free with this sale
                  {selectedCharms.length >
                  freeCharmAllowance(qty)
                    ? ` · extras +${formatMoney(
                        charmPriceTotal(selectedCharms, qty)
                      )} (${formatMoney(EXTRA_CHARM_PRICE)} each)`
                    : ""}
                  {" · "}
                  selected {selectedCharms.length}
                </p>
                <div className="upgrade-grid">
                  {CHARM_OPTIONS.map((charm) => {
                    const count = selectedCharms.filter(
                      (id) => id === charm.id
                    ).length;
                    const stockLeft = totals.inventory[charm.inventoryId] ?? 0;
                    return (
                      <button
                        key={charm.id}
                        type="button"
                        className={`upgrade-chip${count > 0 ? " selected" : ""}`}
                        disabled={stockLeft <= 0 && count === 0}
                        onClick={() => toggleCharm(charm.id)}
                      >
                        <strong>{charm.name}</strong>
                        <span>{count > 0 ? `×${count}` : "Add"}</span>
                        <em>{stockLeft} left</em>
                      </button>
                    );
                  })}
                </div>
                <div className="warning">
                  {PRODUCTS.slimeBundle.safetyWarning}
                </div>
              </div>
            )}

            {"safetyWarning" in pendingProduct &&
              pendingProduct.safetyWarning &&
              pending !== "slimeBundle" && (
                <div className="warning">{pendingProduct.safetyWarning}</div>
              )}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={clearPendingSale}
              >
                Cancel
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className="confirm"
                onClick={confirmSale}
              >
                Yes, sold!
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "pin" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-title"
          >
            <h3 id="pin-title">Enter PIN</h3>
            <p>Kiosk tools are locked. Type the PIN to unlock.</p>
            <label className="reset-label" htmlFor="kiosk-pin">
              PIN
            </label>
            <input
              ref={pinInputRef}
              id="kiosk-pin"
              className="reset-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pinDigits}
              onChange={(event) => setPinDigits(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") tryUnlockPin();
              }}
              placeholder="••••"
              style={{ textTransform: "none", letterSpacing: "0.2em" }}
            />
            <div className="modal-actions">
              <button type="button" className="cancel" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className="confirm"
                onClick={tryUnlockPin}
                disabled={pinDigits.length === 0}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "tools" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tools-title"
          >
            <h3 id="tools-title">Stand tools</h3>
            <p>Admin actions for restocking, cash, and protecting today&apos;s counts.</p>
            <div className="tools-list">
              <button
                type="button"
                className="tool-btn"
                onClick={() => {
                  setRestockTarget({ kind: "product", id: "lemonade" });
                  setModal("restock");
                }}
              >
                Restock
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={() => {
                  setHistoryFilter("all");
                  setModal("history");
                }}
              >
                Sales history
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={() => setModal("restore")}
                disabled={restorePoints.length === 0}
              >
                Restore points
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={openCloseout}
              >
                Cash closeout
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={() => setModal("checklist")}
              >
                Pre-event checklist
              </button>
              <button type="button" className="tool-btn" onClick={openSettings}>
                Settings
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={() => void handleDownload()}
                disabled={state.sales.length === 0}
              >
                Download / share CSV
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={() => setModal("undo")}
                disabled={state.sales.length === 0}
              >
                Undo last sale
              </button>
              <button
                type="button"
                className="tool-btn danger"
                onClick={() => {
                  setResetTyped("");
                  setModal("reset");
                }}
              >
                Reset day
              </button>
              {locked ? (
                <button
                  type="button"
                  className="tool-btn"
                  onClick={() => {
                    setKioskLocked(false);
                    flash("Kiosk unlocked");
                  }}
                >
                  Exit kiosk lock
                </button>
              ) : (
                <button type="button" className="tool-btn" onClick={lockKiosk}>
                  Enter kiosk lock
                </button>
              )}
            </div>

            {recentAudit.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h3 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>
                  Recent audit
                </h3>
                <ul className="sales-list" style={{ maxHeight: 140 }}>
                  {recentAudit.map((entry) => (
                    <li key={entry.id}>
                      <span>
                        {entry.action}: {entry.detail}
                      </span>
                      <span className="time">{formatTime(entry.at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="cancel" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "restock" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restock-title"
            style={{ maxHeight: "90vh", overflow: "auto" }}
          >
            <h3 id="restock-title">Restock</h3>
            <p>
              Add 10 finished goods (with matching supplies) or restock one
              supply item.
            </p>
            <h4 className="restock-heading">Finished goods</h4>
            <div className="tools-list">
              {PRODUCT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`tool-btn${
                    restockTarget.kind === "product" && restockTarget.id === id
                      ? " selected"
                      : ""
                  }`}
                  onClick={() => setRestockTarget({ kind: "product", id })}
                >
                  {PRODUCTS[id].name} (now {totals.remaining[id]})
                </button>
              ))}
            </div>
            {INVENTORY_CATEGORIES.map((category) => {
              const rows = INVENTORY_IDS.filter(
                (id) => INVENTORY_ITEMS[id].category === category.id
              );
              return (
                <div key={category.id}>
                  <h4 className="restock-heading">{category.label}</h4>
                  <div className="tools-list">
                    {rows.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={`tool-btn${
                          restockTarget.kind === "supply" &&
                          restockTarget.id === id
                            ? " selected"
                            : ""
                        }`}
                        onClick={() =>
                          setRestockTarget({ kind: "supply", id })
                        }
                      >
                        {INVENTORY_ITEMS[id].name} (now{" "}
                        {totals.inventory[id] ?? 0})
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={() => setModal("tools")}
              >
                Back
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className="confirm"
                onClick={confirmRestock}
              >
                Add +10
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "history" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            style={{ width: "min(480px, 100%)", maxHeight: "90vh", overflow: "auto" }}
          >
            <h3 id="history-title">Sales history</h3>
            <p>
              {state.sales.length} sale{state.sales.length === 1 ? "" : "s"}{" "}
              recorded.
            </p>
            <div className="tools-list" style={{ marginBottom: "0.85rem" }}>
              <button
                type="button"
                className={`tool-btn${historyFilter === "all" ? " selected" : ""}`}
                onClick={() => setHistoryFilter("all")}
              >
                All
              </button>
              {PRODUCT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`tool-btn${historyFilter === id ? " selected" : ""}`}
                  onClick={() => setHistoryFilter(id)}
                >
                  {PRODUCTS[id].name}
                </button>
              ))}
            </div>
            {filteredSales.length === 0 ? (
              <p className="empty">No sales in this filter.</p>
            ) : (
              <ul className="sales-list" style={{ maxHeight: 320 }}>
                {filteredSales.map((sale) => (
                  <li key={sale.id}>
                    <span>
                      {PRODUCTS[sale.productId].name}
                      {` ×${sale.qty}`}
                    </span>
                    <span>
                      {formatMoney(sale.amount)}{" "}
                      <span className="time">{formatTime(sale.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {state.auditLog.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h3 style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>
                  Audit log
                </h3>
                <ul className="sales-list" style={{ maxHeight: 160 }}>
                  {state.auditLog.slice(0, 20).map((entry) => (
                    <li key={entry.id}>
                      <span>
                        {entry.action}: {entry.detail}
                      </span>
                      <span className="time">{formatTime(entry.at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={() => setModal(locked ? null : "tools")}
              >
                {locked ? "Close" : "Back"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "restore" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-title"
            style={{ width: "min(480px, 100%)", maxHeight: "90vh", overflow: "auto" }}
          >
            <h3 id="restore-title">Restore points</h3>
            <p>Pick a saved point to bring sales and stock back.</p>
            {restorePoints.length === 0 ? (
              <p className="empty">No restore points yet.</p>
            ) : (
              <div className="tools-list">
                {restorePoints.map((point) => (
                  <button
                    key={point.id}
                    type="button"
                    className="tool-btn"
                    onClick={() => handleRestore(point.id)}
                    style={{ textAlign: "left" }}
                  >
                    <strong style={{ display: "block" }}>{point.label}</strong>
                    <span style={{ display: "block", fontWeight: 600, opacity: 0.8 }}>
                      {formatDateTime(point.at)} · {formatMoney(point.revenue)}{" "}
                      revenue
                    </span>
                    <span style={{ display: "block", fontWeight: 600, opacity: 0.8 }}>
                      {PRODUCT_IDS.map(
                        (id) => `${point.productStock[id]} ${PRODUCTS[id].name}`
                      ).join(" · ")}{" "}
                      · {point.salesCount} sales
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={() => setModal("tools")}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "closeout" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="closeout-title"
          >
            <h3 id="closeout-title">Cash closeout</h3>
            <p>
              Expected cash is starting cash plus revenue:{" "}
              <strong>{formatMoney(totals.expectedCash)}</strong>
              {" "}({formatMoney(settings.startingCash)} start +{" "}
              {formatMoney(totals.revenue)} sales).
            </p>
            {state.closeout && (
              <p>
                Last closeout difference:{" "}
                <strong>{formatMoney(state.closeout.difference)}</strong> at{" "}
                {formatDateTime(state.closeout.at)}.
              </p>
            )}
            <label className="reset-label" htmlFor="actual-cash">
              Actual cash in box
            </label>
            <input
              id="actual-cash"
              className="reset-input"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={actualCash}
              onChange={(event) => setActualCash(event.target.value)}
              style={{ textTransform: "none", letterSpacing: "normal" }}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={() => setModal("tools")}
              >
                Back
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className="confirm"
                onClick={confirmCloseout}
              >
                Save closeout
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "checklist" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checklist-title"
          >
            <h3 id="checklist-title">Pre-event checklist</h3>
            <p>Tap each item when it is ready for the stand day.</p>
            <div className="tools-list">
              {CHECKLIST_ITEMS.map((item) => {
                const checked = Boolean(settings.checklist[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`tool-btn${checked ? " selected" : ""}`}
                    onClick={() => toggleChecklist(item.id)}
                    aria-pressed={checked}
                    style={{ textAlign: "left" }}
                  >
                    {checked ? "Done · " : "Todo · "}
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={() => setModal("tools")}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "settings" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            style={{ maxHeight: "90vh", overflow: "auto", width: "min(520px, 100%)" }}
          >
            <h3 id="settings-title">Settings</h3>
            <p>
              Prices, pictures, descriptions, starting cash, and low-stock
              alerts.
            </p>

            <label className="reset-label" htmlFor="event-name">
              Event name
            </label>
            <input
              id="event-name"
              className="reset-input"
              value={settingsDraft.eventName}
              onChange={(event) =>
                setSettingsDraft((draft) => ({
                  ...draft,
                  eventName: event.target.value,
                }))
              }
              maxLength={60}
              placeholder="School fair, block party…"
              style={{ textTransform: "none", letterSpacing: "normal" }}
            />

            <h4 className="restock-heading">Products</h4>
            {PRODUCT_IDS.map((id) => (
              <div key={`catalog-${id}`} className="catalog-editor">
                <div className="catalog-editor-top">
                  <div className="catalog-preview">
                    <img
                      src={draftImageSrc(id)}
                      alt={`${PRODUCTS[id].name} preview`}
                    />
                  </div>
                  <div className="catalog-fields">
                    <strong>{PRODUCTS[id].name}</strong>
                    <label className="reset-label" htmlFor={`price-${id}`}>
                      Price ($)
                    </label>
                    <input
                      id={`price-${id}`}
                      className="reset-input"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={settingsDraft.prices[id]}
                      onChange={(event) =>
                        setSettingsDraft((draft) => ({
                          ...draft,
                          prices: {
                            ...draft.prices,
                            [id]: event.target.value,
                          },
                        }))
                      }
                      style={{ textTransform: "none", letterSpacing: "normal" }}
                    />
                    <label className="reset-label" htmlFor={`low-${id}`}>
                      Low-stock at
                    </label>
                    <input
                      id={`low-${id}`}
                      className="reset-input"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step="1"
                      value={settingsDraft.lowStockAt[id]}
                      onChange={(event) =>
                        setSettingsDraft((draft) => ({
                          ...draft,
                          lowStockAt: {
                            ...draft.lowStockAt,
                            [id]: event.target.value,
                          },
                        }))
                      }
                      style={{ textTransform: "none", letterSpacing: "normal" }}
                    />
                    <div className="catalog-actions">
                      <label className="upload-btn">
                        {uploadingProduct === id
                          ? "Uploading…"
                          : "Upload picture"}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          disabled={uploadingProduct === id}
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            void handleProductImageUpload(id, file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      {settingsDraft.catalog[id].imageDataUrl ? (
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => resetProductImage(id)}
                        >
                          Use default
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <label className="reset-label" htmlFor={`desc-${id}`}>
                  Description
                </label>
                <textarea
                  id={`desc-${id}`}
                  className="reset-input catalog-description"
                  value={settingsDraft.catalog[id].description}
                  maxLength={240}
                  rows={3}
                  onChange={(event) =>
                    setSettingsDraft((draft) => ({
                      ...draft,
                      catalog: {
                        ...draft.catalog,
                        [id]: {
                          ...draft.catalog[id],
                          description: event.target.value,
                        },
                      },
                    }))
                  }
                />
              </div>
            ))}

            <label className="reset-label" htmlFor="starting-cash">
              Starting cash ($)
            </label>
            <input
              id="starting-cash"
              className="reset-input"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={settingsDraft.startingCash}
              onChange={(event) =>
                setSettingsDraft((draft) => ({
                  ...draft,
                  startingCash: event.target.value,
                }))
              }
              style={{ textTransform: "none", letterSpacing: "normal" }}
            />

            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={() => setModal("tools")}
              >
                Back
              </button>
              <button type="button" className="confirm" onClick={saveSettings}>
                Save settings
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "undo" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="undo-title"
          >
            <h3 id="undo-title">Undo last sale?</h3>
            <p>
              This removes the most recent sale and puts stock back. A restore
              point is saved first.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={() => setModal("tools")}
              >
                Keep sale
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className="confirm"
                onClick={confirmUndo}
              >
                Undo sale
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "reset" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h3 id="reset-title">Reset the whole day?</h3>
            <p>
              This clears <strong>all sales</strong> and restores starting
              inventory. Type <strong>{RESET_PHRASE}</strong> to unlock. A
              restore point is saved so you can bring counts back.
            </p>
            <label className="reset-label" htmlFor="reset-confirm">
              Type {RESET_PHRASE} to confirm
            </label>
            <input
              id="reset-confirm"
              className="reset-input"
              value={resetTyped}
              onChange={(event) => setResetTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={RESET_PHRASE}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={() => {
                  setResetTyped("");
                  setModal("tools");
                }}
              >
                Cancel
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className="confirm danger"
                onClick={confirmReset}
                disabled={!resetReady}
              >
                Reset day
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`toast${toast || saveWarning ? " show" : ""}`}
        role="status"
      >
        {toast?.message ?? saveWarning ?? ""}
      </div>
    </div>
  );
}
