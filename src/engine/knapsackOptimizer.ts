import { KnapsackResult, SavingAction } from '../types';

/**
 * Exact 0/1 Knapsack Dynamic Programming Optimizer
 *
 * Problem Formulation:
 * Maximize Total Monthly Savings: \sum_{i \in S} savings_i
 * Subject to: \sum_{i \in S} cost_i \le Budget
 * Where S \subseteq {1, 2, ..., n} and each item can be chosen at most once (0/1).
 *
 * In addition, any item with zero upfront cost (cost = 0) provides immediate savings
 * without consuming any budget capacity and is automatically included in the optimal plan.
 */
export function optimizeSavingPlan(
  actions: SavingAction[],
  budget: number,
  stepSize: number = 10 // Discretization step size for currency (₹10 gives high performance and precision)
): KnapsackResult {
  // Input validation
  const safeBudget = Math.max(0, Math.floor(budget || 0));

  // Separate zero-cost actions (free wins, always selected) and paid actions
  const freeActions = actions.filter((a) => a.upfrontCost <= 0);
  const paidActions = actions.filter((a) => a.upfrontCost > 0);

  // If budget is 0, return only the zero-cost actions
  if (safeBudget === 0 || paidActions.length === 0) {
    const totalSavings = freeActions.reduce((s, a) => s + a.monthlySavings, 0);
    const totalKwh = freeActions.reduce((s, a) => s + a.monthlyKwhSaved, 0);
    const totalCo2 = freeActions.reduce((s, a) => s + a.monthlyCo2KgSaved, 0);

    return {
      budget: safeBudget,
      selectedActions: freeActions,
      totalUpfrontCost: 0,
      totalMonthlySavings: round(totalSavings, 2),
      totalAnnualSavings: round(totalSavings * 12, 2),
      totalKwhSavedMonthly: round(totalKwh, 2),
      totalCo2SavedMonthly: round(totalCo2, 2),
      unallocatedBudget: safeBudget,
      roiPercentageAnnual: 0,
      paybackMonths: 0,
      dpStepsCount: 0,
    };
  }

  // Determine scale factor for DP table
  // Use stepSize (default 10) to keep DP array dimensions efficient and precise
  const effectiveStep = Math.max(1, stepSize);
  const maxW = Math.floor(safeBudget / effectiveStep);
  const n = paidActions.length;

  // dp[i][w] stores maximum monthly savings using a subset of first i paid actions with budget w * effectiveStep
  // To conserve memory while preserving traceback, we maintain the full 2D table
  // Since n <= 50 and maxW <= 2000 (for budget 20,000 / 10 = 2,000), 50 * 2000 = 100,000 cells (trivial in JS)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(maxW + 1).fill(0));

  let dpStepsCount = 0;

  for (let i = 1; i <= n; i++) {
    const action = paidActions[i - 1];
    const costSteps = Math.ceil(action.upfrontCost / effectiveStep);
    const value = action.monthlySavings;

    for (let w = 0; w <= maxW; w++) {
      dpStepsCount++;
      // Option 1: Do not pick action i
      dp[i][w] = dp[i - 1][w];

      // Option 2: Pick action i if it fits
      if (w >= costSteps) {
        const withItem = dp[i - 1][w - costSteps] + value;
        if (withItem > dp[i][w]) {
          dp[i][w] = withItem;
        }
      }
    }
  }

  // Backtrack to find the exact subset of chosen paid actions
  const selectedPaidActions: SavingAction[] = [];
  let currW = maxW;

  for (let i = n; i >= 1; i--) {
    const action = paidActions[i - 1];
    const costSteps = Math.ceil(action.upfrontCost / effectiveStep);

    // If value came from picking action i
    if (currW >= costSteps && dp[i][currW] !== dp[i - 1][currW]) {
      selectedPaidActions.push(action);
      currW -= costSteps;
    }
  }

  // Reverse so they appear in catalog order
  selectedPaidActions.reverse();

  // Combine free actions + optimal paid actions
  const allSelected = [...freeActions, ...selectedPaidActions];

  const totalUpfrontCost = selectedPaidActions.reduce((sum, a) => sum + a.upfrontCost, 0);
  const totalMonthlySavings = allSelected.reduce((sum, a) => sum + a.monthlySavings, 0);
  const totalAnnualSavings = totalMonthlySavings * 12;
  const totalKwhSavedMonthly = allSelected.reduce((sum, a) => sum + a.monthlyKwhSaved, 0);
  const totalCo2SavedMonthly = allSelected.reduce((sum, a) => sum + a.monthlyCo2KgSaved, 0);
  const unallocatedBudget = Math.max(0, safeBudget - totalUpfrontCost);

  // Return on Investment: Annual Savings / Total Upfront Cost * 100
  const roiPercentageAnnual =
    totalUpfrontCost > 0 ? round((totalAnnualSavings / totalUpfrontCost) * 100, 1) : 999;

  // Payback period in months
  const paybackMonths =
    totalMonthlySavings > 0 ? round(totalUpfrontCost / totalMonthlySavings, 1) : 0;

  return {
    budget: safeBudget,
    selectedActions: allSelected,
    totalUpfrontCost: round(totalUpfrontCost, 2),
    totalMonthlySavings: round(totalMonthlySavings, 2),
    totalAnnualSavings: round(totalAnnualSavings, 2),
    totalKwhSavedMonthly: round(totalKwhSavedMonthly, 2),
    totalCo2SavedMonthly: round(totalCo2SavedMonthly, 2),
    unallocatedBudget: round(unallocatedBudget, 2),
    roiPercentageAnnual,
    paybackMonths,
    dpStepsCount,
  };
}

function round(val: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}
