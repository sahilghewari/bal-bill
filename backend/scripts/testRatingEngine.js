const RatingEngine = require('../utils/ratingEngine');

const testRateCard1 = {
  initial_block_seconds: 60,
  next_block_seconds: 60,
  price_per_minute: 0.004,
  connection_fee_flat: 0,
};

const testRateCard2 = {
  initial_block_seconds: 6,
  next_block_seconds: 6,
  price_per_minute: 0.0045,
  connection_fee_flat: 0.05,
};

function assertAlmostEqual(actual, expected, tolerance = 0.0001) {
  return Math.abs(actual - expected) <= tolerance;
}

function logResult(name, condition, result) {
  console.log(name);
  console.log('Result:', result);
  console.log(condition ? '✅ PASS\n' : '❌ FAIL\n');
}

function runTests() {
  console.log('🧪 Testing Rating Engine\n');

  let result = RatingEngine.calculateCharge(65, testRateCard1);
  logResult(
    'Test 1: 60/60 @ $0.0040, 65 seconds (expect 120s billed, $0.0080)',
    result.billableSeconds === 120 && assertAlmostEqual(result.totalCharge, 0.008),
    result
  );

  result = RatingEngine.calculateCharge(65, testRateCard2);
  logResult(
    'Test 2: 6/6 @ $0.0045 + $0.05 fee, 65 seconds (expect 66s, ~$0.05495)',
    result.billableSeconds === 66 && assertAlmostEqual(result.totalCharge, 0.05495, 0.0002),
    result
  );

  result = RatingEngine.calculateCharge(30, testRateCard1);
  logResult(
    'Test 3: duration under initial block should bill minimum 60s ($0.0040)',
    result.billableSeconds === 60 && assertAlmostEqual(result.totalCharge, 0.004),
    result
  );

  result = RatingEngine.calculateCharge(120, testRateCard1);
  logResult(
    'Test 4: exact multiple of step should be billed exactly (120s, $0.0080)',
    result.billableSeconds === 120 && assertAlmostEqual(result.totalCharge, 0.008),
    result
  );

  result = RatingEngine.calculateCharge(30, testRateCard2);
  logResult(
    'Test 5: connection fee applied even when more blocks are billed (~$0.0523)',
    result.billableSeconds === 30 && assertAlmostEqual(result.totalCharge, 0.0523, 0.0002),
    result
  );
}

runTests();
