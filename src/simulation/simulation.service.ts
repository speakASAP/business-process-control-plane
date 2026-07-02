import { Injectable, NotFoundException } from '@nestjs/common';
import {
  getSimulationScenario,
  HOLIDAY_DISCOUNT_PROCESS,
  listSimulationScenarios,
} from './simulation.scenarios';
import {
  SimulationDecisionCode,
  SimulationDecisionReason,
  SimulationOrderSnapshot,
  SimulationOrderSnapshotExpectation,
  SimulationRequest,
  SimulationResponse,
  SimulationScenarioSummary,
  SimulationValidationGate,
} from './simulation.types';

const BASE_WARNINGS = [
  '[MISSING: pricing/cart service quote API; simulation uses deterministic fixture math]',
  '[MISSING: production policy registry; Holiday Discount fixture is embedded in simulation lane]',
];

@Injectable()
export class SimulationService {
  listScenarios(): SimulationScenarioSummary[] {
    return listSimulationScenarios();
  }

  simulateScenario(scenarioId: string): SimulationResponse {
    const scenario = getSimulationScenario(scenarioId);
    if (!scenario) {
      throw new NotFoundException(`Simulation scenario ${scenarioId} was not found`);
    }

    return this.simulateHolidayDiscount(this.cloneRequest(scenario.request));
  }

  simulateHolidayDiscount(request: SimulationRequest): SimulationResponse {
    const warnings = [...BASE_WARNINGS];
    const processStatus = request.processStatus ?? HOLIDAY_DISCOUNT_PROCESS.defaultStatus;
    const killSwitchActive = request.killSwitchActive ?? false;
    const currentDate = this.resolveDate(request.currentDate, warnings);
    const subtotal = this.resolveSubtotal(request.cartSubtotal, warnings);
    const categories = [...(request.productCategoryIds ?? [])].sort();
    const processSupported =
      request.processId === HOLIDAY_DISCOUNT_PROCESS.processId &&
      request.processVersion === HOLIDAY_DISCOUNT_PROCESS.processVersion;
    const activeWindow = this.resolveActiveWindow(currentDate);
    const eligibleCategory = categories.some((category) =>
      HOLIDAY_DISCOUNT_PROCESS.eligibleCategoryIds.includes(category),
    );
    const activeDate = activeWindow === 'active';
    const decisionCode = this.resolveDecisionCode({
      processSupported,
      activeWindow,
      eligibleCategory,
      processStatus,
      killSwitchActive,
    });
    const eligible = decisionCode === 'APPLY_DISCOUNT';
    const discountTotal = eligible
      ? this.roundMoney((subtotal * HOLIDAY_DISCOUNT_PROCESS.discountPercent) / 100)
      : 0;
    const total = this.roundMoney(subtotal - discountTotal);
    const appliedDiscounts = eligible
      ? [
          {
            processId: request.processId,
            processVersion: request.processVersion,
            policyId: HOLIDAY_DISCOUNT_PROCESS.policyId,
            amount: discountTotal,
          },
        ]
      : [];
    const reasons = this.resolveReasons({
      processSupported,
      activeWindow,
      eligibleCategory,
      processStatus,
      killSwitchActive,
      orderSnapshot: request.orderSnapshot,
    });
    const orderSnapshotExpectation = request.orderSnapshot
      ? this.buildOrderSnapshotExpectation(request.orderSnapshot, subtotal, discountTotal, total, warnings)
      : undefined;

    return {
      schemaVersion: 'bpcp.simulation-result.v1',
      scenarioId: request.scenarioId,
      processId: request.processId,
      processVersion: request.processVersion,
      processStatus,
      currentDate: currentDate.toISOString(),
      productCategoryIds: categories,
      activeDate,
      eligibleCategory,
      eligible,
      subtotal,
      discountTotal,
      total,
      appliedDiscounts,
      decision: {
        code: decisionCode,
        eligible,
        reasons,
      },
      validationGates: this.buildValidationGates({
        processSupported,
        activeWindow,
        eligibleCategory,
        processStatus,
        killSwitchActive,
        orderSnapshot: request.orderSnapshot,
      }),
      orderSnapshotExpectation,
      warnings,
    };
  }

  private cloneRequest(request: SimulationRequest): SimulationRequest {
    return JSON.parse(JSON.stringify(request)) as SimulationRequest;
  }

  private resolveDate(currentDate: string | undefined, warnings: string[]): Date {
    const date = new Date(currentDate ?? HOLIDAY_DISCOUNT_PROCESS.defaultDate);
    if (Number.isNaN(date.getTime())) {
      warnings.push('[MISSING: runtime validation pipe rejected invalid currentDate; default date used]');
      return new Date(HOLIDAY_DISCOUNT_PROCESS.defaultDate);
    }

    return date;
  }

  private resolveSubtotal(cartSubtotal: number | undefined, warnings: string[]): number {
    if (cartSubtotal === undefined) {
      return 0;
    }

    if (!Number.isFinite(cartSubtotal) || cartSubtotal < 0) {
      warnings.push('[MISSING: runtime validation pipe rejected invalid cartSubtotal; zero used]');
      return 0;
    }

    return this.roundMoney(cartSubtotal);
  }

  private resolveActiveWindow(currentDate: Date): 'not-started' | 'active' | 'expired' {
    const activeFrom = new Date(HOLIDAY_DISCOUNT_PROCESS.activeFrom);
    const activeTo = new Date(HOLIDAY_DISCOUNT_PROCESS.activeTo);

    if (currentDate < activeFrom) {
      return 'not-started';
    }
    if (currentDate > activeTo) {
      return 'expired';
    }

    return 'active';
  }

