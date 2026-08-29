import { useRef, useState } from "react";
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

export default function App() {
  const { state, totals, sell, undo, reset, canSellProduct } = useStandStore();
  const [pending, setPending] = useState<PendingSale>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null
  );
  const toastTimers = useRef<number[]>([]);

  function flash(message: string) {
    toastTimers.current.forEach((id) => window.clearTimeout(id));
    toastTimers.current = [];
    const id = Date.now();
    setToast({ id, message });
    toastTimers.current.push(
      window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 2000)
    );
  }

  function requestSale(productId: ProductId) {
    if (!canSellProduct(productId)) {
      flash("Out of stock — restock needed");
      return;
    }
    setPending(productId);
  }

  function confirmSale() {
    if (!pending) return;
    const productId = pending;
    setPending(null);
    const ok = sell(productId);
    if (ok) {
      const label =
        productId === "lemonade"
          ? `Lemonade sold · ${formatMoney(PRODUCTS.lemonade.price)}`
          : `Slime bundle sold · ${formatMoney(PRODUCTS.slimeBundle.price)}`;
      flash(label);
    }
  }

  function handleReset() {
    if (
      window.confirm(
        "Reset the stand day? This clears all sales and restores starting inventory."
      )
    ) {
      reset();
      flash("Stand reset to starting inventory");
    }
  }

  const pendingProduct = pending ? PRODUCTS[pending] : null;

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
            onClick={undo}
            disabled={state.sales.length === 0}
          >
            Undo last sale
          </button>
          <button type="button" className="ghost-btn danger" onClick={handleReset}>
            Reset day
          </button>
        </div>
      </header>

      <div className="kiosk-grid">
        <section className="sell-panel" aria-label="Record a sale">
          <article className="product-card lemonade">
            <img
              src={`${import.meta.env.BASE_URL}assets/lemonade-bucket.jpg`}
              alt="Fresh squeezed lemonade in a branded bucket"
            />
            <div className="product-body">
              <h2>{PRODUCTS.lemonade.name}</h2>
              <div className="product-meta">
                <span className="price-pill">
                  {formatMoney(PRODUCTS.lemonade.price)} each
                </span>
                <span className="stock-chip">
                  {totals.lemonadeRemaining} cups left
                </span>
              </div>
              <button
                type="button"
                className="sell-btn lemonade"
                onClick={() => requestSale("lemonade")}
                disabled={!canSellProduct("lemonade")}
              >
                Tap to sell
              </button>
            </div>
          </article>

          <article className="product-card slime">
            <img
              src={`${import.meta.env.BASE_URL}assets/slime-product.jpg`}
              alt="Green slime jar and swirl for the slime bundle"
            />
            <div className="product-body">
              <h2>{PRODUCTS.slimeBundle.name}</h2>
              <div className="product-meta">
                <span className="price-pill">
                  3 for {formatMoney(PRODUCTS.slimeBundle.price)}
                </span>
                <span className="stock-chip">
                  {totals.slimeBundlesRemaining} bundles left
                </span>
              </div>
              <p className="safety-note">{PRODUCTS.slimeBundle.safetyWarning}</p>
              <button
                type="button"
                className="sell-btn slime"
                onClick={() => requestSale("slimeBundle")}
                disabled={!canSellProduct("slimeBundle")}
              >
                Tap to sell
              </button>
            </div>
          </article>
        </section>

        <aside className="side-panel">
          <section className="panel" aria-label="Stand totals">
            <h3>Today&apos;s stand</h3>
            <div className="stats-grid">
              <div className="stat">
                <span className="label">Revenue</span>
                <span className="value">{formatMoney(totals.revenue)}</span>
              </div>
              <div className="stat green">
                <span className="label">Profit</span>
                <span className="value">{formatMoney(totals.profit)}</span>
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
                {state.sales.slice(0, 8).map((sale) => (
                  <li key={sale.id}>
                    <span>
                      {sale.productId === "lemonade"
                        ? "Lemonade"
                        : "Slime bundle"}
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

      {pendingProduct && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h3 id="confirm-title">Confirm sale</h3>
            <p>
              Record 1 {pendingProduct.name.toLowerCase()} for{" "}
              <strong>{formatMoney(pendingProduct.price)}</strong>? Inventory
              will drop by 1.
            </p>
            {pending === "slimeBundle" && (
              <div className="warning">{PRODUCTS.slimeBundle.safetyWarning}</div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="cancel"
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
              <button type="button" className="confirm" onClick={confirmSale}>
                Yes, sold!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast${toast ? " show" : ""}`} role="status">
        {toast?.message ?? ""}
      </div>
    </div>
  );
}
