import assert from "node:assert/strict";

const HARD_COSTS = [110, 23.94, 149.76, 28.82, 23, 20, 53.98];
const TOTAL = HARD_COSTS.reduce((a, b) => a + b, 0);
assert.equal(TOTAL, 409.5);

let lemonadeStock = 200;
let slimeStock = 80;
let revenue = 0;

lemonadeStock -= 1;
revenue += 6;
assert.equal(lemonadeStock, 199);
assert.equal(revenue, 6);
assert.equal(revenue - TOTAL, 6 - 409.5);

slimeStock -= 1;
revenue += 4;
assert.equal(slimeStock, 79);
assert.equal(revenue, 10);

console.log("business math checks passed");
