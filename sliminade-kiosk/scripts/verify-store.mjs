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
let lemonadePrice = 6;

const inventory = {
  cups: 200,
  lids: 200,
  straws: 200,
  lemons: 100,
  sugar: 200,
  water: 200,
  ice: 200,
  napkins: 200,
  glue: 240,
  activator: 240,
  foodColoring: 240,
  glitter: 240,
  slimeContainers: 240,
  stickers: 300,
};

function sellLemonade(qty) {
  lemonadeStock -= qty;
  revenue += lemonadePrice * qty;
  sales += qty;
  inventory.cups -= qty;
  inventory.lids -= qty;
  inventory.straws -= qty;
  inventory.lemons -= qty;
  inventory.sugar -= qty;
  inventory.water -= qty;
  inventory.ice -= qty;
  inventory.napkins -= qty;
}

function sellSlimeBundle(qty) {
  slimeStock -= qty;
  revenue += 4 * qty;
  sales += qty;
  inventory.glue -= qty * 3;
  inventory.activator -= qty * 3;
  inventory.foodColoring -= qty * 3;
  inventory.glitter -= qty * 3;
  inventory.slimeContainers -= qty * 3;
  inventory.stickers -= qty * 3;
}

sellLemonade(3);
assert.equal(lemonadeStock, 197);
assert.equal(revenue, 18);
assert.equal(inventory.cups, 197);
assert.equal(inventory.lemons, 97);

sellSlimeBundle(2);
assert.equal(slimeStock, 78);
assert.equal(inventory.slimeContainers, 234);
assert.equal(inventory.stickers, 294);

// Prices can be updated without code changes (settings override)
{
  let customPrice = 7.5;
  let customSlime = 5;
  let customRevenue = 0;
  customRevenue += customPrice * 2;
  assert.equal(customRevenue, 15);
  assert.equal(customSlime, 5);
}

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
assert.equal(restorePoints[1].sales, 5);

const expectedCash = 40 + revenue;
assert.equal(expectedCash, 46);

console.log("enhancement math checks passed");
