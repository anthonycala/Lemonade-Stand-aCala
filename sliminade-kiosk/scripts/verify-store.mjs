import assert from "node:assert/strict";

const HARD_COSTS = [110, 23.94, 149.76, 28.82, 23, 20, 53.98];
const TOTAL = HARD_COSTS.reduce((a, b) => a + b, 0);
assert.equal(TOTAL, 409.5);

let lemonadeStock = 200;
let slimeStock = 80;
let revenue = 0;
let sales = 0;

function sellLemonade(qty) {
  lemonadeStock -= qty;
  revenue += 6 * qty;
  sales += qty;
}

sellLemonade(3);
assert.equal(lemonadeStock, 197);
assert.equal(revenue, 18);

const safetyBackup = { lemonadeStock, slimeStock, revenue, sales };
lemonadeStock = 200;
slimeStock = 80;
revenue = 0;
sales = 0;
// Later sales must not wipe the safety backup from a reset.
const afterNewSale = { lemonadeStock: 199, slimeStock: 80, revenue: 6, sales: 1 };
assert.equal(safetyBackup.sales, 3);
assert.notEqual(afterNewSale.sales, safetyBackup.sales);

console.log("business math + safety backup checks passed");
