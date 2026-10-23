import { Appliance, ApplianceCalculation, CalculationSummary, CurrencyCode, CurrencyConfig, TariffConfig } from '../types';

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    defaultTariff: 8.0,
    label: 'Indian Rupee (₹)',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    defaultTariff: 0.16,
    label: 'US Dollar ($)',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    defaultTariff: 0.28,
    label: 'Euro (€)',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    defaultTariff: 0.29,
    label: 'British Pound (£)',
  },
};

export const DEFAULT_TARIFF: TariffConfig = {
  currency: '₹',
  currencyCode: 'INR',
  ratePerKwh: 8.0,
  useSlabRates: false,
  fixedMonthlyCharges: 80,
  carbonEmissionFactor: 0.82, // India average ~0.82 kg CO2 / kWh
  slabs: [
    { maxUnits: 100, rate: 4.5 },
    { maxUnits: 200, rate: 6.5 },
    { maxUnits: 400, rate: 8.0 },
    { maxUnits: Infinity, rate: 9.5 },
  ],
};

export const DEFAULT_APPLIANCES: Appliance[] = [
  {
    id: 'ac-1',
    name: '1.5 Ton Split AC (Bedroom)',
    category: 'Cooling',
    powerWatts: 1500,
    hoursPerDay: 6,
    daysPerMonth: 30,
    quantity: 1,
    room: 'Bedroom',
  },
  {
    id: 'fan-living',
    name: 'Ceiling Fan (Standard Induction)',
    category: 'Cooling',
    powerWatts: 75,
    hoursPerDay: 12,
    daysPerMonth: 30,
    quantity: 3,
    room: 'Living Room',
  },
  {
    id: 'fridge-1',
    name: 'Double Door Refrigerator (350L)',
    category: 'Kitchen',
    powerWatts: 250,
    hoursPerDay: 10, // compressor runtime cycle ~10h/day
    daysPerMonth: 30,
    quantity: 1,
    room: 'Kitchen',
  },
  {
    id: 'geyser-1',
    name: 'Storage Water Heater / Geyser',
    category: 'Heating',
    powerWatts: 2000,
    hoursPerDay: 1.5,
    daysPerMonth: 30,
    quantity: 1,
    room: 'Bathroom',
  },
  {
    id: 'led-bulbs',
    name: 'LED Bulbs (9W)',
    category: 'Lighting',
    powerWatts: 9,
    hoursPerDay: 6,
    daysPerMonth: 30,
    quantity: 8,
    room: 'Whole House',
  },
  {
    id: 'tv-living',
    name: '55" 4K Smart TV',
    category: 'Entertainment',
    powerWatts: 110,
    hoursPerDay: 4,
    daysPerMonth: 30,
    quantity: 1,
    room: 'Living Room',
  },
  {
    id: 'washing-machine',
    name: 'Front Load Washing Machine',
    category: 'Laundry',
    powerWatts: 500,
    hoursPerDay: 1,
    daysPerMonth: 15,
    quantity: 1,
    room: 'Utility',
  },
  {
    id: 'laptop-work',
    name: 'Work Laptop & Monitor Station',
    category: 'Electronics',
    powerWatts: 130,
    hoursPerDay: 8,
    daysPerMonth: 22,
    quantity: 1,
    room: 'Study / Home Office',
  },
];

/**
 * Validates appliance input values against physically plausible ranges
 */
