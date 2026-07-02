import {
  SimulationProcessFixture,
  SimulationScenarioDefinition,
  SimulationScenarioId,
  SimulationScenarioSummary,
} from './simulation.types';

export const HOLIDAY_DISCOUNT_PROCESS: SimulationProcessFixture = {
  processId: 'holiday-discount-2026',
  processVersion: 1,
  policyId: 'holiday-10-percent-selected-categories',
  activeFrom: '2026-12-01T00:00:00Z',
  activeTo: '2027-01-07T23:59:59Z',
  eligibleCategoryIds: ['christmas-gifts', 'winter-season'],
  discountPercent: 10,
  defaultDate: '2026-12-24T12:00:00Z',
  defaultStatus: 'active',
};

const COMMON_WARNINGS = [
  '[MISSING: pricing/cart service quote API; simulation uses deterministic fixture math]',
  '[MISSING: production policy registry; Holiday Discount fixture is embedded in simulation lane]',
];

export const HOLIDAY_DISCOUNT_SCENARIOS: SimulationScenarioDefinition[] = [
  {
    id: 'holiday-discount-eligible-category',
    title: 'Holiday Discount eligible category',
    purpose: 'Applies the 10 percent Holiday Discount when the category and date are eligible.',
    request: {
      scenarioId: 'holiday-discount-eligible-category',
      processId: HOLIDAY_DISCOUNT_PROCESS.processId,
      processVersion: HOLIDAY_DISCOUNT_PROCESS.processVersion,
      productCategoryIds: ['christmas-gifts'],
      cartSubtotal: 1000,
      currentDate: '2026-12-24T12:00:00Z',
      processStatus: 'active',
    },
    expected: {
      decision: 'APPLY_DISCOUNT',
      eligible: true,
      activeDate: true,
      eligibleCategory: true,
      discountTotal: 100,
      total: 900,
      reasons: ['PROCESS_SUPPORTED', 'PROCESS_ACTIVE_WINDOW', 'ELIGIBLE_CATEGORY'],
    },
    warnings: COMMON_WARNINGS,
  },
  {
    id: 'holiday-discount-ineligible-category',
    title: 'Holiday Discount ineligible category',
    purpose: 'Rejects the discount when the product categories do not match the policy fixture.',
    request: {
      scenarioId: 'holiday-discount-ineligible-category',
      processId: HOLIDAY_DISCOUNT_PROCESS.processId,
      processVersion: HOLIDAY_DISCOUNT_PROCESS.processVersion,
      productCategoryIds: ['clearance'],
      cartSubtotal: 1000,
      currentDate: '2026-12-24T12:00:00Z',
      processStatus: 'active',
    },
    expected: {
      decision: 'NOT_ELIGIBLE',
      eligible: false,
      activeDate: true,
      eligibleCategory: false,
      discountTotal: 0,
      total: 1000,
      reasons: ['PROCESS_SUPPORTED', 'PROCESS_ACTIVE_WINDOW', 'CATEGORY_NOT_ELIGIBLE'],
    },
    warnings: COMMON_WARNINGS,
  },
  {
    id: 'holiday-discount-expired-process',
    title: 'Holiday Discount expired process',
    purpose: 'Rejects the discount after the configured process window has ended.',
    request: {
      scenarioId: 'holiday-discount-expired-process',
      processId: HOLIDAY_DISCOUNT_PROCESS.processId,
      processVersion: HOLIDAY_DISCOUNT_PROCESS.processVersion,
      productCategoryIds: ['christmas-gifts'],
      cartSubtotal: 1000,
      currentDate: '2027-01-08T00:00:00Z',
      processStatus: 'active',
    },
    expected: {
      decision: 'PROCESS_EXPIRED',
      eligible: false,
      activeDate: false,
      eligibleCategory: true,
      discountTotal: 0,
      total: 1000,
      reasons: ['PROCESS_SUPPORTED', 'PROCESS_EXPIRED', 'ELIGIBLE_CATEGORY'],
    },
    warnings: COMMON_WARNINGS,
  },
  {
    id: 'holiday-discount-paused-kill-switch',
    title: 'Holiday Discount paused or killed',
    purpose: 'Rejects the discount when a pause-like control state or kill switch disables execution.',
    request: {
      scenarioId: 'holiday-discount-paused-kill-switch',
      processId: HOLIDAY_DISCOUNT_PROCESS.processId,
      processVersion: HOLIDAY_DISCOUNT_PROCESS.processVersion,
      productCategoryIds: ['christmas-gifts'],
      cartSubtotal: 1000,
      currentDate: '2026-12-24T12:00:00Z',
      processStatus: 'paused',
      killSwitchActive: true,
    },
    expected: {
      decision: 'CONTROLLED_OFF',
      eligible: false,
      activeDate: true,
      eligibleCategory: true,
      discountTotal: 0,
      total: 1000,
      reasons: [
        'PROCESS_SUPPORTED',
        'PROCESS_ACTIVE_WINDOW',
        'PROCESS_PAUSED',
        'KILL_SWITCH_ACTIVE',
        'ELIGIBLE_CATEGORY',
      ],
    },
    warnings: COMMON_WARNINGS,
  },
  {
    id: 'holiday-discount-order-snapshot-immutable',
    title: 'Holiday Discount order snapshot immutability',
    purpose:
      'Shows that an existing order snapshot remains the authority even when a later simulation quote changes.',
    request: {
      scenarioId: 'holiday-discount-order-snapshot-immutable',
      processId: HOLIDAY_DISCOUNT_PROCESS.processId,
      processVersion: HOLIDAY_DISCOUNT_PROCESS.processVersion,
      productCategoryIds: ['christmas-gifts'],
      cartSubtotal: 1200,
      currentDate: '2026-12-24T12:00:00Z',
      processStatus: 'active',
      orderSnapshot: {
        snapshotId: 'order-snapshot-holiday-001',
        capturedAt: '2026-12-24T10:15:00Z',
        subtotal: 1000,
        discountTotal: 100,
        total: 900,
        appliedDiscounts: [
          {
            processId: HOLIDAY_DISCOUNT_PROCESS.processId,
            processVersion: HOLIDAY_DISCOUNT_PROCESS.processVersion,
            policyId: HOLIDAY_DISCOUNT_PROCESS.policyId,
            amount: 100,
          },
        ],
      },
    },
    expected: {
      decision: 'APPLY_DISCOUNT',
      eligible: true,
      activeDate: true,
      eligibleCategory: true,
      discountTotal: 120,
      total: 1080,
      reasons: [
        'PROCESS_SUPPORTED',
        'PROCESS_ACTIVE_WINDOW',
        'ELIGIBLE_CATEGORY',
        'ORDER_SNAPSHOT_PRESENT',
      ],
      orderSnapshotImmutable: true,
    },
    warnings: [
      ...COMMON_WARNINGS,
      '[MISSING: orders-microservice final immutable discount snapshot field contract]',
    ],
  },
];

export function listSimulationScenarios(): SimulationScenarioSummary[] {
  return HOLIDAY_DISCOUNT_SCENARIOS.map(({ id, title, purpose, expected, warnings }) => ({
    id,
    title,
    purpose,
    expected,
    warnings,
  }));
}

export function getSimulationScenario(scenarioId: string): SimulationScenarioDefinition | undefined {
  return HOLIDAY_DISCOUNT_SCENARIOS.find((scenario) => scenario.id === scenarioId);
}

export function isSimulationScenarioId(scenarioId: string): scenarioId is SimulationScenarioId {
  return HOLIDAY_DISCOUNT_SCENARIOS.some((scenario) => scenario.id === scenarioId);
}
