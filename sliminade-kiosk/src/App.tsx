import { useEffect, useRef, useState } from "react";
import {
  BRAND,
  CHECKLIST_ITEMS,
  HARD_COSTS,
  PRODUCTS,
  PROFIT_GOAL,
  TOTAL_HARD_COSTS,
  formatMoney,
  type ProductId,
} from "./lib/business";
import { useStandStore } from "./lib/useStandStore";
import "./index.css";

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
type HistoryFilter = "all" | "lemonade" | "slime";

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

function productLabel(productId: ProductId, qty = 1): string {
  if (productId === "lemonade") {
    return qty === 1 ? "lemonade" : "lemonades";
  }
  return qty === 1 ? "slime bundle" : "slime bundles";
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
  const [modal, setModal] = useState<Modal>(null);
  const [restockProductId, setRestockProductId] =
    useState<ProductId>("lemonade");
  const [resetTyped, setResetTyped] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [pinDigits, setPinDigits] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [settingsDraft, setSettingsDraft] = useState({
    eventName: "",
    startingCash: "40",
    lemonadeLowAt: "20",
    slimeLowAt: "10",
  });
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null
  );
  const toastTimers = useRef<number[]>([]);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  function flash(message: string) {
    toastTimers.current.forEach((id) => window.clearTimeout(id));
    toastTimers.current = [];
    const id = Date.now();
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
    setPending(productId);
  }

  function maxQtyForPending(): number {
    if (!pending) return 1;
    return Math.min(5, availableStock(pending));
  }

  function confirmSale() {
    if (!pending) return;
    const productId = pending;
    const count = Math.min(qty, availableStock(productId));
    setPending(null);
    setQty(1);
    const ok = sell(productId, count);
    if (ok) {
      buzz();
      const label = `${count} ${productLabel(productId, count)} · ${formatMoney(
        PRODUCTS[productId].price * count
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
    const ok = restockProduct(restockProductId, 10);
    closeModal();
    flash(
      ok
        ? restockProductId === "lemonade"
          ? "Restocked +10 lemonade cups"
          : "Restocked +10 slime bundles"
        : "Couldn’t restock"
    );
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
    setSettingsDraft({
      eventName: settings.eventName,
      startingCash: String(settings.startingCash),
      lemonadeLowAt: String(settings.lemonadeLowAt),
      slimeLowAt: String(settings.slimeLowAt),
    });
    setModal("settings");
  }

  function saveSettings() {
    const startingCash = Number(settingsDraft.startingCash);
    const lemonadeLowAt = Number(settingsDraft.lemonadeLowAt);
    const slimeLowAt = Number(settingsDraft.slimeLowAt);
    if (
      !Number.isFinite(startingCash) ||
      startingCash < 0 ||
      !Number.isFinite(lemonadeLowAt) ||
      lemonadeLowAt < 0 ||
      !Number.isFinite(slimeLowAt) ||
      slimeLowAt < 0
    ) {
      flash("Check settings numbers");
      return;
    }
    updateSettings({
      eventName: settingsDraft.eventName.trim().slice(0, 60),
      startingCash,
      lemonadeLowAt: Math.floor(lemonadeLowAt),
      slimeLowAt: Math.floor(slimeLowAt),
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
  const lemonadeLow =
    totals.lemonadeRemaining > 0 &&
    totals.lemonadeRemaining <= settings.lemonadeLowAt;
  const slimeLow =
    totals.slimeBundlesRemaining > 0 &&
    totals.slimeBundlesRemaining <= settings.slimeLowAt;
  const locked = settings.kioskLocked;

  const filteredSales =
    historyFilter === "all"
      ? state.sales
      : historyFilter === "lemonade"
        ? state.sales.filter((sale) => sale.productId === "lemonade")
        : state.sales.filter((sale) => sale.productId === "slimeBundle");

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
          <article className="product-card lemonade">
            <div className="logo-wrap">
              <img
                src={`${import.meta.env.BASE_URL}assets/lemonade-bucket.jpg`}
                alt="Fresh squeezed lemonade in a branded bucket"
              />
            </div>
            <div className="product-body">
              <h2>{PRODUCTS.lemonade.name}</h2>
              <div className="product-meta">
                <span className="price-pill">
                  {formatMoney(PRODUCTS.lemonade.price)} each
                </span>
                <span
                  className={`stock-chip${lemonadeLow ? " low" : ""}${totals.lemonadeRemaining === 0 ? " empty" : ""}`}
                  aria-live="polite"
                >
                  {totals.lemonadeRemaining === 0
                    ? "Sold out"
                    : `${totals.lemonadeRemaining} cups left`}
                </span>
              </div>
              <button
                type="button"
                className="sell-btn lemonade"
                onClick={() => requestSale("lemonade")}
                disabled={!canSellProduct("lemonade")}
              >
                {canSellProduct("lemonade") ? "Tap to sell" : "Sold out"}
              </button>
            </div>
          </article>

          <article className="product-card slime">
            <div className="logo-wrap">
              <img
                src={`${import.meta.env.BASE_URL}assets/slime-product.jpg`}
                alt="Slime bundle of three colorful slime tubs — green, pink, and blue"
              />
            </div>
            <div className="product-body">
              <h2>{PRODUCTS.slimeBundle.name}</h2>
              <div className="product-meta">
                <span className="price-pill">
                  3 for {formatMoney(PRODUCTS.slimeBundle.price)}
                </span>
                <span
                  className={`stock-chip${slimeLow ? " low" : ""}${totals.slimeBundlesRemaining === 0 ? " empty" : ""}`}
                  aria-live="polite"
                >
                  {totals.slimeBundlesRemaining === 0
                    ? "Sold out"
                    : `${totals.slimeBundlesRemaining} bundles left`}
                </span>
              </div>
              <p className="safety-note">{PRODUCTS.slimeBundle.safetyWarning}</p>
              <button
                type="button"
                className="sell-btn slime"
                onClick={() => requestSale("slimeBundle")}
                disabled={!canSellProduct("slimeBundle")}
              >
                {canSellProduct("slimeBundle") ? "Tap to sell" : "Sold out"}
              </button>
            </div>
          </article>
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
                <span className="value">{totals.lemonadeSold}</span>
              </div>
              <div className="stat purple">
                <span className="label">Slime bundles</span>
                <span className="value">{totals.slimeBundlesSold}</span>
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
                            {sale.productId === "lemonade"
                              ? "Lemonade"
                              : "Slime bundle"}
                            {sale.qty > 1 ? ` ×${sale.qty}` : ""}
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
          >
            <h3 id="confirm-title">Confirm sale</h3>
            <p>
              Sell{" "}
              <strong>
                {qty} {productLabel(pending, qty)}
              </strong>{" "}
              for{" "}
              <strong>{formatMoney(pendingProduct.price * qty)}</strong>?
              Inventory will drop by {qty}.
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
            {pending === "slimeBundle" && (
              <div className="warning">{PRODUCTS.slimeBundle.safetyWarning}</div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={() => {
                  setPending(null);
                  setQty(1);
                }}
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
                  setRestockProductId("lemonade");
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
          >
            <h3 id="restock-title">Restock</h3>
            <p>Add 10 units back to inventory when you refill the table.</p>
            <div className="tools-list">
              <button
                type="button"
                className={`tool-btn${restockProductId === "lemonade" ? " selected" : ""}`}
                onClick={() => setRestockProductId("lemonade")}
              >
                Lemonade cups (now {totals.lemonadeRemaining})
              </button>
              <button
                type="button"
                className={`tool-btn${restockProductId === "slimeBundle" ? " selected" : ""}`}
                onClick={() => setRestockProductId("slimeBundle")}
              >
                Slime bundles (now {totals.slimeBundlesRemaining})
              </button>
            </div>
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
              {(
                [
                  ["all", "All"],
                  ["lemonade", "Lemonade"],
                  ["slime", "Slime"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`tool-btn${historyFilter === id ? " selected" : ""}`}
                  onClick={() => setHistoryFilter(id)}
                >
                  {label}
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
                      {sale.productId === "lemonade"
                        ? "Lemonade"
                        : "Slime bundle"}
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
                      {point.lemonadeStock} lemonade · {point.slimeBundleStock}{" "}
                      slime · {point.salesCount} sales
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
          >
            <h3 id="settings-title">Settings</h3>
            <p>Event name, starting cash, and low-stock alerts.</p>

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

            <label className="reset-label" htmlFor="low-lemonade">
              Lemonade low-stock at
            </label>
            <input
              id="low-lemonade"
              className="reset-input"
              type="number"
              inputMode="numeric"
              min={0}
              step="1"
              value={settingsDraft.lemonadeLowAt}
              onChange={(event) =>
                setSettingsDraft((draft) => ({
                  ...draft,
                  lemonadeLowAt: event.target.value,
                }))
              }
              style={{ textTransform: "none", letterSpacing: "normal" }}
            />

            <label className="reset-label" htmlFor="low-slime">
              Slime low-stock at
            </label>
            <input
              id="low-slime"
              className="reset-input"
              type="number"
              inputMode="numeric"
              min={0}
              step="1"
              value={settingsDraft.slimeLowAt}
              onChange={(event) =>
                setSettingsDraft((draft) => ({
                  ...draft,
                  slimeLowAt: event.target.value,
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
