import { Appliance, TariffConfig, WhatIfComparisonResult, WhatIfModification } from '../types';
import { calculateSummary, round } from './energyCalculator';

/**
 * Simulates the effect of user behavior and hardware modifications
 * against an established appliance baseline.
 */
export function simulateWhatIf(
  baselineAppliances: Appliance[],
  modifications: WhatIfModification[],
  tariff: TariffConfig,
  customSimulatedTariff?: TariffConfig
): {
  comparison: WhatIfComparisonResult;
  simulatedAppliances: Appliance[];
} {
  // Deep clone appliances for simulation
  const simulatedAppliances: Appliance[] = baselineAppliances.map((app) => ({ ...app }));

  // Apply all modifications
  modifications.forEach((mod) => {
    const target = simulatedAppliances.find((a) => a.id === mod.applianceId);
    if (target) {
      if (mod.field === 'hoursPerDay') {
        target.hoursPerDay = Math.min(24, Math.max(0, mod.newValue));
      } else if (mod.field === 'powerWatts') {
        target.powerWatts = Math.max(0, mod.newValue);
      } else if (mod.field === 'quantity') {
        target.quantity = Math.max(0, Math.floor(mod.newValue));
      }
    }
  });

  // Calculate baseline summary
  const baselineSummary = calculateSummary(baselineAppliances, tariff);

  // Calculate simulated summary (using simulated tariff if provided, else current tariff)
  const simTariff = customSimulatedTariff || tariff;
  const simulatedSummary = calculateSummary(simulatedAppliances, simTariff);

  const baselineKwh = baselineSummary.totalMonthlyKwh;
  const baselineCost = baselineSummary.totalMonthlyCost;
  const baselineCo2 = baselineSummary.totalMonthlyCo2Kg;

  const simKwh = simulatedSummary.totalMonthlyKwh;
  const simCost = simulatedSummary.totalMonthlyCost;
  const simCo2 = simulatedSummary.totalMonthlyCo2Kg;

  const deltaKwh = round(baselineKwh - simKwh, 2);
  const deltaCost = round(baselineCost - simCost, 2);
  const deltaCo2 = round(baselineCo2 - simCo2, 2);

  const percentKwh = baselineKwh > 0 ? round((deltaKwh / baselineKwh) * 100, 1) : 0;
  const percentCost = baselineCost > 0 ? round((deltaCost / baselineCost) * 100, 1) : 0;
  const annualCostSavings = round(deltaCost * 12, 2);

  return {
    simulatedAppliances,
    comparison: {
      baseline: {
        monthlyKwh: baselineKwh,
        monthlyCost: baselineCost,
        monthlyCo2Kg: baselineCo2,
      },
      simulated: {
        monthlyKwh: simKwh,
        monthlyCost: simCost,
        monthlyCo2Kg: simCo2,
      },
      delta: {
        monthlyKwh: deltaKwh,
        monthlyCost: deltaCost,
        monthlyCo2Kg: deltaCo2,
        percentKwh,
        percentCost,
        annualCostSavings,
      },
    },
  };
}
