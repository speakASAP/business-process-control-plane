import { Injectable } from '@nestjs/common';

export interface SimulationRequest {
  processId: string;
  processVersion: number;
  productCategoryIds?: string[];
  cartSubtotal?: number;
  currentDate?: string;
}

@Injectable()
export class SimulationService {
  simulateHolidayDiscount(request: SimulationRequest) {
    const categories = request.productCategoryIds ?? [];
    const subtotal = request.cartSubtotal ?? 0;
    const date = request.currentDate ? new Date(request.currentDate) : new Date();
    const starts = new Date('2026-12-01T00:00:00Z');
    const ends = new Date('2027-01-07T23:59:59Z');
    const eligibleCategory = categories.some((category) =>
      ['christmas-gifts', 'winter-season'].includes(category),
    );
    const activeDate = date >= starts && date <= ends;
    const eligible = request.processId === 'holiday-discount-2026' && activeDate && eligibleCategory;
    const discountTotal = eligible ? Math.round(subtotal * 0.1) : 0;

    return {
      schemaVersion: 'bpcp.simulation-result.v1',
      processId: request.processId,
      processVersion: request.processVersion,
      eligible,
      activeDate,
      eligibleCategory,
      subtotal,
      discountTotal,
      total: subtotal - discountTotal,
      appliedDiscounts: eligible
        ? [
            {
              processId: request.processId,
              processVersion: request.processVersion,
              policyId: 'holiday-10-percent-selected-categories',
              amount: discountTotal,
            },
          ]
        : [],
      warnings: ['simulation is deterministic skeleton logic, not production pricing authority'],
    };
  }
}
