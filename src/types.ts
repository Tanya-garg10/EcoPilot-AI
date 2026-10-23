export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  defaultTariff: number;
  label: string;
}

export interface TariffConfig {
  currency: string;
  currencyCode: CurrencyCode;
  ratePerKwh: number;
  useSlabRates: boolean;
  fixedMonthlyCharges: number;
  carbonEmissionFactor: number; // kg CO2 per kWh (default ~0.82 for India, ~0.42 for US)
  slabs: Array<{
    maxUnits: number; // upper bound of units in this tier (Infinity for last tier)
    rate: number;
  }>;
}

export type ApplianceCategory =
  | 'Cooling'
  | 'Heating'
  | 'Lighting'
  | 'Kitchen'
  | 'Entertainment'
  | 'Electronics'
  | 'Laundry'
  | 'Other';

export interface Appliance {
  id: string;
  name: string;
  category: ApplianceCategory;
  powerWatts: number;
  hoursPerDay: number;
  daysPerMonth: number;
  quantity: number;
  room?: string;
  isCustom?: boolean;
}

export interface ApplianceCalculation {
  appliance: Appliance;
  dailyKwh: number;
  monthlyKwh: number;
  yearlyKwh: number;
  monthlyCost: number;
  yearlyCost: number;
  monthlyCo2Kg: number;
  percentageOfTotal: number;
}

export interface CalculationSummary {
  totalMonthlyKwh: number;
  totalMonthlyCost: number;
  totalYearlyKwh: number;
  totalYearlyCost: number;
  totalMonthlyCo2Kg: number;
  applianceBreakdown: ApplianceCalculation[];
  highestConsumer?: ApplianceCalculation;
  averageDailyKwh: number;
}

export interface SavingAction {
  id: string;
  title: string;
  category: ApplianceCategory | 'Habit' | 'Insulation' | 'Smart Home';
  description: string;
  upfrontCost: number; // in current currency
  monthlySavings: number; // in current currency
  monthlyKwhSaved: number;
  monthlyCo2KgSaved: number;
  paybackMonths: number;
  difficulty: 'Zero Effort' | 'DIY' | 'Technician';
  tag: 'Quick Win' | 'High ROI' | 'Zero Cost' | 'Long Term';
  assumptions: string;
  applianceMatch?: string; // e.g. "AC", "Fan", "Geyser"
}

export interface KnapsackResult {
  budget: number;
  selectedActions: SavingAction[];
  totalUpfrontCost: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  totalKwhSavedMonthly: number;
  totalCo2SavedMonthly: number;
  unallocatedBudget: number;
  roiPercentageAnnual: number;
  paybackMonths: number;
  dpStepsCount: number;
}

export interface WhatIfModification {
  applianceId: string;
  field: 'hoursPerDay' | 'powerWatts' | 'quantity';
  oldValue: number;
  newValue: number;
}

export interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  modifications: WhatIfModification[];
}

export interface WhatIfComparisonResult {
  baseline: {
    monthlyKwh: number;
    monthlyCost: number;
    monthlyCo2Kg: number;
  };
  simulated: {
    monthlyKwh: number;
    monthlyCost: number;
    monthlyCo2Kg: number;
  };
  delta: {
    monthlyKwh: number;
    monthlyCost: number;
    monthlyCo2Kg: number;
    percentKwh: number;
    percentCost: number;
    annualCostSavings: number;
  };
}

export interface TestResult {
  id: string;
  name: string;
  category: 'Formulas' | 'Zero Usage' | 'Validation' | 'Knapsack DP' | 'What-If';
  passed: boolean;
  message: string;
  expected: string | number;
  actual: string | number;
}
