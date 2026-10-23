import { Appliance, TariffConfig, TestResult } from '../types';
import { DEFAULT_SAVING_ACTIONS } from './actionCatalog';
import { calculateApplianceEnergy, calculateSummary, calculateUnitsCost, DEFAULT_TARIFF, validateAppliance } from './energyCalculator';
import { optimizeSavingPlan } from './knapsackOptimizer';
import { simulateWhatIf } from './whatIfSimulator';

/**
 * Automated test suite covering:
 * 1. Exact mathematical formulas (e.g. Prompt example: 1,500 W AC × 6h × 30d = 270 kWh, ₹8/unit = ₹2,160)
 * 2. Zero usage handling (0 watts, 0 hours)
 * 3. Boundary & invalid inputs validation
 * 4. 0/1 Knapsack optimizer with various budgets (₹0, ₹500, ₹1500, ₹5000)
 * 5. What-if scenario comparison calculations
 */
export function runAllAutomatedTests(): {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  // TEST 1: Specific Formula Verification from Prompt
  // "1,500 W AC × 6 hours/day × 30 days = 270 kWh/month. ₹8/unit tariff par estimated cost ₹2,160/month hogi."
  {
    const acAppliance: Appliance = {
      id: 'test-ac',
      name: '1.5T AC',
      category: 'Cooling',
      powerWatts: 1500,
      hoursPerDay: 6,
      daysPerMonth: 30,
      quantity: 1,
    };
    const customTariff: TariffConfig = {
      ...DEFAULT_TARIFF,
      ratePerKwh: 8.0,
      useSlabRates: false,
      fixedMonthlyCharges: 0,
    };
    const calc = calculateApplianceEnergy(acAppliance, customTariff);

    const kwhPassed = calc.monthlyKwh === 270;
    results.push({
      id: 'formula-ac-kwh',
      name: 'AC Consumption Formula (1500W × 6h × 30d = 270 kWh)',
      category: 'Formulas',
      passed: kwhPassed,
      message: kwhPassed ? 'Exact match: 270 kWh/month' : `Failed: got ${calc.monthlyKwh}`,
      expected: 270,
      actual: calc.monthlyKwh,
    });

    const costPassed = calc.monthlyCost === 2160;
    results.push({
      id: 'formula-ac-cost',
      name: 'AC Electricity Cost Formula (270 kWh × ₹8 = ₹2,160)',
      category: 'Formulas',
      passed: costPassed,
      message: costPassed ? 'Exact match: ₹2,160/month' : `Failed: got ${calc.monthlyCost}`,
      expected: 2160,
      actual: calc.monthlyCost,
    });
  }

  // TEST 2: Zero Usage Handling
  {
    const zeroAppliance: Appliance = {
      id: 'zero-app',
      name: 'Unplugged Appliance',
      category: 'Other',
      powerWatts: 0,
      hoursPerDay: 0,
      daysPerMonth: 30,
      quantity: 1,
    };
    const calc = calculateApplianceEnergy(zeroAppliance, { ...DEFAULT_TARIFF, fixedMonthlyCharges: 0 });
    const passed = calc.dailyKwh === 0 && calc.monthlyKwh === 0 && calc.monthlyCost === 0;
    results.push({
      id: 'zero-usage',
      name: 'Zero Usage Appliance (0W, 0h yields 0 kWh & 0 cost)',
      category: 'Zero Usage',
      passed,
      message: passed ? 'Handled 0 watts and 0 hours cleanly without NaN' : 'Failed on zero values',
      expected: '0 kWh, ₹0',
      actual: `${calc.monthlyKwh} kWh, ₹${calc.monthlyCost}`,
    });
  }

  // TEST 3: Validation - Negative & Exceeding bounds
  {
    const valNegative = validateAppliance({ name: 'Bad Fan', powerWatts: -50, hoursPerDay: 28 });
    const passed = !valNegative.valid && valNegative.errors.length >= 2;
    results.push({
      id: 'validation-bounds',
      name: 'Input Validation (Rejects negative watts & > 24 hours/day)',
      category: 'Validation',
      passed,
      message: passed ? 'Successfully rejected negative power and 28 hrs/day' : 'Failed to catch invalid input',
      expected: 'Invalid with error flags',
      actual: valNegative.valid ? 'Accepted bad input' : `Rejected with ${valNegative.errors.length} errors`,
    });
  }

  // TEST 4: Knapsack Budget Optimizer - Zero Budget (returns zero-cost habit actions)
  {
    const optZero = optimizeSavingPlan(DEFAULT_SAVING_ACTIONS, 0);
    const zeroCostOnly = optZero.selectedActions.every((a) => a.upfrontCost === 0);
    const passed = optZero.totalUpfrontCost === 0 && optZero.totalMonthlySavings > 0 && zeroCostOnly;
    results.push({
      id: 'knapsack-zero-budget',
      name: 'Knapsack Optimizer (Zero Budget selects zero-cost actions without expense)',
      category: 'Knapsack DP',
      passed,
      message: passed
        ? `Identified ${optZero.selectedActions.length} free actions saving ₹${optZero.totalMonthlySavings}/month`
        : 'Failed zero budget test',
      expected: 'Upfront Cost: 0, Savings > 0',
      actual: `Cost: ₹${optZero.totalUpfrontCost}, Savings: ₹${optZero.totalMonthlySavings}`,
    });
  }

  // TEST 5: Knapsack Budget Optimizer - Budget ₹500 (from Prompt step 2)
  {
    const opt500 = optimizeSavingPlan(DEFAULT_SAVING_ACTIONS, 500);
    const withinBudget = opt500.totalUpfrontCost <= 500;
    // Under ₹500, should pick the best ROI combinations (e.g. AC Deep Clean ₹450 saves ₹310, or fridge tuneup ₹250 + aerator ₹350)
    const passed = withinBudget && opt500.totalMonthlySavings >= 310;
    results.push({
      id: 'knapsack-budget-500',
      name: 'Knapsack Optimizer (₹500 Budget maximizes monthly savings within ₹500 limit)',
      category: 'Knapsack DP',
      passed,
      message: passed
        ? `Selected ${opt500.selectedActions.length} actions costing ₹${opt500.totalUpfrontCost} saving ₹${opt500.totalMonthlySavings}/mo`
        : 'Violated budget constraint',
      expected: 'Cost <= ₹500, Optimal Monthly Savings',
      actual: `Cost: ₹${opt500.totalUpfrontCost}, Savings: ₹${opt500.totalMonthlySavings}`,
    });
  }

  // TEST 6: Knapsack Budget Optimizer - High Budget (all actions fit)
  {
    const totalAllPaidCost = DEFAULT_SAVING_ACTIONS.filter((a) => a.upfrontCost > 0).reduce(
      (sum, a) => sum + a.upfrontCost,
      0
    );
    const optLarge = optimizeSavingPlan(DEFAULT_SAVING_ACTIONS, 50000);
    const passed =
      optLarge.selectedActions.length === DEFAULT_SAVING_ACTIONS.length &&
      optLarge.totalUpfrontCost === totalAllPaidCost;
    results.push({
      id: 'knapsack-unconstrained',
      name: 'Knapsack Optimizer (Unconstrained budget includes all viable actions)',
      category: 'Knapsack DP',
      passed,
      message: passed
        ? `All ${optLarge.selectedActions.length} actions selected without overflow`
        : 'Did not select all actions',
      expected: `${DEFAULT_SAVING_ACTIONS.length} actions`,
      actual: `${optLarge.selectedActions.length} actions`,
    });
  }

  // TEST 7: What-If Simulator Recalculation
  {
    const baseAppliances: Appliance[] = [
      {
        id: 'ac-test',
        name: 'AC Unit',
        category: 'Cooling',
        powerWatts: 1500,
        hoursPerDay: 8,
        daysPerMonth: 30,
        quantity: 1,
      },
    ];
    // Reduce AC from 8 hours/day to 5 hours/day
    const sim = simulateWhatIf(
      baseAppliances,
      [{ applianceId: 'ac-test', field: 'hoursPerDay', oldValue: 8, newValue: 5 }],
      { ...DEFAULT_TARIFF, ratePerKwh: 8.0, useSlabRates: false, fixedMonthlyCharges: 0 }
    );

    // Baseline: 1.5 * 8 * 30 = 360 kWh = ₹2,880
    // Simulated: 1.5 * 5 * 30 = 225 kWh = ₹1,800
    // Delta: 135 kWh saved = ₹1,080 saved
    const passed =
      sim.comparison.baseline.monthlyKwh === 360 &&
      sim.comparison.simulated.monthlyKwh === 225 &&
      sim.comparison.delta.monthlyCost === 1080;

    results.push({
      id: 'whatif-simulation',
      name: 'What-If Engine (Accurately recalculates dynamic baseline & simulation)',
      category: 'What-If',
      passed,
      message: passed
        ? `Accurate: Baseline 360 kWh (₹2880), Simulated 225 kWh (₹1800), Savings ₹1080`
        : 'What-If calculation mismatch',
      expected: 'Delta Savings: ₹1,080/month',
      actual: `Delta Savings: ₹${sim.comparison.delta.monthlyCost}/month`,
    });
  }

  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed).length;

  return {
    allPassed: failedTests === 0,
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
  };
}