export function validateAppliance(appliance: Partial<Appliance>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!appliance.name || appliance.name.trim().length === 0) {
    errors.push('Appliance name is required');
  }

  if (appliance.powerWatts === undefined || isNaN(appliance.powerWatts) || appliance.powerWatts < 0) {
    errors.push('Power (Watts) must be a non-negative number');
  } else if (appliance.powerWatts > 25000) {
    errors.push('Power exceeds residential threshold (25,000 W)');
  }

  if (appliance.hoursPerDay === undefined || isNaN(appliance.hoursPerDay) || appliance.hoursPerDay < 0) {
    errors.push('Hours per day must be a non-negative number');
  } else if (appliance.hoursPerDay > 24) {
    errors.push('Hours per day cannot exceed 24 hours');
  }

  if (appliance.daysPerMonth === undefined || isNaN(appliance.daysPerMonth) || appliance.daysPerMonth < 0) {
    errors.push('Days per month must be a non-negative number');
  } else if (appliance.daysPerMonth > 31) {
    errors.push('Days per month cannot exceed 31 days');
  }

  if (appliance.quantity === undefined || isNaN(appliance.quantity) || appliance.quantity < 0) {
    errors.push('Quantity must be a non-negative number');
  } else if (appliance.quantity > 500) {
    errors.push('Quantity exceeds reasonable limit (500)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Core mathematical energy formula:
 * Energy (kWh) = (Power (Watts) × Hours/Day × Days/Month × Quantity) / 1000
 */
export function calculateApplianceEnergy(
  appliance: Appliance,
  tariff: TariffConfig = DEFAULT_TARIFF
): ApplianceCalculation {
  // Safe clamped values to prevent NaN or extreme negative numbers
  const safeWatts = Math.max(0, appliance.powerWatts || 0);
  const safeHours = Math.min(24, Math.max(0, appliance.hoursPerDay || 0));
  const safeDays = Math.min(31, Math.max(0, appliance.daysPerMonth || 30));
  const safeQty = Math.max(0, appliance.quantity || 1);

  // Daily kWh
  const dailyKwh = (safeWatts * safeHours * safeQty) / 1000;

  // Monthly kWh
  const monthlyKwh = (safeWatts * safeHours * safeDays * safeQty) / 1000;

  // Yearly kWh (approx 12.17 months or proportional)
  const yearlyKwh = monthlyKwh * 12;

  // Cost calculation
  const monthlyCost = calculateUnitsCost(monthlyKwh, tariff, false);
  const yearlyCost = monthlyCost * 12;

  // CO2 footprint (kg CO2 = kWh × emission factor)
  const monthlyCo2Kg = monthlyKwh * tariff.carbonEmissionFactor;

  return {
    appliance,
    dailyKwh: round(dailyKwh, 3),
    monthlyKwh: round(monthlyKwh, 2),
    yearlyKwh: round(yearlyKwh, 1),
    monthlyCost: round(monthlyCost, 2),
    yearlyCost: round(yearlyCost, 2),
    monthlyCo2Kg: round(monthlyCo2Kg, 2),
    percentageOfTotal: 0, // Populated in summary
  };
}

/**
 * Calculates cost of electricity given units (kWh), supporting flat tariff or tiered slab pricing
 */
export function calculateUnitsCost(
  kwh: number,
  tariff: TariffConfig = DEFAULT_TARIFF,
  includeFixedCharges: boolean = false
): number {
  if (kwh <= 0) {
    return includeFixedCharges ? tariff.fixedMonthlyCharges : 0;
  }

  let energyCost = 0;

  if (!tariff.useSlabRates || !tariff.slabs || tariff.slabs.length === 0) {
    // Flat rate
    energyCost = kwh * tariff.ratePerKwh;
  } else {
    // Progressive slab pricing
    let remainingUnits = kwh;
    let previousTierLimit = 0;

    for (const slab of tariff.slabs) {
      if (remainingUnits <= 0) break;

      const tierCapacity = slab.maxUnits === Infinity ? remainingUnits : slab.maxUnits - previousTierLimit;
      const unitsInThisTier = Math.min(remainingUnits, tierCapacity);

      energyCost += unitsInThisTier * slab.rate;
      remainingUnits -= unitsInThisTier;
      previousTierLimit = slab.maxUnits;
    }
  }

  if (includeFixedCharges) {
    energyCost += tariff.fixedMonthlyCharges;
  }

  return energyCost;
}

/**
 * Generates an aggregated calculation summary across all active appliances
 */
export function calculateSummary(
  appliances: Appliance[],
  tariff: TariffConfig = DEFAULT_TARIFF
): CalculationSummary {
  const breakdown = appliances.map((app) => calculateApplianceEnergy(app, tariff));

  const totalMonthlyKwh = breakdown.reduce((sum, item) => sum + item.monthlyKwh, 0);
  const totalMonthlyCost = calculateUnitsCost(totalMonthlyKwh, tariff, true);
  const totalYearlyKwh = totalMonthlyKwh * 12;
  const totalYearlyCost = totalMonthlyCost * 12;
  const totalMonthlyCo2Kg = totalMonthlyKwh * tariff.carbonEmissionFactor;
  const averageDailyKwh = totalMonthlyKwh / 30;

  // Compute percentage shares
  if (totalMonthlyKwh > 0) {
    breakdown.forEach((item) => {
      item.percentageOfTotal = round((item.monthlyKwh / totalMonthlyKwh) * 100, 1);
    });
  }

  // Sort descending by monthly consumption
  breakdown.sort((a, b) => b.monthlyKwh - a.monthlyKwh);

  const highestConsumer = breakdown.length > 0 && breakdown[0].monthlyKwh > 0 ? breakdown[0] : undefined;

  return {
    totalMonthlyKwh: round(totalMonthlyKwh, 2),
    totalMonthlyCost: round(totalMonthlyCost, 2),
    totalYearlyKwh: round(totalYearlyKwh, 1),
    totalYearlyCost: round(totalYearlyCost, 2),
    totalMonthlyCo2Kg: round(totalMonthlyCo2Kg, 2),
    applianceBreakdown: breakdown,
    highestConsumer,
    averageDailyKwh: round(averageDailyKwh, 2),
  };
}

export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
