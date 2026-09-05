import assert from "node:assert/strict";

const HARD_COSTS = [110, 23.94, 149.76, 28.82, 23, 20, 53.98];
const TOTAL = HARD_COSTS.reduce((a, b) => a + b, 0);
assert.equal(TOTAL, 409.5);

const PROFIT_GOAL = 1110.5;
assert.ok(PROFIT_GOAL > 0);

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

const restorePoints = [];
restorePoints.unshift({
  sales,
  revenue,
  lemonadeStock,
  slimeStock,
  label: "Before reset",
});
lemonadeStock = 200;
slimeStock = 80;
revenue = 0;
sales = 0;
sellLemonade(1);
restorePoints.unshift({
  sales,
  revenue,
  lemonadeStock,
  slimeStock,
  label: "Before undo",
});
assert.equal(restorePoints.length, 2);
assert.equal(restorePoints[1].sales, 3);

const expectedCash = 40 + revenue;
assert.equal(expectedCash, 46);

console.log("enhancement math checks passed");
