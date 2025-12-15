const { readFileSync } = require('fs');

// Load prize configuration
const prizeConfig = JSON.parse(readFileSync('./backend/prize-config.json', 'utf8'));

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

// Test the prize system with 1000 simulations
console.log('Testing prize system with 1000 simulations...\n');

const results = {
  'Mitos Mutasi': 0,
  'Mitos': 0,
  'Zonk': 0
};

const iterations = 1000;
for (let i = 0; i < iterations; i++) {
  const result = calculatePrizeResult(prizeConfig.items);
  results[result.label]++;
}

console.log('Simulation Results:');
console.log(`Total spins: ${iterations}`);
console.log('\nActual results:');
Object.entries(results).forEach(([label, count]) => {
  const percentage = ((count / iterations) * 100).toFixed(1);
  console.log(`${label}: ${count} times (${percentage}%)`);
});

console.log('\nExpected probabilities:');
prizeConfig.items.forEach(item => {
  console.log(`${item.label}: ${item.prob}%`);
});

console.log('\nTest completed!');