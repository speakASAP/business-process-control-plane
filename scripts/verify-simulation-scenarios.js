#!/usr/bin/env node

const { SimulationService } = require('../dist/simulation/simulation.service');
const { HOLIDAY_DISCOUNT_SCENARIOS } = require('../dist/simulation/simulation.scenarios');

function assertEqual(label, actual, expected, failures) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(label, actual, expectedValues, failures) {
  for (const expected of expectedValues) {
    if (!actual.includes(expected)) {
      failures.push(`${label}: missing ${expected}`);
    }
  }
}

function verifyScenario(service, scenario) {
  const response = service.simulateScenario(scenario.id);
  const expected = scenario.expected;
  const failures = [];

  assertEqual('scenarioId', response.scenarioId, scenario.id, failures);
  assertEqual('decision', response.decision.code, expected.decision, failures);
  assertEqual('eligible', response.eligible, expected.eligible, failures);
  assertEqual('activeDate', response.activeDate, expected.activeDate, failures);
  assertEqual('eligibleCategory', response.eligibleCategory, expected.eligibleCategory, failures);
  assertEqual('discountTotal', response.discountTotal, expected.discountTotal, failures);
  assertEqual('total', response.total, expected.total, failures);
  assertIncludes('reasons', response.decision.reasons, expected.reasons, failures);
  assertIncludes('warnings', response.warnings, scenario.warnings, failures);

  if (expected.orderSnapshotImmutable) {
    assertEqual(
      'orderSnapshotExpectation.immutable',
      response.orderSnapshotExpectation && response.orderSnapshotExpectation.immutable,
      true,
      failures,
    );
    assertEqual(
      'orderSnapshotExpectation.status',
      response.orderSnapshotExpectation && response.orderSnapshotExpectation.status,
      'snapshot-preserved-despite-new-quote',
      failures,
    );
  }

  return failures;
}

function main() {
  const service = new SimulationService();
  const allFailures = [];

  for (const scenario of HOLIDAY_DISCOUNT_SCENARIOS) {
    const failures = verifyScenario(service, scenario);
    if (failures.length > 0) {
      allFailures.push(`${scenario.id}\n  - ${failures.join('\n  - ')}`);
    } else {
      console.log(`PASS ${scenario.id}`);
    }
  }

  if (allFailures.length > 0) {
    console.error(allFailures.join('\n'));
    process.exit(1);
  }

  console.log(`Verified ${HOLIDAY_DISCOUNT_SCENARIOS.length} simulation scenarios.`);
}

main();