  private resolveDecisionCode(input: {
    processSupported: boolean;
    activeWindow: 'not-started' | 'active' | 'expired';
    eligibleCategory: boolean;
    processStatus: SimulationRequest['processStatus'];
    killSwitchActive: boolean;
  }): SimulationDecisionCode {
    if (!input.processSupported) {
      return 'PROCESS_NOT_SUPPORTED';
    }
    if (input.processStatus === 'paused' || input.killSwitchActive) {
      return 'CONTROLLED_OFF';
    }
    if (input.activeWindow === 'not-started') {
      return 'PROCESS_NOT_STARTED';
    }
    if (input.activeWindow === 'expired') {
      return 'PROCESS_EXPIRED';
    }
    if (!input.eligibleCategory) {
      return 'NOT_ELIGIBLE';
    }

    return 'APPLY_DISCOUNT';
  }

  private resolveReasons(input: {
    processSupported: boolean;
    activeWindow: 'not-started' | 'active' | 'expired';
    eligibleCategory: boolean;
    processStatus: SimulationRequest['processStatus'];
    killSwitchActive: boolean;
    orderSnapshot?: SimulationOrderSnapshot;
  }): SimulationDecisionReason[] {
    const reasons: SimulationDecisionReason[] = [];

    reasons.push(input.processSupported ? 'PROCESS_SUPPORTED' : 'PROCESS_NOT_SUPPORTED');
    if (input.activeWindow === 'active') {
      reasons.push('PROCESS_ACTIVE_WINDOW');
    } else if (input.activeWindow === 'expired') {
      reasons.push('PROCESS_EXPIRED');
    } else {
      reasons.push('PROCESS_NOT_STARTED');
    }
    if (input.processStatus === 'paused') {
      reasons.push('PROCESS_PAUSED');
    }
    if (input.killSwitchActive) {
      reasons.push('KILL_SWITCH_ACTIVE');
    }
    reasons.push(input.eligibleCategory ? 'ELIGIBLE_CATEGORY' : 'CATEGORY_NOT_ELIGIBLE');
    if (input.orderSnapshot) {
      reasons.push('ORDER_SNAPSHOT_PRESENT');
    }

    return reasons;
  }

  private buildValidationGates(input: {
    processSupported: boolean;
    activeWindow: 'not-started' | 'active' | 'expired';
    eligibleCategory: boolean;
    processStatus: SimulationRequest['processStatus'];
    killSwitchActive: boolean;
    orderSnapshot?: SimulationOrderSnapshot;
  }): SimulationValidationGate[] {
    const controlledOff = input.processStatus === 'paused' || input.killSwitchActive;
    const gates: SimulationValidationGate[] = [
      {
        code: 'PROCESS_FIXTURE_SUPPORTED',
        severity: input.processSupported ? 'pass' : 'fail',
        passed: input.processSupported,
        message: input.processSupported
          ? 'Simulation request matches the embedded Holiday Discount fixture.'
          : '[MISSING: reusable process fixture registry for non-Holiday Discount scenarios]',
      },
      {
        code: 'PROCESS_ACTIVE_WINDOW',
        severity: input.activeWindow === 'active' ? 'pass' : 'fail',
        passed: input.activeWindow === 'active',
        message:
          input.activeWindow === 'active'
            ? 'Simulation date is inside the Holiday Discount active window.'
            : `Simulation date is ${input.activeWindow} for the Holiday Discount active window.`,
      },
      {
        code: 'CONTROL_STATE_EXECUTABLE',
        severity: controlledOff ? 'fail' : 'pass',
        passed: !controlledOff,
        message: controlledOff
          ? 'Process execution is disabled by pause-like state or kill switch.'
          : 'Process control state allows evaluation.',
      },
      {
        code: 'CATEGORY_ELIGIBLE',
        severity: input.eligibleCategory ? 'pass' : 'fail',
        passed: input.eligibleCategory,
        message: input.eligibleCategory
          ? 'At least one product category is eligible for the Holiday Discount fixture.'
          : 'No product category is eligible for the Holiday Discount fixture.',
      },
      {
        code: 'PRICING_CART_AUTHORITY',
        severity: 'warning',
        passed: false,
        message: '[MISSING: pricing/cart service quote API; simulation is not monetary authority]',
      },
    ];

    if (input.orderSnapshot) {
      gates.push({
        code: 'ORDER_SNAPSHOT_IMMUTABILITY',
        severity: 'warning',
        passed: true,
        message:
          '[MISSING: final orders snapshot field contract] Existing order snapshots must be preserved after quote changes.',
      });
    }

    return gates;
  }

  private buildOrderSnapshotExpectation(
    orderSnapshot: SimulationOrderSnapshot,
    subtotal: number,
    discountTotal: number,
    total: number,
    warnings: string[],
  ): SimulationOrderSnapshotExpectation {
    warnings.push('[MISSING: orders-microservice final immutable discount snapshot field contract]');
    const changed =
      orderSnapshot.subtotal !== subtotal ||
      orderSnapshot.discountTotal !== discountTotal ||
      orderSnapshot.total !== total;

    return {
      immutable: true,
      expectation: 'preserve-existing-order-snapshot',
      status: changed ? 'snapshot-preserved-despite-new-quote' : 'snapshot-preserved',
      snapshot: {
        snapshotId: orderSnapshot.snapshotId,
        subtotal: orderSnapshot.subtotal,
        discountTotal: orderSnapshot.discountTotal,
        total: orderSnapshot.total,
      },
      simulatedQuote: {
        subtotal,
        discountTotal,
        total,
      },
      message:
        'Simulation may produce a fresh quote, but an already captured order discount snapshot remains immutable.',
    };
  }

  private roundMoney(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
