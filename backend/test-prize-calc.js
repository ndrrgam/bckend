import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('./prize-config.json', 'utf8'));

function calculatePrizeResult(items) {
  const random = Math.random() * 100;
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.prob;
    if (random <= cumulative) {
      return item;
    }
  }
  return items[items.length - 1];
}

console.log('Testing prize calculation (1000 simulations):');
const results = {};
for (let i = 0; i < 1000; i++) {
  const result = calculatePrizeResult(config.items);
  results[result.label] = (results[result.label] || 0) + 1;
}

for (const [label, count] of Object.entries(results)) {
  console.log(`${label}: ${count} kali (${(count/10).toFixed(1)}%)`);
}