import { useEffect, useRef, useState } from "react";
import {
  BRAND,
  HARD_COSTS,
  PRODUCTS,
  TOTAL_HARD_COSTS,
  formatMoney,
  type ProductId,
} from "./lib/business";
import { useStandStore } from "./lib/useStandStore";
import "./index.css";

type PendingSale = ProductId | null;
type GuardDialog = "undo" | "reset" | "restock" | "tools" | null;

const RESET_PHRASE = "RESET";
const LOW_LEMONADE = 20;
const LOW_SLIME = 10;

export default function App() {
  const {
    state,
    totals,
    saveWarning,
    sell,
    restockProduct,
    undo,
    reset,
    restoreBackup,
    downloadSales,
    canRestoreBackup,
    availableStock,
    canSellProduct,
  } = useStandStore();
  const [pending, setPending] = useState<PendingSale>(null);
  const [qty, setQty] = useState(1);
  const [guard, setGuard] = useState<GuardDialog>(null);
  const [restockProductId, setRestockProductId] =
    useState<ProductId>("lemonade");
  const [resetTyped, setResetTyped] = useState("");
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null
  );
  const toastTimers = useRef<number[]>([]);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

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
    if (!pending && !guard) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPending(null);
        setGuard(null);
        setResetTyped("");
        setQty(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, guard]);

  useEffect(() => {
    if (pending || guard === "undo" || guard === "reset" || guard === "restock") {
      window.setTimeout(() => confirmBtnRef.current?.focus(), 0);
    }
  }, [pending, guard]);

  function buzz() {
    try {
      navigator.vibrate?.(40);
    } catch {
      // ignore
    }
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
      const label =
        productId === "lemonade"
          ? `${count} lemonade${count > 1 ? "s" : ""} · ${formatMoney(PRODUCTS.lemonade.price * count)}`
          : `${count} slime bundle${count > 1 ? "s" : ""} · ${formatMoney(PRODUCTS.slimeBundle.price * count)}`;
      flash(label);
    } else {
      flash("Couldn’t record sale — check stock");
    }
  }

  function closeGuard() {
    setGuard(null);
    setResetTyped("");
  }

  function confirmUndo() {
    undo();
    closeGuard();
    flash("Last sale undone");
  }

  function confirmReset() {
    if (resetTyped.trim().toUpperCase() !== RESET_PHRASE) return;
    reset();
    closeGuard();
    flash("Day reset — tap Restore backup if that was a mistake");
  }

  function confirmRestock() {
    const ok = restockProduct(restockProductId, 10);
    closeGuard();
    flash(
      ok
        ? restockProductId === "lemonade"
          ? "Restocked +10 lemonade cups"
          : "Restocked +10 slime bundles"
        : "Couldn’t restock"
    );
  }

  function handleRestore() {
    if (!canRestoreBackup) {
      flash("No restore point yet — available after Undo or Reset");
      return;
    }
    const ok = restoreBackup();
    flash(
      ok
        ? "Restored sales and inventory from safety backup"
        : "Backup matches current counts"
    );
    setGuard(null);
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
    setGuard(null);
  }

  const pendingProduct = pending ? PRODUCTS[pending] : null;
  const resetReady = resetTyped.trim().toUpperCase() === RESET_PHRASE;
  const paidOff = totals.costRecoveryPct >= 100;
  const lemonadeLow =
    totals.lemonadeRemaining > 0 && totals.lemonadeRemaining <= LOW_LEMONADE;
  const slimeLow =
    totals.slimeBundlesRemaining > 0 &&
    totals.slimeBundlesRemaining <= LOW_SLIME;

  return (
    <div className="app">
      <header className="brand-bar">
        <div className="brand-lockup">
          <div className="eyebrow">Nayeli&apos;s</div>
          <h1>
            <span>Sliminade</span> Stand Kiosk
          </h1>
          <p>{BRAND.tagline}</p>
        </div>
        <div className="toolbar">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setGuard("tools")}
          >
            Stand tools
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
            <p className="safety-hint">
              Counts save on this device. Undo/Reset create a safety backup.
              Use Stand tools to restock, restore, or download the sales log.
            </p>
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
              <ul className="sales-list">
                {state.sales.slice(0, 12).map((sale) => (
                  <li key={sale.id}>
                    <span>
                      {sale.productId === "lemonade"
                        ? "Lemonade"
                        : "Slime bundle"}
                      {sale.qty > 1 ? ` ×${sale.qty}` : ""}
                    </span>
                    <span>
                      {formatMoney(sale.amount)}{" "}
                      <span className="time">
                        {new Date(sale.at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <footer className="footer-strip">
        <div className="gingham" aria-hidden="true" />
        <div className="msg">{BRAND.slogan} Thank you for supporting my stand!</div>
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
                {qty}{" "}
                {pending === "lemonade"
                  ? qty === 1
                    ? "lemonade"
                    : "lemonades"
                  : qty === 1
                    ? "slime bundle"
                    : "slime bundles"}
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
              >
                −
              </button>
              <span className="qty-value">{qty}</span>
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQty((q) => Math.min(maxQtyForPending(), q + 1))}
                disabled={qty >= maxQtyForPending()}
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

      {guard === "tools" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tools-title"
          >
            <h3 id="tools-title">Stand tools</h3>
            <p>Admin actions for restocking and protecting today&apos;s counts.</p>
            <div className="tools-list">
              <button
                type="button"
                className="tool-btn"
                onClick={() => {
                  setRestockProductId("lemonade");
                  setGuard("restock");
                }}
              >
                Restock inventory
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={() => void handleDownload()}
                disabled={state.sales.length === 0}
              >
                Download / share sales
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={handleRestore}
                disabled={!canRestoreBackup}
              >
                Restore safety backup
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={() => setGuard("undo")}
                disabled={state.sales.length === 0}
              >
                Undo last sale
              </button>
              <button
                type="button"
                className="tool-btn danger"
                onClick={() => {
                  setResetTyped("");
                  setGuard("reset");
                }}
              >
                Reset day
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel" onClick={closeGuard}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {guard === "restock" && (
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
              <button type="button" className="cancel" onClick={closeGuard}>
                Cancel
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

      {guard === "undo" && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="undo-title"
          >
            <h3 id="undo-title">Undo last sale?</h3>
            <p>
              This removes the most recent sale and puts stock back. A safety
              backup is saved first.
            </p>
            <div className="modal-actions">
              <button type="button" className="cancel" onClick={closeGuard}>
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

      {guard === "reset" && (
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
              safety backup is saved so Restore can bring counts back.
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
              <button type="button" className="cancel" onClick={closeGuard}>
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

      <div className={`toast${toast || saveWarning ? " show" : ""}`} role="status">
        {toast?.message ?? saveWarning ?? ""}
      </div>
    </div>
  );
}
